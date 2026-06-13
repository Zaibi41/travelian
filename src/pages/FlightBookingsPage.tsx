import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarCheck, Clock3, Download, Eye, Plane, RefreshCw, RotateCcw, Ticket, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { listServerBookings, updateServerBooking } from "@/lib/booking-api";
import type { BookingRecord } from "@/lib/booking-store";

const tabs = [
  { id: "all", label: "All" },
  { id: "held", label: "Held" },
  { id: "issued", label: "Issued" },
  { id: "refund", label: "Refund / Cancel" },
  { id: "failed", label: "Expired / Failed" },
] as const;

type TabId = typeof tabs[number]["id"];

function customerName(booking: BookingRecord) {
  const firstTraveler = booking.travelers?.[0];
  return [firstTraveler?.title, firstTraveler?.firstName, firstTraveler?.lastName].filter(Boolean).join(" ") || "Customer";
}

function statusClass(status: string) {
  if (status === "held" || status === "pending_payment") return "bg-amber-500/10 text-amber-700 border-0";
  if (status === "payment_received" || status === "confirmed" || status === "ticket_issued") return "bg-emerald-500/10 text-emerald-700 border-0";
  if (status === "cancelled" || status === "expired") return "bg-destructive/10 text-destructive border-0";
  return "bg-muted text-muted-foreground border-0";
}

function statusLabel(booking: BookingRecord) {
  if (booking.ticketStatus === "issued") return "Ticket Issued";
  return booking.status.replace(/_/g, " ");
}

function amountLabel(booking: BookingRecord) {
  const currency = booking.pricing?.currency || "PKR";
  const total = Number(booking.pricing?.total || 0);
  return `${currency} ${Math.round(total).toLocaleString()}`;
}

