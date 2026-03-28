import { useState } from "react";
import { mockTourPackages, UmrahPackage } from "@/data/mock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, MapPin, Clock, Hotel, Pencil, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "sonner";

export default function TourPackagesPage() {
  const { currentRole } = useRole();
  const [packages, setPackages] = useState(mockTourPackages);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UmrahPackage | null>(null);
  const [form, setForm] = useState<{ name: string; description: string; basePrice: number; duration: string; hotel: string; city: string; status: 'active' | 'inactive'; includes: string[] }>({ name: '', description: '', basePrice: 0, duration: '', hotel: '', city: '', status: 'active', includes: [] });
  const [incInput, setIncInput] = useState('');
  const isAgency = currentRole === 'agency_owner' || currentRole === 'agency_staff';
  const canEdit = currentRole === 'super_admin' || currentRole === 'admin';

  const openAdd = () => { setEditing(null); setForm({ name: '', description: '', basePrice: 0, duration: '', hotel: '', city: '', status: 'active' as 'active' | 'inactive', includes: [] }); setDialogOpen(true); };
  const openEdit = (pkg: UmrahPackage) => { setEditing(pkg); setForm(pkg); setDialogOpen(true); };

  const handleSave = () => {
    if (!form.name || !form.basePrice) { toast.error("Name and price required"); return; }
    if (editing) {
      setPackages(prev => prev.map(p => p.packageId === editing.packageId ? { ...p, ...form } : p));
      toast.success("Tour package updated");
    } else {
      setPackages(prev => [...prev, { ...form, packageId: `t${Date.now()}`, category: 'tour' } as UmrahPackage]);
      toast.success("Tour package created");
    }
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Tour Packages</h1>
          <p className="text-sm text-muted-foreground">{isAgency ? 'Browse tour packages' : 'Manage international tour packages'}</p>
        </div>
        {canEdit && <Button onClick={openAdd} className="gradient-primary text-primary-foreground gap-2"><Plus className="h-4 w-4" /> Add Tour</Button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {packages.map(pkg => (
          <Card key={pkg.packageId} className="shadow-card hover:shadow-elevated transition-shadow flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base font-display">{pkg.name}</CardTitle>
                <StatusBadge status={pkg.status} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{pkg.description}</p>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between gap-4">
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{pkg.city}</div>
                <div className="flex items-center gap-1.5"><Clock className="h-3 w-3" />{pkg.duration}</div>
                <div className="flex items-center gap-1.5"><Hotel className="h-3 w-3" />{pkg.hotel}</div>
              </div>
              <div className="flex flex-wrap gap-1">
                {pkg.includes.map(inc => <Badge key={inc} variant="secondary" className="text-[10px]">{inc}</Badge>)}
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Base Price</p>
                  <p className="text-lg font-bold font-display text-primary">${pkg.basePrice.toLocaleString()}</p>
                </div>
                <div className="flex gap-1">
                  {isAgency && <Button variant="default" size="sm" className="gradient-primary text-primary-foreground">Book Now</Button>}
                  {canEdit && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => openEdit(pkg)}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => { setPackages(p => p.filter(x => x.packageId !== pkg.packageId)); toast.success("Deleted"); }}><Trash2 className="h-3 w-3" /></Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">{editing ? 'Edit Tour' : 'Add Tour Package'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Price ($) *</Label><Input type="number" value={form.basePrice || ''} onChange={e => setForm(p => ({ ...p, basePrice: Number(e.target.value) }))} /></div>
              <div className="space-y-2"><Label>Duration</Label><Input value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Hotel</Label><Input value={form.hotel} onChange={e => setForm(p => ({ ...p, hotel: e.target.value }))} /></div>
              <div className="space-y-2"><Label>City/Destination</Label><Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} /></div>
            </div>
            <div className="space-y-2">
              <Label>Includes</Label>
              <div className="flex gap-2">
                <Input value={incInput} onChange={e => setIncInput(e.target.value)} placeholder="e.g. Flights" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (incInput.trim()) { setForm(p => ({ ...p, includes: [...p.includes, incInput.trim()] })); setIncInput(''); } } }} />
                <Button variant="outline" type="button" onClick={() => { if (incInput.trim()) { setForm(p => ({ ...p, includes: [...p.includes, incInput.trim()] })); setIncInput(''); } }}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-1">{form.includes.map((inc, i) => <Badge key={i} variant="secondary" className="gap-1">{inc}<button onClick={() => setForm(p => ({ ...p, includes: p.includes.filter((_, idx) => idx !== i) }))}><X className="h-3 w-3" /></button></Badge>)}</div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} className="flex-1 gradient-primary text-primary-foreground">{editing ? 'Update' : 'Create Tour'}</Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
