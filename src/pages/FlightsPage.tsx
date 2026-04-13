import { useState } from "react";
import { useAdmin } from "@/contexts/AdminStore";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Search, Plus, Pencil, Trash2, Plane, Eye, AlertTriangle, Send,
  BarChart3, ArrowRight, Ticket,
} from "lucide-react";
import { Flight, Booking, BookingStatus } from "@/data/mock";

export default function FlightsPage() {
  const { currentRole } = useRole();
  const {
    flights, flightSearchLogs, bookings, tickets,
    addFlight, updateFlight, deleteFlight,
    updateBookingStatus, issueTicketForBooking,
  } = useAdmin();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Flight | null>(null);
  const [form, setForm] = useState({ airline: '', flightNumber: '', origin: '', destination: '', departureTime: '', arrivalTime: '', price: 0, seats: 0, status: 'scheduled' as Flight['status'], class: 'economy' as Flight['class'] });
  const [tab, setTab] = useState('inventory');
  const [bookingDetailOpen, setBookingDetailOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const canEdit = currentRole === 'super_admin' || currentRole === 'admin';
  const filtered = flights.filter(f => f.airline.toLowerCase().includes(search.toLowerCase()) || f.flightNumber.toLowerCase().includes(search.toLowerCase()) || f.destination.toLowerCase().includes(search.toLowerCase()));

  const openAdd = () => { setEditing(null); setForm({ airline: '', flightNumber: '', origin: '', destination: '', departureTime: '', arrivalTime: '', price: 0, seats: 0, status: 'scheduled', class: 'economy' }); setDialogOpen(true); };
  const openEdit = (f: Flight) => { setEditing(f); setForm(f); setDialogOpen(true); };

  const handleSave = () => {
    if (!form.airline || !form.flightNumber) { toast.error("Airline and flight number required"); return; }
    if (editing) {
      updateFlight(editing.flightId, form);
      toast.success("Flight updated");
    } else {
      addFlight({ ...form, flightId: `f${Date.now()}` });
      toast.success("Flight added");
    }
    setDialogOpen(false);
  };

  const flightBookings = bookings.filter(b => b.packageName.toLowerCase().includes('flight') || tickets.some(t => t.bookingId === b.bookingId));

  const openBookingDetail = (b: Booking) => { setSelectedBooking(b); setBookingDetailOpen(true); };

  const handleStatusChange = (bookingId: string, status: BookingStatus) => {
    updateBookingStatus(bookingId, status);
    toast.success(`Booking status updated to ${status}`);
  };

  const handleIssueTicket = (bookingId: string) => {
    issueTicketForBooking(bookingId);
    toast.success("Ticket issued successfully!");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Flight Management</h1>
          <p className="text-sm text-muted-foreground">Manage flights, search monitoring, and booking lifecycle</p>
        </div>
        {canEdit && <Button onClick={openAdd} className="gradient-primary text-primary-foreground gap-2"><Plus className="h-4 w-4" /> Add Flight</Button>}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="inventory" className="gap-1"><Plane className="h-3 w-3" /> Inventory</TabsTrigger>
          <TabsTrigger value="searches" className="gap-1"><Search className="h-3 w-3" /> Search Monitoring</TabsTrigger>
          <TabsTrigger value="bookings" className="gap-1"><BarChart3 className="h-3 w-3" /> Booking Lifecycle</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search flights..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>

          <Card className="shadow-card">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground bg-muted/50">
                      <th className="p-3 font-medium">Flight</th>
                      <th className="p-3 font-medium">Airline</th>
                      <th className="p-3 font-medium">Route</th>
                      <th className="p-3 font-medium">Departure</th>
                      <th className="p-3 font-medium">Class</th>
                      <th className="p-3 font-medium">Price</th>
                      <th className="p-3 font-medium">Seats</th>
                      <th className="p-3 font-medium">Status</th>
                      {canEdit && <th className="p-3 font-medium">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(f => (
                      <tr key={f.flightId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-mono text-xs font-bold">{f.flightNumber}</td>
                        <td className="p-3"><div className="flex items-center gap-2"><Plane className="h-3 w-3 text-primary" />{f.airline}</div></td>
                        <td className="p-3 text-xs">{f.origin} → {f.destination}</td>
                        <td className="p-3 text-xs text-muted-foreground">{f.departureTime}</td>
                        <td className="p-3"><span className="text-xs capitalize px-2 py-0.5 rounded bg-accent text-accent-foreground">{f.class}</span></td>
                        <td className="p-3 font-bold text-primary">${f.price}</td>
                        <td className="p-3 text-muted-foreground">{f.seats}</td>
                        <td className="p-3"><StatusBadge status={f.status} /></td>
                        {canEdit && (
                          <td className="p-3">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openEdit(f)}><Pencil className="h-3 w-3" /></Button>
                              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { deleteFlight(f.flightId); toast.success("Flight deleted"); }}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No flights found</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="searches" className="space-y-4">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base font-display">Flight Search Monitoring</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {flightSearchLogs.map(log => (
                  <div key={log.id} className={`flex items-center justify-between p-3 rounded-lg border ${log.status === 'not_found' ? 'border-warning/30 bg-warning/5' : ''}`}>
                    <div className="flex items-center gap-3">
                      {log.status === 'not_found' ? (
                        <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center">
                          <AlertTriangle className="h-4 w-4 text-warning" />
                        </div>
                      ) : (
                        <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center">
                          <Plane className="h-4 w-4 text-success" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{log.route}</p>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">{log.date}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">By: {log.userName} · {log.timestamp}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={log.status === 'not_found' ? 'destructive' : 'secondary'} className="text-xs">
                        {log.resultsCount} results
                      </Badge>
                      {log.status === 'not_found' && canEdit && (
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" className="text-xs" onClick={openAdd}>
                            <Plus className="h-3 w-3 mr-1" /> Create Offer
                          </Button>
                          <Button variant="outline" size="sm" className="text-xs">
                            <Send className="h-3 w-3 mr-1" /> Contact
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings" className="space-y-4">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base font-display">Booking Lifecycle</CardTitle></CardHeader>
            <CardContent>
              {/* Status flow indicator */}
              <div className="flex items-center justify-center gap-2 mb-6 p-3 bg-muted/30 rounded-lg">
                {['Search', 'Select', 'Booking', 'Payment', 'Ticketed'].map((step, i) => (
                  <div key={step} className="flex items-center gap-2">
                    <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{step}</div>
                    {i < 4 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground bg-muted/50">
                      <th className="p-3 font-medium">Booking</th>
                      <th className="p-3 font-medium">Customer</th>
                      <th className="p-3 font-medium">Package</th>
                      <th className="p-3 font-medium">Amount</th>
                      <th className="p-3 font-medium">Status</th>
                      <th className="p-3 font-medium">Ticket</th>
                      <th className="p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map(b => {
                      const bookingTickets = tickets.filter(t => t.bookingId === b.bookingId);
                      const hasTicket = bookingTickets.length > 0;
                      return (
                        <tr key={b.bookingId} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="p-3 font-mono text-xs font-bold">{b.bookingId}</td>
                          <td className="p-3">{b.customerName}</td>
                          <td className="p-3">{b.packageName}</td>
                          <td className="p-3 font-medium">${b.totalAmount.toLocaleString()}</td>
                          <td className="p-3"><StatusBadge status={b.status} /></td>
                          <td className="p-3">
                            {hasTicket ? (
                              <Badge variant="secondary" className="gap-1 text-xs text-success">
                                <Ticket className="h-3 w-3" /> {bookingTickets[0].ticketNumber}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">No ticket</span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openBookingDetail(b)}><Eye className="h-3 w-3" /></Button>
                              {b.status === 'pending' && canEdit && (
                                <>
                                  <Button variant="outline" size="sm" className="text-xs text-success" onClick={() => handleStatusChange(b.bookingId, 'confirmed')}>Confirm</Button>
                                  <Button variant="outline" size="sm" className="text-xs text-destructive" onClick={() => handleStatusChange(b.bookingId, 'cancelled')}>Cancel</Button>
                                </>
                              )}
                              {b.status === 'confirmed' && !hasTicket && canEdit && (
                                <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => handleIssueTicket(b.bookingId)}>
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Flight Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-display">{editing ? 'Edit Flight' : 'Add Flight'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Airline *</Label><Input value={form.airline} onChange={e => setForm(p => ({ ...p, airline: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Flight Number *</Label><Input value={form.flightNumber} onChange={e => setForm(p => ({ ...p, flightNumber: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Origin</Label><Input value={form.origin} onChange={e => setForm(p => ({ ...p, origin: e.target.value }))} placeholder="e.g. Lahore (LHE)" /></div>
              <div className="space-y-2"><Label>Destination</Label><Input value={form.destination} onChange={e => setForm(p => ({ ...p, destination: e.target.value }))} placeholder="e.g. Jeddah (JED)" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Departure</Label><Input value={form.departureTime} onChange={e => setForm(p => ({ ...p, departureTime: e.target.value }))} placeholder="YYYY-MM-DD HH:mm" /></div>
              <div className="space-y-2"><Label>Arrival</Label><Input value={form.arrivalTime} onChange={e => setForm(p => ({ ...p, arrivalTime: e.target.value }))} placeholder="YYYY-MM-DD HH:mm" /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Price ($)</Label><Input type="number" value={form.price || ''} onChange={e => setForm(p => ({ ...p, price: Number(e.target.value) }))} /></div>
              <div className="space-y-2"><Label>Seats</Label><Input type="number" value={form.seats || ''} onChange={e => setForm(p => ({ ...p, seats: Number(e.target.value) }))} /></div>
              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={form.class} onValueChange={v => setForm(p => ({ ...p, class: v as Flight['class'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="economy">Economy</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="first">First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as Flight['status'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="delayed">Delayed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} className="flex-1 gradient-primary text-primary-foreground">{editing ? 'Update' : 'Add Flight'}</Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Detail Dialog */}
      <Dialog open={bookingDetailOpen} onOpenChange={setBookingDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-display">Booking Detail</DialogTitle></DialogHeader>
          {selectedBooking && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-muted-foreground text-xs">Booking ID</p><p className="font-mono font-bold">{selectedBooking.bookingId}</p></div>
                <div><p className="text-muted-foreground text-xs">Status</p><StatusBadge status={selectedBooking.status} /></div>
                <div><p className="text-muted-foreground text-xs">Customer</p><p className="font-medium">{selectedBooking.customerName}</p></div>
                <div><p className="text-muted-foreground text-xs">Email</p><p className="font-medium">{selectedBooking.customerEmail}</p></div>
                <div><p className="text-muted-foreground text-xs">Package</p><p className="font-medium">{selectedBooking.packageName}</p></div>
                <div><p className="text-muted-foreground text-xs">Amount</p><p className="font-bold text-primary">${selectedBooking.totalAmount.toLocaleString()}</p></div>
                <div><p className="text-muted-foreground text-xs">Payment</p><p className="font-medium capitalize">{selectedBooking.paymentType}</p></div>
                <div><p className="text-muted-foreground text-xs">Departure</p><p className="font-medium">{selectedBooking.departureDate}</p></div>
              </div>
              {/* Ticket info */}
              {tickets.filter(t => t.bookingId === selectedBooking.bookingId).map(t => (
                <div key={t.ticketId} className="p-3 rounded-lg bg-success/5 border border-success/20">
                  <p className="text-xs font-semibold text-success mb-1">E-Ticket Issued</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Ticket:</span> <span className="font-mono font-bold">{t.ticketNumber}</span></div>
                    <div><span className="text-muted-foreground">Seat:</span> <span className="font-bold">{t.seatNumber}</span></div>
                    <div><span className="text-muted-foreground">Route:</span> {t.origin} → {t.destination}</div>
                    <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={t.status} /></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
