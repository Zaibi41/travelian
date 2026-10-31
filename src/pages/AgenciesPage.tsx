import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { ComponentType, ReactNode } from "react";
import { Agency, AgencyStatus } from "@/data/models";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { Building2, Search, Plus, Wallet, Users, MoreHorizontal, CheckCircle, XCircle, Ban, Pencil, Network, Mail, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useRole } from "@/contexts/RoleContext";
import { useAdmin } from "@/contexts/AdminStore";
import { toast } from "sonner";

type AgencyForm = {
  agencyName: string;
  email: string;
  phone: string;
  contactPerson: string;
  city: string;
  commissionRate: number;
  status: AgencyStatus;
  address: string;
  licenseNo: string;
  parentAgencyId: string;
  agencyType: "main" | "sub";
};

const emptyAgency: AgencyForm = {
  agencyName: "",
  email: "",
  phone: "",
  contactPerson: "",
  city: "",
  commissionRate: 10,
  status: "pending",
  address: "",
  licenseNo: "",
  parentAgencyId: "none",
  agencyType: "main",
};

export default function AgenciesPage() {
  const [searchParams] = useSearchParams();
  const { currentRole, currentUser } = useRole();
  const { agencies, users, addAgency, updateAgency } = useAdmin();
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);
  const [form, setForm] = useState<AgencyForm>(emptyAgency);

  const isSuperAdmin = currentRole === "super_admin";
  const isAdmin = currentRole === "admin";
  const isAgencyOwner = currentRole === "agency_owner";
  const canManageMain = isSuperAdmin || isAdmin;
  const canCreateSubAgency = canManageMain || isAgencyOwner;
  const visibleAgencies = useMemo(() => {
    if (isAgencyOwner && currentUser.agencyId) {
      return agencies.filter(a => a.agencyId === currentUser.agencyId || a.parentAgencyId === currentUser.agencyId);
    }
    return agencies;
  }, [agencies, currentUser.agencyId, isAgencyOwner]);

  const mainAgencies = agencies.filter(a => (a.agencyType || "main") === "main");
  const filtered = visibleAgencies.filter(a =>
    a.agencyName.toLowerCase().includes(search.toLowerCase()) ||
    a.city.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: visibleAgencies.length,
    active: visibleAgencies.filter(a => a.status === "active").length,
    sub: visibleAgencies.filter(a => a.agencyType === "sub").length,
    users: users.filter(u => visibleAgencies.some(a => a.agencyId === u.agencyId)).length,
  };

  const openAdd = (type: "main" | "sub" = canManageMain ? "main" : "sub") => {
    const parentAgencyId = isAgencyOwner && currentUser.agencyId ? currentUser.agencyId : "none";
    setEditingAgency(null);
    setForm({ ...emptyAgency, agencyType: type, parentAgencyId, status: type === "sub" ? "active" : "pending" });
    setDialogOpen(true);
  };

  const openEdit = (agency: Agency) => {
    setEditingAgency(agency);
    setForm({
      agencyName: agency.agencyName,
      email: agency.email,
      phone: agency.phone,
      contactPerson: agency.contactPerson,
      city: agency.city,
      commissionRate: agency.commissionRate,
      status: agency.status,
      address: agency.address || "",
      licenseNo: agency.licenseNo || "",
      parentAgencyId: agency.parentAgencyId || "none",
      agencyType: agency.agencyType || "main",
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.agencyName || !form.email) {
      toast.error("Agency name and email are required");
      return;
    }
    const parentAgencyId = form.agencyType === "sub" ? (form.parentAgencyId === "none" ? currentUser.agencyId : form.parentAgencyId) : undefined;
    if (form.agencyType === "sub" && !parentAgencyId) {
      toast.error("Select a parent agency for sub agency");
      return;
    }

    const payload = {
      ...form,
      parentAgencyId,
      agencyType: form.agencyType,
    };

    if (editingAgency) {
      updateAgency(editingAgency.agencyId, payload);
      toast.success("Agency updated");
    } else {
      addAgency({
        ...payload,
        agencyId: `a${Date.now()}`,
        walletBalance: 0,
        createdAt: new Date().toISOString().split("T")[0],
        totalBookings: 0,
      });
      toast.success(form.agencyType === "sub" ? "Sub agency created" : "Agency created");
    }
    setDialogOpen(false);
  };

  const updateStatus = (agencyId: string, status: AgencyStatus) => {
    updateAgency(agencyId, { status });
    toast.success(`Agency ${status}`);
  };

  const parentName = (agency: Agency) => agencies.find(a => a.agencyId === agency.parentAgencyId)?.agencyName;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Agency Management</h1>
          <p className="text-sm text-muted-foreground">
            {isAgencyOwner ? "Manage your agency branches and team users." : "Create agencies, manage branches, and control B2B partners."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageMain && (
            <Button onClick={() => openAdd("main")} className="gradient-primary text-primary-foreground gap-2">
              <Plus className="h-4 w-4" /> Add Agency
            </Button>
          )}
          {canCreateSubAgency && (
            <Button onClick={() => openAdd("sub")} variant="outline" className="gap-2">
              <Network className="h-4 w-4" /> Add Sub Agency
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Total Agencies" value={stats.total} icon={Building2} />
        <SummaryCard title="Active" value={stats.active} icon={CheckCircle} />
        <SummaryCard title="Sub Agencies" value={stats.sub} icon={Network} />
        <SummaryCard title="Agency Users" value={stats.users} icon={Users} />
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search agencies..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(agency => {
          const agencyUsers = users.filter(u => u.agencyId === agency.agencyId);
          const subAgencies = agencies.filter(a => a.parentAgencyId === agency.agencyId);
          const canEdit = canManageMain || (isAgencyOwner && (agency.agencyId === currentUser.agencyId || agency.parentAgencyId === currentUser.agencyId));
          return (
            <Card key={agency.agencyId} className="shadow-card hover:shadow-elevated transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                      {(agency.agencyType || "main") === "sub" ? <Network className="h-5 w-5 text-primary" /> : <Building2 className="h-5 w-5 text-primary" />}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-display truncate">{agency.agencyName}</CardTitle>
                      <p className="text-xs text-muted-foreground truncate">{agency.city || "No city"}</p>
                    </div>
                  </div>
                  {canEdit && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedAgency(agency)}>View Details</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(agency)}>
                          <Pencil className="h-3 w-3 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {agency.status === "pending" && canManageMain && (
                          <>
                            <DropdownMenuItem onClick={() => updateStatus(agency.agencyId, "active")} className="text-success">
                              <CheckCircle className="h-3 w-3 mr-2" /> Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatus(agency.agencyId, "rejected")} className="text-destructive">
                              <XCircle className="h-3 w-3 mr-2" /> Reject
                            </DropdownMenuItem>
                          </>
                        )}
                        {agency.status === "active" && (
                          <DropdownMenuItem onClick={() => updateStatus(agency.agencyId, "suspended")} className="text-warning">
                            <Ban className="h-3 w-3 mr-2" /> Suspend
                          </DropdownMenuItem>
                        )}
                        {agency.status === "suspended" && (
                          <DropdownMenuItem onClick={() => updateStatus(agency.agencyId, "active")} className="text-success">
                            <CheckCircle className="h-3 w-3 mr-2" /> Reactivate
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge status={agency.status} />
                  <Badge variant="outline" className="text-[10px]">
                    {(agency.agencyType || "main") === "sub" ? "Sub agency" : "Main agency"}
                  </Badge>
                </div>
                {agency.parentAgencyId && (
                  <p className="text-xs text-muted-foreground">Parent: {parentName(agency)}</p>
                )}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <Metric icon={Wallet} value={`PKR ${agency.walletBalance.toLocaleString()}`} />
                  <Metric icon={Users} value={`${agencyUsers.length} users`} />
                  <Metric icon={Network} value={`${subAgencies.length} subs`} />
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {agency.email}</p>
                  <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {agency.contactPerson || "No contact"} / {agency.commissionRate}%</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!selectedAgency} onOpenChange={() => setSelectedAgency(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">{selectedAgency?.agencyName}</DialogTitle>
          </DialogHeader>
          {selectedAgency && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Info label="Status"><StatusBadge status={selectedAgency.status} /></Info>
                <Info label="Type">{selectedAgency.agencyType === "sub" ? "Sub agency" : "Main agency"}</Info>
                <Info label="Commission">{selectedAgency.commissionRate}%</Info>
                <Info label="Wallet">PKR {selectedAgency.walletBalance.toLocaleString()}</Info>
                <Info label="Bookings">{selectedAgency.totalBookings}</Info>
                <Info label="Users">{users.filter(u => u.agencyId === selectedAgency.agencyId).length}</Info>
              </div>
              {selectedAgency.parentAgencyId && <Info label="Parent agency">{parentName(selectedAgency)}</Info>}
              <Info label="Contact">{selectedAgency.contactPerson}</Info>
              <Info label="Email">{selectedAgency.email}</Info>
              <Info label="Phone">{selectedAgency.phone}</Info>
              {selectedAgency.address && <Info label="Address">{selectedAgency.address}</Info>}
              {selectedAgency.licenseNo && <Info label="License No.">{selectedAgency.licenseNo}</Info>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{editingAgency ? "Edit Agency" : form.agencyType === "sub" ? "Add Sub Agency" : "Add New Agency"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Agency Name *"><Input value={form.agencyName} onChange={e => setForm(p => ({ ...p, agencyName: e.target.value }))} /></Field>
              <Field label="Contact Person"><Input value={form.contactPerson} onChange={e => setForm(p => ({ ...p, contactPerson: e.target.value }))} /></Field>
              <Field label="Email *"><Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></Field>
              <Field label="Phone"><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></Field>
              <Field label="City"><Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} /></Field>
              <Field label="Commission Rate (%)"><Input type="number" value={form.commissionRate} onChange={e => setForm(p => ({ ...p, commissionRate: Number(e.target.value) }))} /></Field>
              <Field label="Address"><Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></Field>
              <Field label="License No."><Input value={form.licenseNo} onChange={e => setForm(p => ({ ...p, licenseNo: e.target.value }))} /></Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Agency Type">
                <Select value={form.agencyType} onValueChange={v => setForm(p => ({ ...p, agencyType: v as "main" | "sub", parentAgencyId: v === "main" ? "none" : p.parentAgencyId }))} disabled={!canManageMain}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {canManageMain && <SelectItem value="main">Main agency</SelectItem>}
                    <SelectItem value="sub">Sub agency</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Parent Agency">
                <Select value={form.parentAgencyId} onValueChange={v => setForm(p => ({ ...p, parentAgencyId: v }))} disabled={form.agencyType !== "sub" || isAgencyOwner}>
                  <SelectTrigger><SelectValue placeholder="Select parent" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No parent</SelectItem>
                    {mainAgencies.map(a => <SelectItem key={a.agencyId} value={a.agencyId}>{a.agencyName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Status">
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as AgencyStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} className="flex-1 gradient-primary text-primary-foreground">
                {editingAgency ? "Update Agency" : "Create Agency"}
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon }: { title: string; value: number; icon: ComponentType<{ className?: string }> }) {
  return (
    <Card className="shadow-card">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-xl font-bold font-display">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ icon: Icon, value }: { icon: ComponentType<{ className?: string }>; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate">{value}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="font-medium">{children}</div>
    </div>
  );
}
