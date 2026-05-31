import { useState } from "react";
import { availableModules, User, UserRole } from "@/data/models";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Save, Users } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "sonner";

export default function RBACPage() {
  const { currentRole } = useRole();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>(users[0]?.userId || '');

  if (currentRole !== 'super_admin') {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-2">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-bold font-display">Access Denied</h2>
          <p className="text-sm text-muted-foreground">Only Super Admins can manage access control</p>
        </div>
      </div>
    );
  }

  const user = users.find(u => u.userId === selectedUser);
  const userModules = user?.moduleAccess || [];
  const isAllAccess = userModules.includes('all');

  const toggleModule = (moduleId: string) => {
    setUsers(prev => prev.map(u => {
      if (u.userId !== selectedUser) return u;
      const current = u.moduleAccess || [];
      if (moduleId === 'all') {
        return { ...u, moduleAccess: current.includes('all') ? [] : ['all'] };
      }
      const filtered = current.filter(m => m !== 'all');
      return { ...u, moduleAccess: filtered.includes(moduleId) ? filtered.filter(m => m !== moduleId) : [...filtered, moduleId] };
    }));
  };

  const handleSave = () => toast.success(`Permissions saved for ${user?.name}`);

  const roleColor: Record<string, string> = {
    super_admin: 'bg-primary/10 text-primary',
    admin: 'bg-info/10 text-info',
    staff: 'bg-muted text-muted-foreground',
    agency_owner: 'bg-warning/10 text-warning',
    agency_staff: 'bg-accent text-accent-foreground',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold font-display">Access Control (RBAC)</h1>
        <p className="text-sm text-muted-foreground">Manage module-level access for each user</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base font-display flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Users</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-2">
            {users.filter(u => u.role !== 'agency_owner' && u.role !== 'agency_staff').map(u => (
              <button
                key={u.userId}
                onClick={() => setSelectedUser(u.userId)}
                className={`w-full text-left p-3 rounded-lg transition-colors flex items-center justify-between ${selectedUser === u.userId ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50'}`}
              >
                <div>
                  <p className="text-sm font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <Badge variant="outline" className={`text-[10px] ${roleColor[u.role] || ''}`}>
                  {u.role.replace('_', ' ')}
                </Badge>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Module Access - {user?.name}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Select which modules this user can access</p>
            </div>
            <Button onClick={handleSave} className="gradient-primary text-primary-foreground gap-2"><Save className="h-4 w-4" /> Save</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {/* All access toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg border bg-accent/30">
                <div className="flex items-center gap-3">
                  <Checkbox checked={isAllAccess} onCheckedChange={() => toggleModule('all')} />
                  <div>
                    <p className="text-sm font-bold">Full Access (All Modules)</p>
                    <p className="text-xs text-muted-foreground">Grant access to every module</p>
                  </div>
                </div>
              </div>

              {!isAllAccess && availableModules.map(mod => {
                const checked = userModules.includes(mod.moduleId);
                return (
                  <div key={mod.moduleId} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <Checkbox checked={checked} onCheckedChange={() => toggleModule(mod.moduleId)} />
                      <div>
                        <p className="text-sm font-medium">{mod.moduleName}</p>
                        <p className="text-xs text-muted-foreground">{mod.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
