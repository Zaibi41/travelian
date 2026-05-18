import { useState } from "react";
import { useAdmin } from "@/contexts/AdminStore";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Plus, Filter, Eye, Pencil, Ticket, CreditCard, ArrowRight } from "lucide-react";
import { BookingStatus, Booking } from "@/data/mock";

export default function BookingsPage() {
  const { currentRole } = useRole();
  const { bookings, tickets, updateBookingStatus, issueTicketForBooking } = useAdmin();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const canEdit = currentRole === 'super_admin' || currentRole === 'admin';

  const filtered = bookings.filter(b => {
    const matchSearch = b.customerName.toLowerCase().includes(search.toLowerCase()) || b.bookingId.includes(search);
    const matchType = typeFilter === "all" || b.type === typeFilter;
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const handleStatusChange = (id: string, status: BookingStatus) => {
    updateBookingStatus(id, status);
    toast.success(`Booking ${status}`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Bookings</h1>
          <p className="text-sm text-muted-foreground">Track all B2C and B2B bookings with full lifecycle management</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search bookings..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="b2c">B2C</SelectItem>
            <SelectItem value="b2b">B2B</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground bg-muted/50">
                  <th className="p-3 font-medium">Booking ID</th>
                  <th className="p-3 font-medium">Customer</th>
                  <th className="p-3 font-medium">Package</th>
                  <th className="p-3 font-medium">Type</th>
                  <th className="p-3 font-medium">Amount</th>
                  <th className="p-3 font-medium">Payment</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Ticket</th>
                  <th className="p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => {
                  const bookingTickets = tickets.filter(t => t.bookingId === b.bookingId);
                  return (
                    <tr key={b.bookingId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono text-xs font-bold">{b.bookingId}</td>
                      <td className="p-3">
                        <p className="font-medium">{b.customerName}</p>
                        <p className="text-xs text-muted-foreground">{b.customerEmail}</p>
                      </td>
                      <td className="p-3">{b.packageName}</td>
                      <td className="p-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${b.type === 'b2b' ? 'bg-info/10 text-info' : 'bg-accent text-accent-foreground'}`}>{b.type.toUpperCase()}</span>
                      </td>
                      <td className="p-3 font-medium">${b.totalAmount.toLocaleString()}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <CreditCard className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs capitalize">{b.paymentType.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="p-3"><StatusBadge status={b.status} /></td>
                      <td className="p-3">
                        {bookingTickets.length > 0 ? (
                          <Badge variant="secondary" className="text-xs text-success gap-1"><Ticket className="h-3 w-3" /> Issued</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedBooking(b); setDetailOpen(true); }}><Eye className="h-3 w-3" /></Button>
                          {b.status === 'pending' && canEdit && (
                            <>
                              <Button variant="outline" size="sm" className="text-xs text-success" onClick={() => handleStatusChange(b.bookingId, 'confirmed')}>Confirm</Button>
                              <Button variant="outline" size="sm" className="text-xs text-destructive" onClick={() => handleStatusChange(b.bookingId, 'cancelled')}>Cancel</Button>
                            </>
                          )}
                          {b.status === 'confirmed' && bookingTickets.length === 0 && canEdit && (
                            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => { issueTicketForBooking(b.bookingId); toast.success("Ticket issued!"); }}>
                              <Ticket className="h-3 w-3" /> Issue Ticket
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No bookings found</p>}
          </div>
        </CardContent>
      </Card>

      {/* Booking Detail */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-display">Booking Details</DialogTitle></DialogHeader>
          {selectedBooking && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-muted-foreground text-xs">Booking ID</p><p className="font-mono font-bold">{selectedBooking.bookingId}</p></div>
                <div><p className="text-muted-foreground text-xs">Status</p><StatusBadge status={selectedBooking.status} /></div>
                <div><p className="text-muted-foreground text-xs">Customer</p><p className="font-medium">{selectedBooking.customerName}</p></div>
                <div><p className="text-muted-foreground text-xs">Email</p><p className="font-medium text-xs">{selectedBooking.customerEmail}</p></div>
                <div><p className="text-muted-foreground text-xs">Package</p><p className="font-medium">{selectedBooking.packageName}</p></div>
                <div><p className="text-muted-foreground text-xs">Amount</p><p className="font-bold text-primary">${selectedBooking.totalAmount.toLocaleString()}</p></div>
                <div><p className="text-muted-foreground text-xs">Payment</p><p className="capitalize">{selectedBooking.paymentType.replace('_', ' ')}</p></div>
                <div><p className="text-muted-foreground text-xs">Departure</p><p>{selectedBooking.departureDate}</p></div>
                <div><p className="text-muted-foreground text-xs">Travelers</p><p>{selectedBooking.travelers}</p></div>
                {selectedBooking.agencyName && <div><p className="text-muted-foreground text-xs">Agency</p><p>{selectedBooking.agencyName}</p></div>}
              </div>
              {tickets.filter(t => t.bookingId === selectedBooking.bookingId).map(t => (
                <div key={t.ticketId} className="p-3 rounded-lg bg-success/5 border border-success/20">
                  <p className="text-xs font-semibold text-success mb-1">E-Ticket</p>
                  <p className="font-mono text-xs">{t.ticketNumber} · Seat {t.seatNumber}</p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
