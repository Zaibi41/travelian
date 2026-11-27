import { PageHeading } from "@/components/admin/TabbedAdminPage";
import { useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { Card, CardContent } from "@/components/admin/ui/card";
import { Button } from "@/components/admin/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, Building2, Pencil, Search, Shield, Users, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/admin/ui/field";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { Label } from "@/components/admin/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdmin } from "@/contexts/AdminStore";
import { useRole } from "@/contexts/RoleContext";
import type { User, UserRole } from "@/data/models";
import { toast } from "sonner";

const roleLabels: Record<string, { label: string; color: string }> = {
  super_admin: { label: "Super Admin", color: "bg-primary/10 text-primary border-primary/20" },
  admin: { label: "Admin", color: "bg-info/10 text-info border-info/20" },
  staff: { label: "Staff", color: "bg-muted text-muted-foreground" },
  agency_owner: { label: "Agency Owner", color: "bg-warning/10 text-warning border-warning/20" },
  agency_staff: { label: "Agency Staff", color: "bg-accent text-accent-foreground" },
};

const emptyUser = {
  name: "",
  email: "",
  role: "agency_staff" as UserRole,
  agencyId: "none",
  designation: "",
  status: "active" as User["status"],
};

export default function UsersPage() {
  const { users, agencies, addUser, updateUser } = useAdmin();
  const { currentRole, currentUser } = useRole();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState(emptyUser);

  const isSuperAdmin = currentRole === "super_admin";
  const isAdmin = currentRole === "admin";
  const isAgencyOwner = currentRole === "agency_owner";
  const managedAgencyIds = useMemo(() => {
    if (!isAgencyOwner || !currentUser.agencyId) return agencies.map(a => a.agencyId);
    return agencies
      .filter(a => a.agencyId === currentUser.agencyId || a.parentAgencyId === currentUser.agencyId)
      .map(a => a.agencyId);
  }, [agencies, currentUser.agencyId, isAgencyOwner]);

  const visibleUsers = users.filter(user => {
    if (isAgencyOwner) return !!user.agencyId && managedAgencyIds.includes(user.agencyId);
    return true;
  });

  const filtered = visibleUsers.filter(user =>
    user.name.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase()) ||
    (agencyName(user.agencyId, agencies) || "").toLowerCase().includes(search.toLowerCase())
  );

  const roleOptions: UserRole[] = isAgencyOwner
    ? ["agency_staff"]
    : isSuperAdmin
      ? ["super_admin", "admin", "staff", "agency_owner", "agency_staff"]
      : ["staff", "agency_owner", "agency_staff"];

  const assignableAgencies = isAgencyOwner
    ? agencies.filter(a => managedAgencyIds.includes(a.agencyId))
    : agencies;

  const openAdd = () => {
    setEditingUser(null);
    setForm({
      ...emptyUser,
      role: isAgencyOwner ? "agency_staff" : "admin",
      agencyId: isAgencyOwner ? (currentUser.agencyId || "none") : "none",
      designation: isAgencyOwner ? "Agency Staff" : "",
    });
    setDialogOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      agencyId: user.agencyId || "none",
      designation: user.designation || "",
      status: user.status,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name || !form.email) {
      toast.error("Name and email are required");
      return;
    }
    const isAgencyRole = form.role === "agency_owner" || form.role === "agency_staff";
    if (isAgencyRole && form.agencyId === "none") {
      toast.error("Select an agency for agency users");
      return;
    }
    if (isAgencyOwner && !managedAgencyIds.includes(form.agencyId)) {
      toast.error("You can only create users for your own agency network");
      return;
    }

    const agency = agencies.find(a => a.agencyId === form.agencyId);
    const payload: Partial<User> = {
      name: form.name,
      email: form.email,
      role: form.role,
      status: form.status,
      designation: form.designation,
      agencyId: isAgencyRole ? form.agencyId : undefined,
      parentAgencyId: agency?.parentAgencyId,
    };

    if (editingUser) {
      updateUser(editingUser.userId, payload);
      toast.success("User updated");
    } else {
      addUser({
        userId: `u${Date.now()}`,
        createdAt: new Date().toISOString().split("T")[0],
        ...payload,
      } as User);
      toast.success(isAgencyOwner ? "Agency user created" : "User created");
    }
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <PageHeading className="text-page-title font-bold font-display">{isAgencyOwner ? "Agency Users" : "User Management"}</PageHeading>
          <p className="text-body text-muted-foreground">
            {isAgencyOwner ? "Create staff users for your agency and sub agencies." : "Manage super admin, admin, staff, agency owner, and agency staff users."}
          </p>
        </div>
        {(isSuperAdmin || isAdmin || isAgencyOwner) && (
          <Button onClick={openAdd} className="gradient-primary text-primary-foreground gap-2">
            <Plus className="h-4 w-4" /> Add User
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Summary title="Total Users" value={filtered.length} icon={Users} />
        <Summary title="Agency Users" value={filtered.filter(u => u.role.startsWith("agency")).length} icon={Building2} />
        <Summary title="Active Users" value={filtered.filter(u => u.status === "active").length} icon={UserCheck} />
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-body">
              <thead>
                <tr className="border-b text-left text-muted-foreground bg-muted/50">
                  <th className="p-3 font-medium">Name</th>
                  <th className="p-3 font-medium">Email</th>
                  <th className="p-3 font-medium">Role</th>
                  <th className="p-3 font-medium">Agency</th>
                  <th className="p-3 font-medium">Designation</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Created</th>
                  <th className="p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(user => {
                  const role = roleLabels[user.role];
                  return (
                    <tr key={user.userId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center">
                            <span className="text-helper font-bold text-accent-foreground">{initials(user.name)}</span>
                          </div>
                          <span className="font-medium whitespace-nowrap">{user.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">{user.email}</td>
                      <td className="p-3"><Badge variant="outline" className={`text-helper ${role.color}`}>{role.label}</Badge></td>
                      <td className="p-3 text-muted-foreground">
                        {user.agencyId ? (
                          <span className="flex items-center gap-1 whitespace-nowrap">
                            <Building2 className="h-3 w-3" />{agencyName(user.agencyId, agencies)}
                          </span>
                        ) : "-"}
                      </td>
                      <td className="p-3 text-muted-foreground">{user.designation || "-"}</td>
                      <td className="p-3"><StatusBadge status={user.status} /></td>
                      <td className="p-3 text-muted-foreground">{user.createdAt}</td>
                      <td className="p-3">
                        <Button variant="ghost" size="sm" className="gap-1" onClick={() => openEdit(user)}>
                          <Pencil className="h-3 w-3" /> Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">
                      {search.trim() ? "No users match your search." : "No users yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display">{editingUser ? "Edit User" : isAgencyOwner ? "Add Agency User" : "Add User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Name *"><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></Field>
              <Field label="Email *"><Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></Field>
              <Field label="Role">
                <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v as UserRole, agencyId: v.startsWith("agency") ? p.agencyId : "none" }))} disabled={isAgencyOwner}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roleOptions.map(role => <SelectItem key={role} value={role}>{roleLabels[role].label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Agency">
                <Select value={form.agencyId} onValueChange={v => setForm(p => ({ ...p, agencyId: v }))} disabled={!form.role.startsWith("agency")}>
                  <SelectTrigger><SelectValue placeholder="Select agency" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No agency</SelectItem>
                    {assignableAgencies.map(a => (
                      <SelectItem key={a.agencyId} value={a.agencyId}>
                        {a.agencyName}{a.agencyType === "sub" ? " (sub)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Designation"><Input value={form.designation} onChange={e => setForm(p => ({ ...p, designation: e.target.value }))} placeholder="Ticketing, Sales, Manager..." /></Field>
              <Field label="Status">
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as User["status"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 text-helper text-muted-foreground">
              <Shield className="h-3.5 w-3.5 inline mr-1" />
              Agency owners can only create staff users inside their own agency network. Super admins can create platform users and agency owners.
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} className="flex-1 gradient-primary text-primary-foreground">
                {editingUser ? "Update User" : "Create User"}
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Summary({ title, value, icon: Icon }: { title: string; value: number; icon: ComponentType<{ className?: string }> }) {
  return (
    <Card className="shadow-card">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-helper text-muted-foreground">{title}</p>
          <p className="text-kpi-sm font-bold font-display">{value}</p>
        </div>
      </CardContent>
    </Card>
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

function initials(name: string) {
  return name.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase();
}

function agencyName(agencyId: string | undefined, agencies: { agencyId: string; agencyName: string }[]) {
  if (!agencyId) return "";
  return agencies.find(a => a.agencyId === agencyId)?.agencyName || agencyId;
}
