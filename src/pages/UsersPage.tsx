import { mockUsers } from "@/data/mock";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, Shield, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const roleLabels: Record<string, { label: string; color: string }> = {
  super_admin: { label: "Super Admin", color: "bg-primary/10 text-primary border-primary/20" },
  admin: { label: "Admin", color: "bg-info/10 text-info border-info/20" },
  staff: { label: "Staff", color: "bg-muted text-muted-foreground" },
  agency_owner: { label: "Agency Owner", color: "bg-warning/10 text-warning border-warning/20" },
  agency_staff: { label: "Agency Staff", color: "bg-accent text-accent-foreground" },
};

export default function UsersPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">User Management</h1>
          <p className="text-sm text-muted-foreground">Manage admin, staff, and agency users</p>
        </div>
        <Button className="gradient-primary text-primary-foreground gap-2">
          <Plus className="h-4 w-4" /> Add User
        </Button>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground bg-muted/50">
                  <th className="p-3 font-medium">Name</th>
                  <th className="p-3 font-medium">Email</th>
                  <th className="p-3 font-medium">Role</th>
                  <th className="p-3 font-medium">Agency</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Created</th>
                  <th className="p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockUsers.map(user => {
                  const role = roleLabels[user.role];
                  return (
                    <tr key={user.userId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center">
                            <span className="text-xs font-bold text-accent-foreground">{user.name.split(' ').map(n => n[0]).join('')}</span>
                          </div>
                          <span className="font-medium">{user.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">{user.email}</td>
                      <td className="p-3"><Badge variant="outline" className={`text-xs ${role.color}`}>{role.label}</Badge></td>
                      <td className="p-3 text-muted-foreground">{user.agencyId ? <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{user.agencyId}</span> : '—'}</td>
                      <td className="p-3"><StatusBadge status={user.status} /></td>
                      <td className="p-3 text-muted-foreground">{user.createdAt}</td>
                      <td className="p-3"><Button variant="ghost" size="sm">Edit</Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
