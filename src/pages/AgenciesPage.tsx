import { useState } from "react";
import { mockAgencies, Agency, AgencyStatus } from "@/data/mock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { Building2, Search, Plus, Wallet, Users, MoreHorizontal, CheckCircle, XCircle, Ban, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "sonner";

const emptyAgency = {
  agencyName: '', email: '', phone: '', contactPerson: '', city: '',
  commissionRate: 10, status: 'pending' as AgencyStatus, address: '', licenseNo: '',
};

export default function AgenciesPage() {
  const { currentRole } = useRole();
  const [agencies, setAgencies] = useState(mockAgencies);
  const [search, setSearch] = useState("");
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);
  const [form, setForm] = useState(emptyAgency);

  const canManage = currentRole === 'super_admin' || currentRole === 'admin';

  const filtered = agencies.filter(a =>
    a.agencyName.toLowerCase().includes(search.toLowerCase()) ||
    a.city.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setEditingAgency(null); setForm(emptyAgency); setDialogOpen(true); };
  const openEdit = (agency: Agency) => {
    setEditingAgency(agency);
    setForm({
      agencyName: agency.agencyName, email: agency.email, phone: agency.phone,
      contactPerson: agency.contactPerson, city: agency.city, commissionRate: agency.commissionRate,
      status: agency.status, address: agency.address || '', licenseNo: agency.licenseNo || '',
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.agencyName || !form.email) { toast.error("Name and email are required"); return; }
    if (editingAgency) {
      setAgencies(prev => prev.map(a => a.agencyId === editingAgency.agencyId ? { ...a, ...form } : a));
      toast.success("Agency updated");
    } else {
      const newAgency: Agency = {
        ...form, agencyId: `a${Date.now()}`, walletBalance: 0,
        createdAt: new Date().toISOString().split('T')[0], totalBookings: 0,
      };
      setAgencies(prev => [...prev, newAgency]);
      toast.success("Agency created");
    }
    setDialogOpen(false);
  };

  const updateStatus = (agencyId: string, status: AgencyStatus) => {
    setAgencies(prev => prev.map(a => a.agencyId === agencyId ? { ...a, status } : a));
    toast.success(`Agency ${status}`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Agency Management</h1>
          <p className="text-sm text-muted-foreground">Manage travel agencies and B2B partners</p>
        </div>
        {canManage && (
          <Button onClick={openAdd} className="gradient-primary text-primary-foreground gap-2">
            <Plus className="h-4 w-4" /> Add Agency
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search agencies..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(agency => (
          <Card key={agency.agencyId} className="shadow-card hover:shadow-elevated transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-display">{agency.agencyName}</CardTitle>
                    <p className="text-xs text-muted-foreground">{agency.city}</p>
                  </div>
                </div>
                {canManage && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSelectedAgency(agency)}>View Details</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(agency)}>
                        <Pencil className="h-3 w-3 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {agency.status === 'pending' && (
                        <>
                          <DropdownMenuItem onClick={() => updateStatus(agency.agencyId, 'active')} className="text-success">
                            <CheckCircle className="h-3 w-3 mr-2" /> Approve
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateStatus(agency.agencyId, 'rejected')} className="text-destructive">
                            <XCircle className="h-3 w-3 mr-2" /> Reject
                          </DropdownMenuItem>
                        </>
                      )}
                      {agency.status === 'active' && (
                        <DropdownMenuItem onClick={() => updateStatus(agency.agencyId, 'suspended')} className="text-warning">
                          <Ban className="h-3 w-3 mr-2" /> Suspend
                        </DropdownMenuItem>
                      )}
                      {agency.status === 'suspended' && (
                        <DropdownMenuItem onClick={() => updateStatus(agency.agencyId, 'active')} className="text-success">
                          <CheckCircle className="h-3 w-3 mr-2" /> Reactivate
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <StatusBadge status={agency.status} />
                <span className="text-xs text-muted-foreground">Commission: {agency.commissionRate}%</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Wallet className="h-3 w-3" />
                  <span>${agency.walletBalance.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>{agency.totalBookings} bookings</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{agency.contactPerson} · {agency.email}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* View Details Dialog */}
      <Dialog open={!!selectedAgency} onOpenChange={() => setSelectedAgency(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{selectedAgency?.agencyName}</DialogTitle>
          </DialogHeader>
          {selectedAgency && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-muted-foreground text-xs">Status</p><StatusBadge status={selectedAgency.status} /></div>
                <div><p className="text-muted-foreground text-xs">Commission</p><p className="font-medium">{selectedAgency.commissionRate}%</p></div>
                <div><p className="text-muted-foreground text-xs">Wallet Balance</p><p className="font-medium">${selectedAgency.walletBalance.toLocaleString()}</p></div>
                <div><p className="text-muted-foreground text-xs">Total Bookings</p><p className="font-medium">{selectedAgency.totalBookings}</p></div>
                <div><p className="text-muted-foreground text-xs">Contact</p><p className="font-medium">{selectedAgency.contactPerson}</p></div>
                <div><p className="text-muted-foreground text-xs">City</p><p className="font-medium">{selectedAgency.city}</p></div>
              </div>
              <div><p className="text-muted-foreground text-xs">Email</p><p className="font-medium">{selectedAgency.email}</p></div>
              <div><p className="text-muted-foreground text-xs">Phone</p><p className="font-medium">{selectedAgency.phone}</p></div>
              {selectedAgency.address && <div><p className="text-muted-foreground text-xs">Address</p><p className="font-medium">{selectedAgency.address}</p></div>}
              {selectedAgency.licenseNo && <div><p className="text-muted-foreground text-xs">License No.</p><p className="font-medium">{selectedAgency.licenseNo}</p></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{editingAgency ? 'Edit Agency' : 'Add New Agency'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Agency Name *</Label>
                <Input value={form.agencyName} onChange={e => setForm(p => ({ ...p, agencyName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input value={form.contactPerson} onChange={e => setForm(p => ({ ...p, contactPerson: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Commission Rate (%)</Label>
                <Input type="number" value={form.commissionRate} onChange={e => setForm(p => ({ ...p, commissionRate: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>License No.</Label>
                <Input value={form.licenseNo} onChange={e => setForm(p => ({ ...p, licenseNo: e.target.value }))} />
              </div>
            </div>
            {editingAgency && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as AgencyStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} className="flex-1 gradient-primary text-primary-foreground">
                {editingAgency ? 'Update Agency' : 'Create Agency'}
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
