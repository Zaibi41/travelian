import { useState } from "react";
import { mockPackages, UmrahPackage } from "@/data/mock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, MapPin, Clock, Hotel, Pencil, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "sonner";

const emptyPackage: Omit<UmrahPackage, 'packageId'> = {
  name: '', description: '', basePrice: 0, duration: '', hotel: '', city: '',
  status: 'active', includes: [], category: 'umrah',
};

export default function PackagesPage() {
  const { currentRole } = useRole();
  const [packages, setPackages] = useState(mockPackages);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<UmrahPackage | null>(null);
  const [form, setForm] = useState(emptyPackage);
  const [includeInput, setIncludeInput] = useState('');

  const isAgency = currentRole === 'agency_owner' || currentRole === 'agency_staff';
  const canEdit = currentRole === 'super_admin' || currentRole === 'admin';

  const openAdd = () => { setEditingPkg(null); setForm(emptyPackage); setIncludeInput(''); setDialogOpen(true); };
  const openEdit = (pkg: UmrahPackage) => { setEditingPkg(pkg); setForm(pkg); setIncludeInput(''); setDialogOpen(true); };

  const handleSave = () => {
    if (!form.name || !form.basePrice) { toast.error("Name and price are required"); return; }
    if (editingPkg) {
      setPackages(prev => prev.map(p => p.packageId === editingPkg.packageId ? { ...p, ...form } : p));
      toast.success("Package updated successfully");
    } else {
      setPackages(prev => [...prev, { ...form, packageId: `p${Date.now()}`, category: 'umrah' } as UmrahPackage]);
      toast.success("Package created successfully");
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    setPackages(prev => prev.filter(p => p.packageId !== id));
    toast.success("Package deleted");
  };

  const addInclude = () => {
    if (includeInput.trim()) {
      setForm(prev => ({ ...prev, includes: [...prev.includes, includeInput.trim()] }));
      setIncludeInput('');
    }
  };

  const removeInclude = (idx: number) => {
    setForm(prev => ({ ...prev, includes: prev.includes.filter((_, i) => i !== idx) }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Umrah Packages</h1>
          <p className="text-sm text-muted-foreground">
            {isAgency ? 'Browse available packages and create bookings' : 'Manage travel packages and pricing'}
          </p>
        </div>
        {canEdit && (
          <Button onClick={openAdd} className="gradient-primary text-primary-foreground gap-2">
            <Plus className="h-4 w-4" /> Add Package
          </Button>
        )}
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
                {pkg.includes.map(inc => (
                  <Badge key={inc} variant="secondary" className="text-[10px]">{inc}</Badge>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Base Price</p>
                  <p className="text-lg font-bold font-display text-primary">${pkg.basePrice.toLocaleString()}</p>
                </div>
                <div className="flex gap-1">
                  {isAgency && (
                    <Button variant="default" size="sm" className="gradient-primary text-primary-foreground">Book Now</Button>
                  )}
                  {canEdit && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => openEdit(pkg)}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleDelete(pkg.packageId)}><Trash2 className="h-3 w-3" /></Button>
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
          <DialogHeader>
            <DialogTitle className="font-display">{editingPkg ? 'Edit Package' : 'Add New Package'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Package Name *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Economy Umrah" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Package details..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Base Price ($) *</Label>
                <Input type="number" value={form.basePrice || ''} onChange={e => setForm(p => ({ ...p, basePrice: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <Input value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} placeholder="e.g. 7 nights" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hotel</Label>
                <Input value={form.hotel} onChange={e => setForm(p => ({ ...p, hotel: e.target.value }))} placeholder="Hotel name" />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="e.g. Makkah & Madinah" />
              </div>
            </div>
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
            <div className="space-y-2">
              <Label>Includes</Label>
              <div className="flex gap-2">
                <Input value={includeInput} onChange={e => setIncludeInput(e.target.value)} placeholder="e.g. Flights" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addInclude())} />
                <Button type="button" variant="outline" onClick={addInclude}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {form.includes.map((inc, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    {inc}
                    <button onClick={() => removeInclude(i)}><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} className="flex-1 gradient-primary text-primary-foreground">
                {editingPkg ? 'Update Package' : 'Create Package'}
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
