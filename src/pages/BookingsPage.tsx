import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, RefreshCw, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/EmptyState";
import { listServerBookings } from "@/lib/booking-api";
import type { BookingRecord } from "@/lib/booking-store";

function statusClass(status: string) {
  if (status === "held" || status === "pending_payment") return "bg-warning/10 text-warning border-0";
  if (status === "payment_received" || status === "confirmed" || status === "ticket_issued") return "bg-success/10 text-success border-0";
  if (status === "cancelled" || status === "expired") return "bg-destructive/10 text-destructive border-0";
  return "bg-muted text-muted-foreground border-0";
}

function customerName(booking: BookingRecord) {
  const firstTraveler = booking.travelers?.[0];
  return [firstTraveler?.title, firstTraveler?.firstName, firstTraveler?.lastName].filter(Boolean).join(" ") || "Customer";
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBookings = async () => {
    setLoading(true);
    setError("");
    try {
      setBookings(await listServerBookings());
    } catch (loadError) {
      setBookings([]);
      setError(loadError instanceof Error ? loadError.message : "Unable to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return bookings;
    return bookings.filter((booking) => [
      booking.id,
      booking.pnr,
      booking.status,
      booking.type,
      booking.flight?.airline,
      booking.flight?.flightNumber,
      booking.flight?.from,
      booking.flight?.to,
      customerName(booking),
      booking.contact?.email,
      booking.contact?.phone,
    ].filter(Boolean).some((value) => String(value).toLowerCase().includes(term)));
  }, [bookings, search]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Bookings</h1>
          <p className="text-sm text-muted-foreground">Flight holds, payment requests, and completed checkout bookings from Travelian DB.</p>
        </div>
        <Button variant="outline" className="gap-2 rounded-xl" onClick={loadBookings} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search booking, customer, route or PNR" className="pl-9" />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card className="shadow-card">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">Loading bookings...</CardContent>
        </Card>
      ) : error ? (
        <EmptyState icon={CalendarCheck} title="Bookings are unavailable" description={error} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title={bookings.length ? "No matching bookings" : "No bookings yet"}
          description={bookings.length ? "Try a different search term." : "Book Only and payment bookings will appear here after checkout records are saved."}
        />
      ) : (
        <Card className="shadow-card">
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="p-4 text-left">Booking</th>
                  <th className="p-4 text-left">Customer</th>
                  <th className="p-4 text-left">Service</th>
                  <th className="p-4 text-left">Payment</th>
                  <th className="p-4 text-left">Amount</th>
                  <th className="p-4 text-left">Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((booking) => (
                  <tr key={booking.id} className="border-b last:border-0">
                    <td className="p-4">
                      <p className="font-semibold text-foreground">{booking.id}</p>
                      <p className="text-xs text-muted-foreground">PNR {booking.pnr || "-"}</p>
                      <Badge className={`mt-2 capitalize ${statusClass(booking.status)}`}>{booking.status.replace(/_/g, " ")}</Badge>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-foreground">{customerName(booking)}</p>
                      <p className="text-xs text-muted-foreground">{booking.contact?.phone || "-"}</p>
                      {booking.contact?.email && <p className="text-xs text-muted-foreground">{booking.contact.email}</p>}
                    </td>
                    <td className="p-4">
                      <p className="font-medium capitalize text-foreground">{booking.type}</p>
                      {booking.flight ? (
                        <p className="text-xs text-muted-foreground">
                          {booking.flight.airline} {booking.flight.flightNumber} · {booking.flight.from} to {booking.flight.to} · {booking.flight.date}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Service request</p>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="font-medium capitalize text-foreground">{booking.paymentMethod}</p>
                      <p className="text-xs capitalize text-muted-foreground">{booking.paymentStatus || "unpaid"} · {booking.ticketStatus || "not issued"}</p>
                    </td>
                    <td className="p-4 font-semibold text-foreground">
                      {booking.pricing?.currency || "PKR"} {Math.round(booking.pricing?.total || 0).toLocaleString()}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {booking.createdAt ? new Date(booking.createdAt).toLocaleString() : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
