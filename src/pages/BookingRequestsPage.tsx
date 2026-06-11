import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Loader2, RefreshCw, Search, ArrowUpDown, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { BookingRequest, BookingRequestStatus, BookingRequestType } from "@/data/models";
import { listBookingRequests, updateBookingRequest } from "@/lib/booking-request-api";
import { whatsappUrlFor } from "@/lib/site-config";

const statusOptions: { value: BookingRequestStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting_for_documents", label: "Waiting for Documents" },
  { value: "payment_pending", label: "Payment Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled_lost", label: "Cancelled / Lost" },
];

const typeOptions: { value: BookingRequestType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "umrah", label: "Umrah" },
  { value: "visa", label: "Visa" },
  { value: "study_visa", label: "Study Visa" },
  { value: "visit_visa", label: "Visit Visa" },
  { value: "tour", label: "Tour" },
  { value: "group", label: "Group" },
  { value: "manual_flight", label: "Manual Flight" },
  { value: "whatsapp_inquiry", label: "WhatsApp Inquiry" },
  { value: "package", label: "Package" },
  { value: "service", label: "Service" },
];

const STAFF_PICKER = ["Asad", "Maira", "Fahad", "Bilal"];

function statusLabel(value: BookingRequestStatus) {
  return statusOptions.find(option => option.value === value)?.label || value;
}

function ageDays(createdAt: string) {
  const ms = Date.now() - new Date(createdAt).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function AgingBadge({ createdAt }: { createdAt: string }) {
  const days = ageDays(createdAt);
  if (days >= 5) return <Badge variant="destructive">{days}d old</Badge>;
  if (days >= 2) return <Badge className="bg-amber-500 text-white hover:bg-amber-500/90">{days}d old</Badge>;
  return <Badge variant="secondary">{days}d</Badge>;
}

export default function BookingRequestsPage() {
  const [items, setItems] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<BookingRequestType | "all">("all");
  const [sortDesc, setSortDesc] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [editing, setEditing] = useState<BookingRequest | null>(null);

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

  useEffect(() => { void load(); }, []);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: items.length };
    items.forEach(item => { counts[item.type] = (counts[item.type] || 0) + 1; });
    return counts;
  }, [items]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items
      .filter(item => typeFilter === "all" || item.type === typeFilter)
      .filter(item => !term || [
        item.requestId, item.type, item.customerName, item.phone, item.email, item.packageName, item.status,
      ].filter(Boolean).join(" ").toLowerCase().includes(term))
      .sort((a, b) => sortDesc
        ? b.createdAt.localeCompare(a.createdAt)
        : a.createdAt.localeCompare(b.createdAt));
  }, [items, search, typeFilter, sortDesc]);

  const change = (requestId: string, changes: Partial<BookingRequest>) => {
    setItems(current => current.map(item => item.requestId === requestId ? { ...item, ...changes } : item));
    if (editing && editing.requestId === requestId) setEditing({ ...editing, ...changes });
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
      setEditing(null);
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
          <p className="text-sm text-muted-foreground">Assisted Umrah, tour, visa, study visa and service requests from the public site.</p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {typeOptions.map(opt => {
          const active = typeFilter === opt.value;
          const count = typeCounts[opt.value] || 0;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTypeFilter(opt.value)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted"
              }`}
            >
              {opt.label}
              <Badge variant={active ? "secondary" : "outline"} className="h-5 px-1.5 text-[10px]">{count}</Badge>
            </button>
          );
        })}
      </div>

      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search request, customer, phone, package, or status" className="pl-9" />
      </div>

      {loading ? (
        <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="No booking requests" description="Requests submitted from the public website will appear here." />
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden md:block shadow-card border-0"><CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button type="button" onClick={() => setSortDesc(s => !s)} className="inline-flex items-center gap-1 font-semibold hover:text-foreground">
                      Created <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(item => (
                  <TableRow key={item.requestId}>
                    <TableCell className="text-xs">
                      <div>{new Date(item.createdAt).toLocaleString()}</div>
                      <div className="mt-1"><AgingBadge createdAt={item.createdAt} /></div>
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize">{item.type.replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell className="text-sm">
                      <div className="font-semibold">{item.customerName}</div>
                      {item.email && <div className="text-xs text-muted-foreground">{item.email}</div>}
                    </TableCell>
                    <TableCell className="text-sm">{item.phone}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate" title={item.packageName || ""}>{item.packageName || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{statusLabel(item.status)}</Badge></TableCell>
                    <TableCell className="text-sm">{item.assignedStaff || <span className="text-muted-foreground">Unassigned</span>}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <a href={whatsappUrlFor(item.phone, `Hello ${item.customerName}, regarding your request ${item.requestId}`)} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="outline" className="gap-1 bg-[#25D366]/10 border-[#25D366]/30 text-[#128C7E] hover:bg-[#25D366]/20">
                            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                          </Button>
                        </a>
                        <Button size="sm" variant="default" onClick={() => setEditing(item)}>Manage</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>

          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {filtered.map(item => (
              <Card key={item.requestId} className="shadow-card"><CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary" className="capitalize">{item.type.replace(/_/g, " ")}</Badge>
                  <AgingBadge createdAt={item.createdAt} />
                </div>
                <div>
                  <div className="font-semibold">{item.customerName}</div>
                  <div className="text-xs text-muted-foreground">{item.phone}{item.email ? ` · ${item.email}` : ""}</div>
                </div>
                <div className="text-sm">{item.packageName || "Assisted service request"}</div>
                <div className="flex items-center justify-between text-xs">
                  <span>{new Date(item.createdAt).toLocaleString()}</span>
                  <Badge variant="outline">{statusLabel(item.status)}</Badge>
                </div>
                <div className="flex gap-2 pt-2">
                  <a href={whatsappUrlFor(item.phone, `Hello ${item.customerName}, regarding your request ${item.requestId}`)} target="_blank" rel="noreferrer" className="flex-1">
                    <Button size="sm" variant="outline" className="w-full gap-1 bg-[#25D366]/10 border-[#25D366]/30 text-[#128C7E]"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</Button>
                  </a>
                  <Button size="sm" className="flex-1" onClick={() => setEditing(item)}>Manage</Button>
                </div>
              </CardContent></Card>
            ))}
          </div>
        </>
      )}

      {editing && (
        <Card className="shadow-elevated border-primary/30">
          <CardContent className="grid gap-4 p-5 md:grid-cols-2">
            <div className="md:col-span-2 flex items-start justify-between">
              <div>
                <h2 className="font-bold">Manage request</h2>
                <p className="text-xs text-muted-foreground font-mono">{editing.requestId}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Close</Button>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editing.status} onValueChange={value => change(editing.requestId, { status: value as BookingRequestStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{statusOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assigned staff</Label>
              <Select value={editing.assignedStaff || "unassigned"} onValueChange={value => change(editing.requestId, { assignedStaff: value === "unassigned" ? "" : value })}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {STAFF_PICKER.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Notes</Label>
              <Textarea value={editing.notes || ""} onChange={event => change(editing.requestId, { notes: event.target.value })} rows={3} placeholder="Add processing notes" />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button onClick={() => void save(editing)} disabled={savingId === editing.requestId}>
                {savingId === editing.requestId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
