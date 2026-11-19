import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plane, Download, X, Search, Calendar, MapPin } from "lucide-react";
import { listBookings, cancelBooking, deleteBooking, updateBooking, type BookingRecord } from "@/lib/booking-store";
import { confirmPayFastReturn, getPublicBooking, isPayFastReturn, type PublicBooking } from "@/lib/public-booking";
import { downloadETicket } from "@/lib/eticket-pdf";
import { toast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { CopyPnr } from "@/components/CopyPnr";
import { useSiteSwitches } from "@/lib/site-switches";

function statusClass(status: BookingRecord["status"]) {
  if (status === "confirmed" || status === "ticket_issued" || status === "payment_received") return "bg-success/10 text-success border-0";
  if (status === "held" || status === "pending_payment" || status === "requested") return "bg-warning/10 text-warning border-0";
  return "bg-destructive/10 text-destructive border-0";
}

// Gateway booking state → this page's statuses.
function fromGateway(view: PublicBooking): Partial<BookingRecord> {
  const status: BookingRecord["status"] = view.status === "requested" ? "requested"
    : view.status === "issued" ? "ticket_issued"
    : view.status === "confirmed" ? "confirmed"
    : view.status === "expired" ? "expired"
    : view.status === "released" ? "cancelled"
    : view.payment_status === "paid" ? "payment_received" : "held";
  return {
    status,
    paymentStatus: view.payment_status === "paid" ? "paid" : "unpaid",
    ticketStatus: view.status === "issued" ? "issued" : "not_issued",
    holdExpiresAt: view.hold_expires_at,
  };
}

/** After PayFast: let the gateway verify what PayFast sent back, then refresh every gateway booking's status. */
async function syncGatewayBookings() {
  const params = new URLSearchParams(window.location.search);
  if (isPayFastReturn(params)) {
    try {
      const { result } = await confirmPayFastReturn(Object.fromEntries(params.entries()));
      if (result === "paid" || result === "already_paid") toast({ title: "Payment received", description: "Thank you. Travelian will issue your tickets next." });
      else if (result === "failed" || result === "already_failed") toast({ title: "Payment not completed", description: "No payment was taken. You can try again before the hold time ends.", variant: "destructive" });
      else toast({ title: "Payment being checked", description: "We couldn't confirm the payment yet. Travelian will check it and update your booking." });
    } catch {
      toast({ title: "Payment being checked", description: "We couldn't confirm the payment yet. Travelian will check it and update your booking." });
    }
    window.history.replaceState(null, "", window.location.pathname);
  }
  for (const booking of listBookings().filter((item) => item.gateway)) {
    try {
      const view = await getPublicBooking(booking.gateway!.reference, booking.gateway!.token);
      updateBooking(booking.id, fromGateway(view));
    } catch {
      // keep the last known status
    }
  }
}

function statusLabel(status: BookingRecord["status"]) {
  return status.replace(/_/g, " ");
}

export default function MyBookingsPage() {
  const { umrah } = useSiteSwitches(); // D39: Umrah wording only when Umrah is switched on
  const [bookings, setBookings] = useState<BookingRecord[]>([]);

  const refresh = () => setBookings(listBookings());

  useEffect(() => {
    refresh();
    void syncGatewayBookings();
    const handler = () => refresh();
    window.addEventListener("travelian:bookings:updated", handler);
    return () => window.removeEventListener("travelian:bookings:updated", handler);
  }, []);

  const handleCancel = (id: string) => {
    cancelBooking(id);
    toast({ title: "Booking cancelled", description: "Refund (if applicable) will be processed within 5-7 business days." });
  };

  const handleDelete = (id: string) => {
    deleteBooking(id);
    toast({ title: "Booking removed" });
  };

  return (
    <div className="bg-muted/20 min-h-screen">
      <SEO title="My Bookings - Travelian" description={`View, manage and download your Travelian flight${umrah ? ", hotel and Umrah" : " and hotel"} bookings.`} />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">My Bookings</h1>
            <p className="text-sm text-muted-foreground">Booked on another device? <Link to="/find-booking" className="text-primary underline-offset-2 hover:underline">Find my booking</Link> with your reference and email or phone.</p>
            <p className="text-sm text-muted-foreground mt-1">Manage your trips, download e-tickets, and track upcoming travel.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Booked on another device or browser: find it with the reference and email or phone (no login). */}
            <Link to="/find-booking"><Button variant="outline" className="rounded-xl gap-2">Find a booking</Button></Link>
            <Link to="/"><Button variant="outline" className="rounded-xl gap-2"><Search className="h-4 w-4" /> New Search</Button></Link>
          </div>
        </div>

        {bookings.length === 0 ? (
          <Card className="shadow-card border-0">
            <CardContent className="py-16 text-center">
              <div className="h-16 w-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
                <Plane className="h-7 w-7 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold mb-1">No bookings yet</h2>
              <p className="text-sm text-muted-foreground mb-5">Your confirmed bookings will appear here.</p>
              <Link to="/"><Button className="gradient-primary text-primary-foreground rounded-xl">Search Flights</Button></Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {bookings.map(b => (
              <Card key={b.id} className="shadow-card border-0 overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center">
                        <Plane className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">
                            {b.flight ? `${b.flight.from} → ${b.flight.to}` : b.type.toUpperCase()}
                          </h3>
                          <Badge className={statusClass(b.status)}>
                            {statusLabel(b.status)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 font-mono">PNR: {b.pnr} <CopyPnr pnr={b.pnr} className="h-5 w-5" /> · {b.id}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">{b.pricing.currency} {b.pricing.total.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{new Date(b.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {b.flight && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Flight</p>
                        <p className="font-medium">{b.flight.airline} · {b.flight.flightNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Date</p>
                        <p className="font-medium">{b.flight.date}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Route</p>
                        <p className="font-medium">{b.flight.fromCode} → {b.flight.toCode}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Passenger</p>
                        <p className="font-medium truncate">{b.travelers[0]?.firstName} {b.travelers[0]?.lastName}{b.seat ? ` · ${b.seat}` : ""}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mt-4">
                    {(!b.gateway || b.status === "ticket_issued") && (
                      <Button size="sm" variant="outline" className="rounded-lg gap-1.5" onClick={() => downloadETicket(b)}>
                        <Download className="h-3.5 w-3.5" /> E-Ticket
                      </Button>
                    )}
                    {!b.gateway && (b.status === "confirmed" || b.status === "held" || b.status === "pending_payment") && (
                      <Button size="sm" variant="outline" className="rounded-lg gap-1.5 text-destructive hover:text-destructive" onClick={() => handleCancel(b.id)}>
                        <X className="h-3.5 w-3.5" /> Cancel
                      </Button>
                    )}
                    {b.status === "cancelled" && (
                      <Button size="sm" variant="ghost" className="rounded-lg text-muted-foreground" onClick={() => handleDelete(b.id)}>
                        Remove
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
