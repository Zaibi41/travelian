import { useState } from "react";
import { useAdmin, SecretKey } from "@/contexts/AdminStore";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PasswordInput } from "@/components/PasswordInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Shield, Plus, Pencil, Trash2, Key, Eye, EyeOff, Lock, AlertTriangle } from "lucide-react";

const categoryLabels: Record<string, { label: string; color: string }> = {
  flight_api: { label: 'Flight API', color: 'bg-info/10 text-info' },
  hotel_api: { label: 'Hotel API', color: 'bg-primary/10 text-primary' },
  payment: { label: 'Payment', color: 'bg-success/10 text-success' },
  sms: { label: 'SMS', color: 'bg-warning/10 text-warning' },
  email: { label: 'Email', color: 'bg-accent text-accent-foreground' },
  other: { label: 'Other', color: 'bg-muted text-muted-foreground' },
};

const envColors: Record<string, string> = {
  production: 'bg-destructive/10 text-destructive',
  staging: 'bg-warning/10 text-warning',
  development: 'bg-info/10 text-info',
};

export default function SecretManagerPage() {
  const { currentRole, currentUser } = useRole();
  const { secretKeys, addSecretKey, updateSecretKey, deleteSecretKey } = useAdmin();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SecretKey | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({
    name: '', category: 'other' as SecretKey['category'], value: '',
    environment: 'production' as SecretKey['environment'],
  });

  if (currentRole !== 'super_admin') {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-2">
          <Lock className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-bold font-display">Access Denied</h2>
          <p className="text-sm text-muted-foreground">Only Super Admins can access the Secret Manager</p>
        </div>
      </div>
    );
  }

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', category: 'other', value: '', environment: 'production' });
    setDialogOpen(true);
  };

  const openEdit = (sk: SecretKey) => {
    setEditing(sk);
    setForm({ name: sk.name, category: sk.category, value: '', environment: sk.environment });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name) { toast.error("Key name is required"); return; }
    if (editing) {
      updateSecretKey(editing.id, {
        name: form.name, category: form.category, environment: form.environment,
        ...(form.value ? { value: '************' + form.value.slice(-4) } : {}),
        lastUpdated: new Date().toISOString().split('T')[0],
      });
      toast.success("Secret key updated");
    } else {
      if (!form.value) { toast.error("Key value is required"); return; }
      addSecretKey({
        id: `sk${Date.now()}`, name: form.name, category: form.category,
        value: '************' + form.value.slice(-4), environment: form.environment,
        lastUpdated: new Date().toISOString().split('T')[0], createdBy: currentUser.name,
      });
      toast.success("Secret key added");
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteSecretKey(id);
    toast.success("Secret key deleted");
  };

  const toggleVisibility = (id: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Secret Manager</h1>
          <p className="text-sm text-muted-foreground">Manage API keys and integration credentials</p>
        </div>
        <Button onClick={openAdd} className="gradient-primary text-primary-foreground gap-2">
          <Plus className="h-4 w-4" /> Add Secret Key
        </Button>
      </div>

      <Card className="shadow-card border-warning/30">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Sensitive Information</p>
            <p className="text-xs text-muted-foreground">API keys and secrets are encrypted at rest. Only Super Admins can view and manage these credentials. Never share these keys publicly.</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {secretKeys.map(sk => {
          const cat = categoryLabels[sk.category];
          const envColor = envColors[sk.environment];
          return (
            <Card key={sk.id} className="shadow-card hover:shadow-elevated transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
                      <Key className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-mono font-bold text-sm">{sk.name}</p>
                        <Badge variant="outline" className={`text-[10px] ${cat.color}`}>{cat.label}</Badge>
                        <Badge variant="outline" className={`text-[10px] ${envColor}`}>{sk.environment}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs font-mono text-muted-foreground">
                          {visibleKeys.has(sk.id) ? sk.value : '****************'}
                        </p>
                        <button onClick={() => toggleVisibility(sk.id)} className="text-muted-foreground hover:text-foreground">
                          {visibleKeys.has(sk.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Updated: {sk.lastUpdated} | By: {sk.createdBy}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => openEdit(sk)}><Pencil className="h-3 w-3" /></Button>
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDelete(sk.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-display">{editing ? 'Update Secret Key' : 'Add Secret Key'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Key Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value.toUpperCase().replace(/\s/g, '_') }))} className="font-mono" placeholder="e.g. STRIPE_API_KEY" /></div>
            <div className="space-y-2"><Label>{editing ? 'New Value (leave blank to keep)' : 'Value *'}</Label><PasswordInput value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v as SecretKey['category'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flight_api">Flight API</SelectItem>
                    <SelectItem value="hotel_api">Hotel API</SelectItem>
                    <SelectItem value="payment">Payment</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Environment</Label>
                <Select value={form.environment} onValueChange={v => setForm(p => ({ ...p, environment: v as SecretKey['environment'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="staging">Staging</SelectItem>
                    <SelectItem value="development">Development</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} className="flex-1 gradient-primary text-primary-foreground">{editing ? 'Update' : 'Add Key'}</Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
