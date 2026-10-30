import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Bell, ChevronDown, KeyRound, LogOut, Pencil, UserRound, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

import { clearSession, getSession } from "@/lib/auth-session";
import { cognitoLogoutUrl } from "@/lib/cognito-auth";
import { toast } from "sonner";
import { useLocation } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { canAccessAdminPath, roleLabel } from "@/lib/admin-navigation";
import AccessDeniedPage from "@/pages/AccessDeniedPage";
import { MoveToTopButton } from "@/components/MoveToTopButton";
import { useAdmin } from "@/contexts/AdminStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { AdminProfileDialog, type ProfileAction } from "@/components/AdminProfileDialog";
import { formatPkr, getWalletSummary } from "@/lib/wallet-summary";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { notifications, agencies, walletLedger, walletDeposits } = useAdmin();
  const unreadCount = notifications.filter(notification => !notification.read).length;
  const navigate = useNavigate();
  const location = useLocation();
  const { currentRole, currentUser } = useRole();
  const canViewWallet = canAccessAdminPath(currentRole, "/admin/wallet") &&
    (currentRole !== "agency_owner" && currentRole !== "agency_staff" || !!currentUser.agencyId);
  const walletSummary = canViewWallet
    ? getWalletSummary(agencies, walletLedger, walletDeposits, currentRole, currentUser.agencyId)
    : null;
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  const [profileAction, setProfileAction] = useState<ProfileAction | null>(null);
  const profileActionRef = useRef(profileAction);
  profileActionRef.current = profileAction;
  const [pendingProfileAction, setPendingProfileAction] = useState<ProfileAction | null>(null);
  const session = getSession();
  const isAuthenticated = !!session;
  const allowed = isAuthenticated && canAccessAdminPath(currentRole, location.pathname);

  useEffect(() => {
    if (!isAuthenticated) {
      const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
      navigate(`/signin?redirect=${redirect}`, { replace: true });
      return;
    }
    if (currentRole === "customer" && location.pathname === "/admin") {
      navigate("/admin/customer", { replace: true });
    }
  }, [currentRole, isAuthenticated, location.pathname, location.search, navigate]);

  const openProfileAction = (action: ProfileAction) => {
    toast.dismiss("account-update");
    setPendingProfileAction(action);
  };

  const handleLogout = () => {
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
            </div>
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              {walletSummary && (
                <Link to="/admin/wallet" aria-label={`Wallet balance ${formatPkr(walletSummary.available)}`} className="flex min-w-0 items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/10 px-2 py-1.5 text-sm font-bold text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-2 sm:px-3">
                  <Wallet aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
                  <span className="hidden font-semibold text-primary/80 lg:inline">Wallet</span>
                  <span className="truncate">{formatPkr(walletSummary.available)}</span>
                </Link>
              )}
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button ref={accountTriggerRef} variant="ghost" aria-label="Open account menu" className="h-11 max-w-[calc(100%-3rem)] gap-2 rounded-xl px-2">
                  <span className="relative shrink-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={session?.picture} alt="" className="object-cover" />
                      <AvatarFallback className="bg-primary/10 text-primary"><UserRound aria-hidden="true" className="h-5 w-5" /></AvatarFallback>
                    </Avatar>
                    {unreadCount > 0 && canAccessAdminPath(currentRole, "/admin/notifications") && <span aria-hidden="true" className="absolute right-0 top-0 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />}
                  </span>
                  <span className="hidden min-w-0 text-left sm:block">
                    <span className="block max-w-36 truncate text-sm font-medium">{currentUser.name}</span>
                    <span className="block text-xs text-muted-foreground">{roleLabel(currentRole)}</span>
                  </span>
                  <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent onCloseAutoFocus={event => { if (pendingProfileAction) { event.preventDefault(); setProfileAction(pendingProfileAction); setPendingProfileAction(null); } }} align="end" sideOffset={8} className="w-64 max-w-[calc(100vw-2rem)] rounded-xl p-1.5 motion-reduce:!animate-none">
                <DropdownMenuLabel className="px-2 py-2 font-normal">
                  <p className="truncate text-sm font-semibold">{currentUser.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{currentUser.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => openProfileAction("view")} className="min-h-10 gap-2 rounded-lg"><UserRound aria-hidden="true" className="h-4 w-4" /> View profile</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => openProfileAction("edit")} className="min-h-10 gap-2 rounded-lg"><Pencil aria-hidden="true" className="h-4 w-4" /> Edit profile</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => openProfileAction("password")} className="min-h-10 gap-2 rounded-lg"><KeyRound aria-hidden="true" className="h-4 w-4" /> Change password</DropdownMenuItem>
                {canAccessAdminPath(currentRole, "/admin/notifications") && (
                  <DropdownMenuItem asChild className="min-h-10 gap-2 rounded-lg">
                    <Link to="/admin/notifications"><Bell aria-hidden="true" className="h-4 w-4" /> Notifications {unreadCount > 0 && <span className="ml-auto rounded-full bg-primary/10 px-2 text-xs font-semibold text-primary">{unreadCount} unread</span>}</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleLogout} className="min-h-10 gap-2 rounded-lg text-destructive focus:bg-destructive/10 focus:text-destructive">
                  <LogOut aria-hidden="true" className="h-4 w-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 bg-muted/20 p-4 md:p-6">
            {!isAuthenticated ? null : allowed ? children : <AccessDeniedPage />}
          </main>
          <MoveToTopButton className="bottom-6" />
          {profileAction && <AdminProfileDialog key={profileAction} action={profileAction} onRestoreFocus={() => { if (!profileActionRef.current && accountTriggerRef.current?.getAttribute("aria-expanded") !== "true") accountTriggerRef.current?.focus(); }} onClose={() => setProfileAction(null)} onEdit={() => setProfileAction("edit")} />}
        </div>
      </div>
    </SidebarProvider>
  );
}
