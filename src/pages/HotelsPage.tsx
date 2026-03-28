import { useState } from "react";
import { mockHotels, Hotel } from "@/data/mock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, Star, Search, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "sonner";

export default function HotelsPage() {
  const { currentRole } = useRole();
  const [hotels, setHotels] = useState(mockHotels);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Hotel | null>(null);
  const [form, setForm] = useState({ name: '', city: '', country: '', starRating: 4, pricePerNight: 0, rooms: 0, amenities: [] as string[], status: 'active' as const });
  const [amenityInput, setAmenityInput] = useState('');

  const canEdit = currentRole === 'super_admin' || currentRole === 'admin';
  const filtered = hotels.filter(h => h.name.toLowerCase().includes(search.toLowerCase()) || h.city.toLowerCase().includes(search.toLowerCase()));

  const openAdd = () => { setEditing(null); setForm({ name: '', city: '', country: '', starRating: 4, pricePerNight: 0, rooms: 0, amenities: [], status: 'active' }); setDialogOpen(true); };
  const openEdit = (h: Hotel) => { setEditing(h); setForm(h); setDialogOpen(true); };

  const handleSave = () => {
    if (!form.name) { toast.error("Hotel name is required"); return; }
    if (editing) {
      setHotels(prev => prev.map(h => h.hotelId === editing.hotelId ? { ...h, ...form } : h));
      toast.success("Hotel updated");
    } else {
      setHotels(prev => [...prev, { ...form, hotelId: `h${Date.now()}` }]);
      toast.success("Hotel added");
    }
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Hotel Management</h1>
          <p className="text-sm text-muted-foreground">Manage hotel listings and availability</p>
        </div>
        {canEdit && <Button onClick={openAdd} className="gradient-primary text-primary-foreground gap-2"><Plus className="h-4 w-4" /> Add Hotel</Button>}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search hotels..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(hotel => (
          <Card key={hotel.hotelId} className="shadow-card hover:shadow-elevated transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base font-display">{hotel.name}</CardTitle>
                <StatusBadge status={hotel.status} />
              </div>
              <div className="flex items-center gap-1 mt-1">
                {Array.from({ length: hotel.starRating }).map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-warning text-warning" />
                ))}
                <span className="text-xs text-muted-foreground ml-1">{hotel.city}, {hotel.country}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{hotel.rooms} rooms</span>
                <span className="font-bold text-primary font-display">${hotel.pricePerNight}/night</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {hotel.amenities.slice(0, 4).map(a => <Badge key={a} variant="secondary" className="text-[10px]">{a}</Badge>)}
                {hotel.amenities.length > 4 && <Badge variant="secondary" className="text-[10px]">+{hotel.amenities.length - 4}</Badge>}
              </div>
              {canEdit && (
                <div className="flex gap-1 pt-2 border-t">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(hotel)}><Pencil className="h-3 w-3 mr-1" /> Edit</Button>
                  <Button variant="outline" size="sm" className="text-destructive" onClick={() => { setHotels(prev => prev.filter(h => h.hotelId !== hotel.hotelId)); toast.success("Hotel deleted"); }}><Trash2 className="h-3 w-3" /></Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-display">{editing ? 'Edit Hotel' : 'Add Hotel'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div className="space-y-2"><Label>City</Label><Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Country</Label><Input value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Stars</Label><Input type="number" min={1} max={5} value={form.starRating} onChange={e => setForm(p => ({ ...p, starRating: Number(e.target.value) }))} /></div>
              <div className="space-y-2"><Label>Price/Night ($)</Label><Input type="number" value={form.pricePerNight || ''} onChange={e => setForm(p => ({ ...p, pricePerNight: Number(e.target.value) }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Total Rooms</Label><Input type="number" value={form.rooms || ''} onChange={e => setForm(p => ({ ...p, rooms: Number(e.target.value) }))} /></div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as 'active' | 'inactive' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Amenities</Label>
              <div className="flex gap-2">
                <Input value={amenityInput} onChange={e => setAmenityInput(e.target.value)} placeholder="e.g. WiFi" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (amenityInput.trim()) { setForm(p => ({ ...p, amenities: [...p.amenities, amenityInput.trim()] })); setAmenityInput(''); } } }} />
                <Button variant="outline" type="button" onClick={() => { if (amenityInput.trim()) { setForm(p => ({ ...p, amenities: [...p.amenities, amenityInput.trim()] })); setAmenityInput(''); } }}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-1">{form.amenities.map((a, i) => <Badge key={i} variant="secondary" className="gap-1">{a}<button onClick={() => setForm(p => ({ ...p, amenities: p.amenities.filter((_, idx) => idx !== i) }))} className="ml-1">×</button></Badge>)}</div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} className="flex-1 gradient-primary text-primary-foreground">{editing ? 'Update' : 'Add Hotel'}</Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
