import { useState } from "react";
import { mockTickets, TravelTicket } from "@/data/mock";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { Search, Plus, Pencil, Ticket, Plane, Bus, Train } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "sonner";

const typeIcons = { flight: Plane, bus: Bus, train: Train };

export default function TicketsPage() {
  const { currentRole } = useRole();
  const [tickets, setTickets] = useState(mockTickets);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TravelTicket | null>(null);
  const [form, setForm] = useState({ bookingId: '', passengerName: '', type: 'flight' as TravelTicket['type'], origin: '', destination: '', departureDate: '', seatNumber: '', status: 'pending' as TravelTicket['status'], price: 0, ticketNumber: '' });

  const canEdit = currentRole !== 'agency_staff';
  const filtered = tickets.filter(t => t.passengerName.toLowerCase().includes(search.toLowerCase()) || t.ticketNumber.toLowerCase().includes(search.toLowerCase()));

  const openAdd = () => { setEditing(null); setForm({ bookingId: '', passengerName: '', type: 'flight', origin: '', destination: '', departureDate: '', seatNumber: '', status: 'pending', price: 0, ticketNumber: '' }); setDialogOpen(true); };
  const openEdit = (t: TravelTicket) => { setEditing(t); setForm(t); setDialogOpen(true); };

  const handleSave = () => {
    if (!form.passengerName || !form.ticketNumber) { toast.error("Passenger name and ticket number required"); return; }
    if (editing) {
      setTickets(prev => prev.map(t => t.ticketId === editing.ticketId ? { ...t, ...form } : t));
      toast.success("Ticket updated");
    } else {
      setTickets(prev => [...prev, { ...form, ticketId: `tk${Date.now()}` }]);
      toast.success("Ticket issued");
    }
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Travel Tickets</h1>
          <p className="text-sm text-muted-foreground">Issue and manage travel tickets for bookings</p>
        </div>
        {canEdit && <Button onClick={openAdd} className="gradient-primary text-primary-foreground gap-2"><Plus className="h-4 w-4" /> Issue Ticket</Button>}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search tickets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground bg-muted/50">
                  <th className="p-3 font-medium">Ticket #</th>
                  <th className="p-3 font-medium">Passenger</th>
                  <th className="p-3 font-medium">Type</th>
                  <th className="p-3 font-medium">Route</th>
                  <th className="p-3 font-medium">Date</th>
                  <th className="p-3 font-medium">Seat</th>
                  <th className="p-3 font-medium">Price</th>
                  <th className="p-3 font-medium">Status</th>
                  {canEdit && <th className="p-3 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => {
                  const Icon = typeIcons[t.type];
                  return (
                    <tr key={t.ticketId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono text-xs font-bold">{t.ticketNumber}</td>
                      <td className="p-3 font-medium">{t.passengerName}</td>
                      <td className="p-3"><Badge variant="outline" className="gap-1 text-xs capitalize"><Icon className="h-3 w-3" />{t.type}</Badge></td>
                      <td className="p-3 text-xs">{t.origin} → {t.destination}</td>
                      <td className="p-3 text-xs text-muted-foreground">{t.departureDate}</td>
                      <td className="p-3 font-mono text-xs">{t.seatNumber}</td>
                      <td className="p-3 font-bold text-primary">${t.price}</td>
                      <td className="p-3"><StatusBadge status={t.status} /></td>
                      {canEdit && (
                        <td className="p-3">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(t)}><Pencil className="h-3 w-3" /></Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No tickets found</p>}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-display">{editing ? 'Edit Ticket' : 'Issue New Ticket'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Passenger Name *</Label><Input value={form.passengerName} onChange={e => setForm(p => ({ ...p, passengerName: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Ticket Number *</Label><Input value={form.ticketNumber} onChange={e => setForm(p => ({ ...p, ticketNumber: e.target.value }))} className="font-mono" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Booking ID</Label><Input value={form.bookingId} onChange={e => setForm(p => ({ ...p, bookingId: e.target.value }))} /></div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v as TravelTicket['type'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flight">Flight</SelectItem>
                    <SelectItem value="bus">Bus</SelectItem>
                    <SelectItem value="train">Train</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Origin</Label><Input value={form.origin} onChange={e => setForm(p => ({ ...p, origin: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Destination</Label><Input value={form.destination} onChange={e => setForm(p => ({ ...p, destination: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.departureDate} onChange={e => setForm(p => ({ ...p, departureDate: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Seat</Label><Input value={form.seatNumber} onChange={e => setForm(p => ({ ...p, seatNumber: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Price ($)</Label><Input type="number" value={form.price || ''} onChange={e => setForm(p => ({ ...p, price: Number(e.target.value) }))} /></div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as TravelTicket['status'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="issued">Issued</SelectItem>
                  <SelectItem value="used">Used</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} className="flex-1 gradient-primary text-primary-foreground">{editing ? 'Update' : 'Issue Ticket'}</Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