function timeLimitLabel(booking: BookingRecord) {
  if (!booking.holdExpiresAt) return amountLabel(booking);
  const expiresAt = new Date(booking.holdExpiresAt);
  const ms = expiresAt.getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m left`;
}

function matchesTab(booking: BookingRecord, tab: TabId) {
  if (tab === "all") return true;
  if (tab === "held") return booking.status === "held" || booking.status === "pending_payment";
  if (tab === "issued") return booking.status === "ticket_issued" || booking.ticketStatus === "issued";
  if (tab === "refund") return booking.status === "cancelled";
  if (tab === "failed") return booking.status === "expired" || booking.paymentStatus === "pending";
  return true;
}

export default function FlightBookingsPage() {
  const [params, setParams] = useSearchParams();
  const tabParam = params.get("tab") as TabId | null;
  const activeTab = tabs.some((tab) => tab.id === tabParam) ? tabParam! : "all";
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<BookingRecord | null>(null);
  const [remarks, setRemarks] = useState("");
  const [savingAction, setSavingAction] = useState("");

  const loadBookings = async () => {
    setLoading(true);
    setError("");
    try {
      const records = await listServerBookings();
      setBookings(records.filter((booking) => booking.type === "flight"));
    } catch (loadError) {
      setBookings([]);
      setError(loadError instanceof Error ? loadError.message : "Unable to load flight bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBookings();
  }, []);

  useEffect(() => {
    if (!tabParam || !tabs.some((tab) => tab.id === tabParam)) {
      setParams({ tab: "all" }, { replace: true });
    }
  }, [setParams, tabParam]);

  const counts = useMemo(() => {
    const next: Record<TabId, number> = { all: bookings.length, held: 0, issued: 0, refund: 0, failed: 0 };
    bookings.forEach((booking) => {
      tabs.forEach((tab) => {
        if (tab.id !== "all" && matchesTab(booking, tab.id)) next[tab.id] += 1;
      });
    });
    return next;
  }, [bookings]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return bookings
      .filter((booking) => matchesTab(booking, activeTab))
      .filter((booking) => !term || [
        booking.id,
        booking.pnr,
        booking.flight?.from,
        booking.flight?.to,
        booking.flight?.flightNumber,
        booking.flight?.airline,
        booking.status,
        booking.contact?.phone,
        booking.contact?.email,
        customerName(booking),
      ].filter(Boolean).some((value) => String(value).toLowerCase().includes(term)))
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [activeTab, bookings, search]);

  const selectedFlight = selected?.flight;

  const openBooking = (booking: BookingRecord) => {
    setSelected(booking);
    setRemarks((booking as BookingRecord & { remarks?: string }).remarks || "");
  };

  const updateBooking = async (changes: Partial<BookingRecord> & { remarks?: string }, successMessage: string) => {
    if (!selected) return;
    const next = { ...selected, ...changes } as BookingRecord & { remarks?: string };
    setSelected(next);
    setBookings(current => current.map(item => item.id === selected.id ? next : item));
    setSavingAction(successMessage);
    try {
      const updated = await updateServerBooking(selected.id, changes);
      setSelected({ ...updated, remarks: changes.remarks ?? (updated as BookingRecord & { remarks?: string }).remarks } as BookingRecord);
      setBookings(current => current.map(item => item.id === selected.id ? updated : item));
      toast.success(successMessage);
    } catch (actionError) {
      console.error(actionError);
      toast.error("Saved locally, but the server update is not available yet");
    } finally {
      setSavingAction("");
    }
  };

  const markPaymentReceived = () => updateBooking({ status: "payment_received", paymentStatus: "paid", remarks }, "Payment marked as received");
  const issueTicket = () => {
    if (!selected) return;
    if (selected.paymentStatus !== "paid" && selected.status !== "payment_received" && selected.status !== "confirmed") {
      toast.error("Payment or wallet balance is required before ticket issue.");
      return;
    }
    void updateBooking({ status: "ticket_issued", ticketStatus: "issued", remarks }, "Ticket marked as issued");
  };
  const refundBooking = () => updateBooking({ status: "cancelled", remarks }, "Refund / cancellation status updated");
  const cancelBooking = () => updateBooking({ status: "cancelled", remarks }, "Booking cancelled");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Flight Bookings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage flight PNR holds, issued tickets, invoices, refunds, cancellations, and failed/expired records.</p>
        </div>
        <Button variant="outline" className="gap-2 rounded-xl" onClick={loadBookings} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto rounded-2xl border bg-card p-2 shadow-card">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setParams({ tab: tab.id })}
            className={`inline-flex min-w-max items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
              activeTab === tab.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {tab.label}
            <Badge variant={activeTab === tab.id ? "secondary" : "outline"} className="h-5 px-1.5 text-[10px]">{counts[tab.id]}</Badge>
          </button>
        ))}
      </div>

      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="relative max-w-xl">
            <Plane className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search passenger, PNR, route, phone, ticket, or status" className="h-11 rounded-xl pl-9" />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card className="shadow-card"><CardContent className="p-8 text-center text-sm text-muted-foreground">Loading flight bookings...</CardContent></Card>
      ) : error ? (
        <EmptyState icon={CalendarCheck} title="Flight bookings are unavailable" description={error} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={CalendarCheck} title="No flight bookings found" description="Flight holds, ticketed bookings, refunds and expired records will appear here after booking records are saved." />
      ) : (
        <Card className="shadow-card">
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="p-4 text-left">Passenger</th>
                  <th className="p-4 text-left">PNR</th>
                  <th className="p-4 text-left">Route</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-left">{activeTab === "held" ? "Expiry" : "Amount / Expiry"}</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((booking) => (
                  <tr key={booking.id} className="border-b last:border-0">
                    <td className="p-4">
                      <p className="font-semibold text-foreground">{customerName(booking)}</p>
                      <p className="text-xs text-muted-foreground">{booking.contact?.phone || "-"}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-mono font-semibold">{booking.pnr || "-"}</p>
                      <p className="text-xs text-muted-foreground">{booking.id}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold">{booking.flight?.from || "-"} → {booking.flight?.to || "-"}</p>
                      <p className="text-xs text-muted-foreground">{booking.flight?.airline || ""} {booking.flight?.flightNumber || ""} {booking.flight?.date ? `- ${booking.flight.date}` : ""}</p>
                    </td>
                    <td className="p-4">
                      <Badge className={`capitalize ${statusClass(booking.status)}`}>{statusLabel(booking)}</Badge>
                      <p className="mt-1 text-xs capitalize text-muted-foreground">{booking.paymentStatus || "unpaid"} / {booking.ticketStatus || "not issued"}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-bold">{timeLimitLabel(booking)}</p>
                      {booking.holdExpiresAt && <p className="mt-1 text-xs text-muted-foreground">Hold until {new Date(booking.holdExpiresAt).toLocaleString()}</p>}
                    </td>
                    <td className="p-4 text-right">
                      <Button size="sm" className="gap-1 rounded-lg" onClick={() => openBooking(booking)}>
                        <Eye className="h-3.5 w-3.5" /> Manage
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Flight booking detail</DialogTitle>
            <DialogDescription>
              Review the booking, save remarks, mark payment received, issue tickets, or update cancellation status.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border bg-muted/30 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Passenger</p>
                  <p className="mt-1 font-bold">{customerName(selected)}</p>
                  <p className="text-sm text-muted-foreground">{selected.contact?.phone || "-"}</p>
                  {selected.contact?.email && <p className="text-sm text-muted-foreground">{selected.contact.email}</p>}
                </div>
                <div className="rounded-2xl border bg-muted/30 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">PNR / Status</p>
                  <p className="mt-1 font-mono text-lg font-bold">{selected.pnr || "-"}</p>
                  <Badge className={`mt-2 capitalize ${statusClass(selected.status)}`}>{statusLabel(selected)}</Badge>
                </div>
              </div>
              <div className="rounded-2xl border p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Flight</p>
                <p className="mt-1 text-lg font-bold">{selectedFlight?.from || "-"} → {selectedFlight?.to || "-"}</p>
                <p className="text-sm text-muted-foreground">{selectedFlight?.airline || ""} {selectedFlight?.flightNumber || ""} {selectedFlight?.date ? `- ${selectedFlight.date}` : ""}</p>
                <p className="text-sm text-muted-foreground">{selectedFlight?.departTime || "-"} → {selectedFlight?.arriveTime || "-"} {selectedFlight?.duration ? `- ${selectedFlight.duration}` : ""}</p>
              </div>
              <div className="rounded-2xl border p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Payment</p>
                <div className="mt-2 flex items-center justify-between gap-4">
                  <span className="text-sm capitalize text-muted-foreground">{selected.paymentStatus || "unpaid"} via {selected.paymentMethod || "manual"}</span>
                  <span className="text-xl font-bold text-primary">{amountLabel(selected)}</span>
                </div>
              </div>
              <div className="space-y-2 rounded-2xl border p-4">
                <Label htmlFor="booking-remarks" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Remarks</Label>
                <Textarea id="booking-remarks" value={remarks} onChange={event => setRemarks(event.target.value)} rows={3} placeholder="Internal remarks for ticketing, refund, payment, or customer follow-up" />
                <Button variant="outline" size="sm" className="rounded-xl" disabled={!!savingAction} onClick={() => void updateBooking({ remarks }, "Remarks saved")}>Save Remarks</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(selected.status === "held" || selected.status === "pending_payment" || selected.status === "payment_received") && (
                  <Button className="gap-1 rounded-xl" disabled={!!savingAction} onClick={issueTicket}><Ticket className="h-4 w-4" /> Issue Ticket</Button>
                )}
                {(selected.ticketStatus === "issued" || selected.status === "ticket_issued") && (
                  <>
                    <Button variant="outline" className="gap-1 rounded-xl"><Download className="h-4 w-4" /> Download Ticket</Button>
                    <Button variant="outline" className="gap-1 rounded-xl"><Download className="h-4 w-4" /> Invoice</Button>
                  </>
                )}
                <Button variant="outline" className="gap-1 rounded-xl" disabled={!!savingAction} onClick={() => void markPaymentReceived()}><Clock3 className="h-4 w-4" /> Mark Payment Received</Button>
                <Button variant="outline" className="gap-1 rounded-xl" disabled={!!savingAction} onClick={() => void refundBooking()}><RotateCcw className="h-4 w-4" /> Refund</Button>
                <Button variant="outline" className="gap-1 rounded-xl text-destructive" disabled={!!savingAction} onClick={() => void cancelBooking()}><XCircle className="h-4 w-4" /> Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
