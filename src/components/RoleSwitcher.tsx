import { useRole } from "@/contexts/RoleContext";
import { UserRole } from "@/data/models";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, User, Building2, Users, Headset, TestTube2 } from "lucide-react";
import { canSwitchRoles } from "@/lib/role-mapping";
import { getSession } from "@/lib/auth-session";
import { canAccessAdminPath } from "@/lib/admin-navigation";
import { useLocation, useNavigate } from "react-router-dom";

const roleOptions: { value: UserRole; label: string; icon: React.ReactNode; color: string }[] = [
  { value: "super_admin", label: "Super Admin", icon: <Shield className="h-3.5 w-3.5" />, color: "text-primary" },
  { value: "admin", label: "Admin", icon: <User className="h-3.5 w-3.5" />, color: "text-info" },
  { value: "staff", label: "Staff", icon: <Users className="h-3.5 w-3.5" />, color: "text-muted-foreground" },
  { value: "agency_owner", label: "Agency Owner", icon: <Building2 className="h-3.5 w-3.5" />, color: "text-warning" },
  { value: "agency_staff", label: "Agency Staff", icon: <Building2 className="h-3.5 w-3.5" />, color: "text-accent-foreground" },
  { value: "customer", label: "Customer", icon: <User className="h-3.5 w-3.5" />, color: "text-muted-foreground" },
  { value: "qa", label: "QA Testing", icon: <TestTube2 className="h-3.5 w-3.5" />, color: "text-info" },
  { value: "internal_support", label: "Internal Support", icon: <Headset className="h-3.5 w-3.5" />, color: "text-info" },
];

export function RoleSwitcher() {
  const { currentRole, setCurrentRole, currentUser } = useRole();
  const navigate = useNavigate();
  const location = useLocation();
  const switchRole = (role: UserRole) => {
    setCurrentRole(role);
    if (!canAccessAdminPath(role, location.pathname)) {
      navigate(role === "customer" ? "/admin/customer" : "/admin");
    }
  };
  if (!canSwitchRoles(getSession(), currentRole)) {
    return <span className="text-xs text-muted-foreground hidden md:block">{currentUser.name}</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={currentRole} onValueChange={(v) => switchRole(v as UserRole)}>
        <SelectTrigger className="w-[180px] h-9 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {roleOptions.map((r) => (
            <SelectItem key={r.value} value={r.value}>
              <span className="flex items-center gap-2">
                <span className={r.color}>{r.icon}</span>
                {r.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-xs text-muted-foreground hidden md:block">{currentUser.name}</span>
    </div>
  );
}
