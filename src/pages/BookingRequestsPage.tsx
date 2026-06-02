import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Loader2, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { BookingRequest, BookingRequestStatus } from "@/data/models";
import { listBookingRequests, updateBookingRequest } from "@/lib/booking-request-api";

const statusOptions: { value: BookingRequestStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting_for_documents", label: "Waiting for Documents" },
  { value: "payment_pending", label: "Payment Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled_lost", label: "Cancelled / Lost" },
];

function statusLabel(value: BookingRequestStatus) {
  return statusOptions.find(option => option.value === value)?.label || value;
}

export default function BookingRequestsPage() {
  const [items, setItems] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      setItems(await listBookingRequests());
    } catch (error) {
      console.error(error);
      toast.error("Booking requests could not be loaded");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter(item => [
      item.requestId,
      item.type,
      item.customerName,
      item.phone,
      item.email,
      item.packageName,
      item.status,
    ].filter(Boolean).join(" ").toLowerCase().includes(term));
  }, [items, search]);

  const change = (requestId: string, changes: Partial<BookingRequest>) => {
    setItems(current => current.map(item => item.requestId === requestId ? { ...item, ...changes } : item));
  };

  const save = async (item: BookingRequest) => {
    setSavingId(item.requestId);
    try {
      const updated = await updateBookingRequest(item.requestId, {
        status: item.status,
        assignedStaff: item.assignedStaff,
        notes: item.notes,
      });
      setItems(current => current.map(entry => entry.requestId === updated.requestId ? updated : entry));
      toast.success("Booking request updated");
    } catch (error) {
      console.error(error);
      toast.error("Booking request could not be updated");
      await load();
    } finally {
      setSavingId("");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Booking Requests</h1>
          <p className="text-sm text-muted-foreground">Process assisted Umrah, tour, visa, and service requests saved from the public site.</p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
      </div>

      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search request, customer, phone, package, or status" className="pl-9" />
      </div>

      {loading ? (
        <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="No booking requests yet" description="Umrah, tour, visa, and assisted service requests submitted from the public website will appear here." />
      ) : (
        <div className="grid gap-4">
          {filtered.map(item => (
            <Card key={item.requestId} className="shadow-card">
              <CardContent className="grid gap-5 p-5 xl:grid-cols-[1fr_240px_1fr_auto] xl:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="capitalize">{item.type.replace(/_/g, " ")}</Badge>
                    <Badge variant={item.notificationStatus === "failed" ? "destructive" : "secondary"}>{item.notificationStatus || "pending"} notification</Badge>
                  </div>
                  <h2 className="mt-3 font-bold">{item.packageName || "Assisted service request"}</h2>
                  <p className="mt-1 text-sm">{item.customerName} | {item.phone}{item.email ? ` | ${item.email}` : ""}</p>
                  <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{item.requestId}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>
                  {item.notificationError && <p className="mt-2 text-xs text-destructive">{item.notificationError}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={item.status} onValueChange={value => change(item.requestId, { status: value as BookingRequestStatus })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{statusOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Current: {statusLabel(item.status)}</p>
                </div>
                <div className="grid gap-3">
                  <div className="space-y-2"><Label>Assigned staff</Label><Input value={item.assignedStaff || ""} onChange={event => change(item.requestId, { assignedStaff: event.target.value })} placeholder="Staff name or email" /></div>
                  <div className="space-y-2"><Label>Notes</Label><Textarea value={item.notes || ""} onChange={event => change(item.requestId, { notes: event.target.value })} rows={3} placeholder="Add processing notes" /></div>
                </div>
                <Button onClick={() => void save(item)} disabled={savingId === item.requestId}>{savingId === item.requestId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
