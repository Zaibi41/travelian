import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plane, Download, X, Search, Calendar, MapPin } from "lucide-react";
import { listBookings, cancelBooking, deleteBooking, type BookingRecord } from "@/lib/booking-store";
import { downloadETicket } from "@/lib/eticket-pdf";
import { toast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);

  const refresh = () => setBookings(listBookings());

  useEffect(() => {
    refresh();
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
      <SEO title="My Bookings - Travelian" description="View, manage and download your Travelian flight, hotel and Umrah bookings." />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">My Bookings</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your trips, download e-tickets, and track upcoming travel.</p>
          </div>
          <Link to="/"><Button variant="outline" className="rounded-xl gap-2"><Search className="h-4 w-4" /> New Search</Button></Link>
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
                          <Badge className={b.status === "confirmed" ? "bg-success/10 text-success border-0" : "bg-destructive/10 text-destructive border-0"}>
                            {b.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 font-mono">PNR: {b.pnr} · {b.id}</p>
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
                    <Button size="sm" variant="outline" className="rounded-lg gap-1.5" onClick={() => downloadETicket(b)}>
                      <Download className="h-3.5 w-3.5" /> E-Ticket
                    </Button>
                    {b.status === "confirmed" && (
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
