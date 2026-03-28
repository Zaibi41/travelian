import { useState } from "react";
import { mockFlights, Flight } from "@/data/mock";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, Search, Pencil, Trash2, Plane } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "sonner";

export default function FlightsPage() {
  const { currentRole } = useRole();
  const [flights, setFlights] = useState(mockFlights);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Flight | null>(null);
  const [form, setForm] = useState({ airline: '', flightNumber: '', origin: '', destination: '', departureTime: '', arrivalTime: '', price: 0, seats: 0, status: 'scheduled' as Flight['status'], class: 'economy' as Flight['class'] });

  const canEdit = currentRole === 'super_admin' || currentRole === 'admin';
  const filtered = flights.filter(f => f.airline.toLowerCase().includes(search.toLowerCase()) || f.flightNumber.toLowerCase().includes(search.toLowerCase()) || f.destination.toLowerCase().includes(search.toLowerCase()));

  const openAdd = () => { setEditing(null); setForm({ airline: '', flightNumber: '', origin: '', destination: '', departureTime: '', arrivalTime: '', price: 0, seats: 0, status: 'scheduled', class: 'economy' }); setDialogOpen(true); };
  const openEdit = (f: Flight) => { setEditing(f); setForm(f); setDialogOpen(true); };

  const handleSave = () => {
    if (!form.airline || !form.flightNumber) { toast.error("Airline and flight number required"); return; }
    if (editing) {
      setFlights(prev => prev.map(f => f.flightId === editing.flightId ? { ...f, ...form } : f));
      toast.success("Flight updated");
    } else {
      setFlights(prev => [...prev, { ...form, flightId: `f${Date.now()}` }]);
      toast.success("Flight added");
    }
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Flight Management</h1>
          <p className="text-sm text-muted-foreground">Manage flight inventory and schedules</p>
        </div>
        {canEdit && <Button onClick={openAdd} className="gradient-primary text-primary-foreground gap-2"><Plus className="h-4 w-4" /> Add Flight</Button>}
      </div>

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
                    <td className="p-3">
                      <div className="flex items-center gap-2"><Plane className="h-3 w-3 text-primary" />{f.airline}</div>
                    </td>
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
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { setFlights(prev => prev.filter(x => x.flightId !== f.flightId)); toast.success("Flight deleted"); }}><Trash2 className="h-3 w-3" /></Button>
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
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} className="flex-1 gradient-primary text-primary-foreground">{editing ? 'Update' : 'Add Flight'}</Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
