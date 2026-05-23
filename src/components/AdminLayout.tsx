import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { clearSession, getSession } from "@/lib/auth-session";
import { cognitoLogoutUrl } from "@/lib/cognito-auth";
import { toast } from "sonner";
import { useLocation } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { canAccessAdminPath } from "@/lib/admin-navigation";
import AccessDeniedPage from "@/pages/AccessDeniedPage";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const unreadCount = 0;
  const navigate = useNavigate();
  const location = useLocation();
  const { currentRole } = useRole();
  const allowed = canAccessAdminPath(currentRole, location.pathname);

  const handleLogout = () => {
    const session = getSession();
    clearSession();
    toast.success("Signed out");
    if (session?.provider === "Cognito") {
      window.location.assign(cognitoLogoutUrl());
      return;
    }
    navigate("/signin");
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-svh w-full bg-muted/20">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 h-14 flex items-center justify-between border-b bg-card/95 px-4 shrink-0 backdrop-blur">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <span className="text-sm text-muted-foreground hidden sm:block">Travel Management System</span>
            </div>
            <div className="flex items-center gap-3">
              <RoleSwitcher />
              <Button variant="outline" size="sm" onClick={handleLogout} className="hidden sm:inline-flex gap-2 rounded-lg">
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="sm:hidden" aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
              <Link to="/admin/notifications">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center font-medium">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </Link>
            </div>
          </header>
          <main className="flex-1 bg-muted/20 p-4 md:p-6">
            {allowed ? children : <AccessDeniedPage />}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
