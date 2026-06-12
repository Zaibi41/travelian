import { useEffect, useMemo, useState } from "react";
import { Hourglass, RefreshCw, Plane, Ticket, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listBookings, cancelBooking, expireBooking, type BookingRecord } from "@/lib/booking-store";
import { Link } from "react-router-dom";

const HOLD_DEFAULT_HOURS = 24;

function holdExpiry(record: BookingRecord) {
  if (record.holdExpiresAt) return new Date(record.holdExpiresAt).getTime();
  return new Date(record.createdAt).getTime() + HOLD_DEFAULT_HOURS * 60 * 60 * 1000;
}

function formatCountdown(ms: number) {
  if (ms <= 0) return "Expired";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600).toString().padStart(2, "0");
  const m = Math.floor((total % 3600) / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export default function HoldBookingsPage() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [now, setNow] = useState(Date.now());

  const load = () => setBookings(listBookings().filter(b => b.status === "held"));

  useEffect(() => {
    load();
    const onUpdate = () => load();
    window.addEventListener("travelian:bookings:updated", onUpdate);
    return () => window.removeEventListener("travelian:bookings:updated", onUpdate);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const rows = useMemo(() => bookings.map(b => {
    const expiry = holdExpiry(b);
    const remaining = expiry - now;
    return { record: b, expiry, remaining };
  }), [bookings, now]);

  // Auto-expire client-side
  useEffect(() => {
    rows.forEach(({ record, remaining }) => {
      if (remaining <= 0 && record.status === "held") {
        expireBooking(record.id);
        toast.warning(`Hold expired for ${record.pnr}`);
      }
    });
  }, [rows]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Hold Bookings</h1>
          <p className="text-sm text-muted-foreground">Active hold queue. Issue tickets before the countdown expires or release the seat.</p>
        </div>
        <Button variant="outline" onClick={load} className="gap-2"><RefreshCw className="h-4 w-4" /> Refresh</Button>
      </div>

      {rows.length === 0 ? (
        <Card className="shadow-card border-0"><CardContent className="p-6">
          <EmptyState
            icon={Hourglass}
            title="No active holds"
            description="Hold bookings created from the booking flow appear here with a live countdown until expiry."
          />
        </CardContent></Card>
      ) : (
        <Card className="shadow-card border-0"><CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PNR</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Route / Item</TableHead>
                <TableHead>Passenger</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Expires in</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ record, remaining }) => {
                const lead = record.travelers[0];
                const route = record.flight ? `${record.flight.from} -> ${record.flight.to}` : record.type;
                const urgent = remaining > 0 && remaining < 60 * 60 * 1000;
                return (
                  <TableRow key={record.id}>
                    <TableCell className="font-mono font-semibold">{record.pnr}</TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize gap-1"><Plane className="h-3 w-3" /> {record.type}</Badge></TableCell>
                    <TableCell className="text-sm">{route}</TableCell>
                    <TableCell className="text-sm">{lead ? `${lead.firstName} ${lead.lastName}` : "-"}</TableCell>
                    <TableCell className="text-sm font-semibold">{record.pricing.currency} {record.pricing.total.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={remaining <= 0 ? "destructive" : urgent ? "destructive" : "outline"} className="font-mono">
                        {formatCountdown(remaining)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link to={`/admin/flight-bookings?tab=all`}>
                          <Button size="sm" variant="default" className="gap-1"><Ticket className="h-3.5 w-3.5" /> Issue now</Button>
                        </Link>
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => { cancelBooking(record.id); toast.success(`Hold cancelled (${record.pnr})`); }}>
                          <X className="h-3.5 w-3.5" /> Cancel
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent></Card>
      )}
    </div>
  );
}
