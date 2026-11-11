import { useState } from "react";
import { Coupon } from "@/data/models";
import { Card, CardContent } from "@/components/admin/ui/card";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/field";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, Search, Pencil, Trash2, Tag, Percent, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { Label } from "@/components/admin/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "sonner";

export default function CouponsPage() {
  const { currentRole } = useRole();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState({ code: '', description: '', discountType: 'percentage' as Coupon['discountType'], discountValue: 0, minOrder: 0, maxUses: 100, validFrom: '', validUntil: '', status: 'active' as Coupon['status'], applicableTo: 'all' as Coupon['applicableTo'] });

  const canEdit = currentRole === 'super_admin' || currentRole === 'admin';
  const filtered = coupons.filter(c => c.code.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase()));

  const openAdd = () => { setEditing(null); setForm({ code: '', description: '', discountType: 'percentage', discountValue: 0, minOrder: 0, maxUses: 100, validFrom: '', validUntil: '', status: 'active', applicableTo: 'all' }); setDialogOpen(true); };
  const openEdit = (c: Coupon) => { setEditing(c); setForm(c); setDialogOpen(true); };

  const handleSave = () => {
    if (!form.code) { toast.error("Coupon code is required"); return; }
    if (editing) {
      setCoupons(prev => prev.map(c => c.couponId === editing.couponId ? { ...c, ...form } : c));
      toast.success("Coupon updated");
    } else {
      setCoupons(prev => [...prev, { ...form, couponId: `c${Date.now()}`, usedCount: 0 }]);
      toast.success("Coupon created");
    }
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-page-title font-bold font-display">Coupons & Deals</h1>
          <p className="text-body text-muted-foreground">Manage promotional offers and discount codes</p>
        </div>
        {canEdit && <Button onClick={openAdd} className="gradient-primary text-primary-foreground gap-2"><Plus className="h-4 w-4" /> Create Coupon</Button>}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search coupons..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(coupon => (
          <Card key={coupon.couponId} className="shadow-card hover:shadow-elevated transition-shadow">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
                    <Tag className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-mono font-bold text-body">{coupon.code}</p>
                    <p className="text-helper text-muted-foreground">{coupon.description}</p>
                  </div>
                </div>
                <StatusBadge status={coupon.status} />
              </div>
              <div className="flex items-center gap-2">
                {coupon.discountType === 'percentage' ? <Percent className="h-4 w-4 text-primary" /> : <DollarSign className="h-4 w-4 text-primary" />}
                <span className="text-section font-bold font-display text-primary">
                  {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `$${coupon.discountValue}`} OFF
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-helper text-muted-foreground">
                  <span>Usage: {coupon.usedCount}/{coupon.maxUses}</span>
                  <span>{Math.round((coupon.usedCount / coupon.maxUses) * 100)}%</span>
                </div>
                <Progress value={(coupon.usedCount / coupon.maxUses) * 100} className="h-1.5" />
              </div>
              <div className="flex items-center justify-between text-helper text-muted-foreground">
                <span>{coupon.validFrom} - {coupon.validUntil}</span>
                <Badge variant="secondary" className="text-helper capitalize">{coupon.applicableTo}</Badge>
              </div>
              <p className="text-helper text-muted-foreground">Min order: ${coupon.minOrder}</p>
              {canEdit && (
                <div className="flex gap-1 pt-2 border-t">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(coupon)}><Pencil className="h-3 w-3 mr-1" /> Edit</Button>
                  <Button variant="outline" size="sm" className="text-destructive" onClick={() => { setCoupons(prev => prev.filter(c => c.couponId !== coupon.couponId)); toast.success("Coupon deleted"); }}><Trash2 className="h-3 w-3" /></Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-display">{editing ? 'Edit Coupon' : 'Create Coupon'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Code *</Label><Input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} className="font-mono" /></div>
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select value={form.discountType} onValueChange={v => setForm(p => ({ ...p, discountType: v as Coupon['discountType'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Value</Label><Input type="number" value={form.discountValue || ''} onChange={e => setForm(p => ({ ...p, discountValue: Number(e.target.value) }))} /></div>
              <div className="space-y-2"><Label>Min Order ($)</Label><Input type="number" value={form.minOrder || ''} onChange={e => setForm(p => ({ ...p, minOrder: Number(e.target.value) }))} /></div>
              <div className="space-y-2"><Label>Max Uses</Label><Input type="number" value={form.maxUses || ''} onChange={e => setForm(p => ({ ...p, maxUses: Number(e.target.value) }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Valid From</Label><Input type="date" value={form.validFrom} onChange={e => setForm(p => ({ ...p, validFrom: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Valid Until</Label><Input type="date" value={form.validUntil} onChange={e => setForm(p => ({ ...p, validUntil: e.target.value }))} /></div>
            </div>
            <div className="space-y-2">
              <Label>Applicable To</Label>
              <Select value={form.applicableTo} onValueChange={v => setForm(p => ({ ...p, applicableTo: v as Coupon['applicableTo'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Packages</SelectItem>
                  <SelectItem value="umrah">Umrah Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} className="flex-1 gradient-primary text-primary-foreground">{editing ? 'Update' : 'Create Coupon'}</Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
