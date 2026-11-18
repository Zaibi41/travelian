import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Bell, ChevronDown, Globe, KeyRound, LogOut, Megaphone, Pencil, UserRound, Wallet } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { clearSession, getSession, useSessionEvent } from "@/lib/auth-session";
import { sessionState, signInUrl } from "@/lib/auth-guard";
import { isUserSignOut, markUserSignOut, renewSession } from "@/lib/session-renewal";
import { cognitoLogoutUrl } from "@/lib/cognito-auth";
import { toast } from "sonner";
import { useLocation } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { adminPageTitle, canAccessAdminPath, isInternalRole, roleLabel } from "@/lib/admin-navigation";
import { Helmet } from "react-helmet-async";
import AccessDeniedPage from "@/pages/AccessDeniedPage";
import { MoveToTopButton } from "@/components/MoveToTopButton";
import { useAdmin } from "@/contexts/AdminStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { AdminProfileDialog, type ProfileAction } from "@/components/AdminProfileDialog";
import { useBookingAlerts } from "@/lib/admin-notifications";
import { formatPkr, getWalletSummary } from "@/lib/wallet-summary";
import { ANNOUNCEMENTS_CHANGED, listAdminAnnouncements } from "@/lib/admin-announcements";

/** Admin route guard: with no session, or one known to be expired, no admin page, menu or header
 *  renders. An expired session with a refresh token gets one refresh attempt first; otherwise the
 *  person goes to sign-in, which brings them back to the page they asked for. A session that ends
 *  while the app is open (401, or signed out in another tab) goes to sign-in with the expired message. */
export function useAdminSession(): boolean {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSessionState] = useState(getSession);
  const state = sessionState(session);
  const hadValid = useRef(state === "valid");
  const triedRefresh = useRef(false);
  const redirected = useRef(false);
  const [renewing, setRenewing] = useState(false);

  useEffect(() => useSessionEvent(() => setSessionState(getSession())), []);

  useEffect(() => {
    if (state === "valid") {
      hadValid.current = true;
      redirected.current = false;
      return;
    }
    if (renewing || redirected.current) return;
    if (state === "expired" && session?.refreshToken && !triedRefresh.current) {
      triedRefresh.current = true;
      setRenewing(true);
      void renewSession().then(ok => {
        setRenewing(false);
        if (!ok) clearSession();
        setSessionState(getSession());
      });
      return;
    }
    if (isUserSignOut()) return;                        // Sign out navigates on its own
    redirected.current = true;
    const expired = state === "expired" || hadValid.current;
    if (state === "expired") clearSession();
    navigate(signInUrl(`${location.pathname}${location.search}${location.hash}`, expired), { replace: true });
  }, [state, renewing, session, location.pathname, location.search, location.hash, navigate]);

  return state === "valid";
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return useAdminSession() ? <AdminShell>{children}</AdminShell> : null;
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const { notifications, agencies, walletLedger, walletDeposits } = useAdmin();
  const alerts = useBookingAlerts();
  const unreadCount = notifications.filter(notification => !notification.read).length + alerts.unseen;
  const [announcements, setAnnouncements] = useState(listAdminAnnouncements);
  const navigate = useNavigate();
  const location = useLocation();
  const { currentRole, currentUser } = useRole();
  // Super Admin top bar: sidebar toggle and user menu only. The announcement
  // ticker and Wallet chip stay for other roles (wallets are B2B agency only).
  const isSuperAdmin = currentRole === "super_admin";
  const canViewWallet = !isSuperAdmin && canAccessAdminPath(currentRole, "/admin/wallet") &&
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

  // Activate the admin design tokens (src/styles/theme.css). Set on <html>, not a
  // wrapper, so portal content (dropdowns, dialogs, toasts) is themed too.
  // Layout effect: applied before first paint, so no flash of public colors.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-app-theme", "admin");
    return () => root.removeAttribute("data-app-theme");
  }, []);

  useEffect(() => {
    const update = () => setAnnouncements(listAdminAnnouncements());
    window.addEventListener(ANNOUNCEMENTS_CHANGED, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(ANNOUNCEMENTS_CHANGED, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;                       // useAdminSession redirects
    if (currentRole === "customer" && location.pathname === "/admin") {
      navigate("/admin/customer", { replace: true });
    }
  }, [currentRole, isAuthenticated, location.pathname, location.search, navigate]);

  const openProfileAction = (action: ProfileAction) => {
    toast.dismiss("account-update");
    setPendingProfileAction(action);
  };

  const handleLogout = () => {
    markUserSignOut();
    clearSession();
    toast.success("Signed out");
    if (session?.provider === "Cognito") {
      window.location.assign(cognitoLogoutUrl());
      return;
    }
    navigate("/signin");
  };

  return (
    <>
    <Helmet><title>{`${adminPageTitle(currentRole, location.pathname)} · Travelian Admin`}</title></Helmet>
    <SidebarProvider>
      <div className="flex min-h-svh w-full bg-muted/20">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 h-16 flex items-center justify-between border-b bg-card/95 px-4 shrink-0 backdrop-blur">
            <div className="flex shrink-0 items-center gap-2">
              <SidebarTrigger />
            </div>
            {!isSuperAdmin && announcements.length > 0 && <div className="mx-2 flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-label text-primary sm:mx-4" role="region" aria-label="Announcements">
              <Megaphone aria-hidden="true" className="h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="admin-announcement-scroll flex w-max items-center whitespace-nowrap font-medium motion-reduce:!animate-none" style={{ animationDuration: `${Math.max(18, announcements.length * 10)}s` }}>
                  {[0, 1].map(copy => <div key={copy} aria-hidden={copy === 1 ? true : undefined} className={`flex w-max shrink-0 items-center gap-5 pr-5 ${copy === 1 ? "motion-reduce:hidden" : ""}`}>
                    {announcements.map((item, index) => <span key={item.id} className="flex items-center gap-5">
                      {index > 0 && <span aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full bg-primary/50" />}
                      <span>{item.message}</span>
                    </span>)}
                  </div>)}
                </div>
              </div>
            </div>}
            <div className="ml-auto flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
              {walletSummary && (
                <Link to="/admin/wallet" aria-label={`Wallet balance ${formatPkr(walletSummary.available)}`} className="flex min-w-0 items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/10 px-2 py-1.5 text-body font-bold text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-2 sm:px-3">
                  <Wallet aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
                  <span className="hidden font-semibold text-primary/80 lg:inline">Wallet</span>
                  <span className="truncate">{formatPkr(walletSummary.available)}</span>
                </Link>
              )}
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button ref={accountTriggerRef} variant="ghost" aria-label="Open account menu" className="h-11 gap-2 rounded-xl px-2">
                  <span className="relative shrink-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={session?.picture} alt="" className="object-cover" />
                      <AvatarFallback className="bg-primary/10 text-primary"><UserRound aria-hidden="true" className="h-5 w-5" /></AvatarFallback>
                    </Avatar>
                    {unreadCount > 0 && canAccessAdminPath(currentRole, "/admin/notifications") && <span aria-hidden="true" className="absolute right-0 top-0 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />}
                  </span>
                  <span className="hidden text-left sm:block">
                    <span className="block whitespace-nowrap text-body font-medium">{currentUser.name}</span>
                    <span className="block whitespace-nowrap text-label text-muted-foreground">{roleLabel(currentRole)}</span>
                  </span>
                  <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent onCloseAutoFocus={event => { if (pendingProfileAction) { event.preventDefault(); setProfileAction(pendingProfileAction); setPendingProfileAction(null); } }} align="end" sideOffset={8} className="w-64 max-w-[calc(100vw-2rem)] rounded-xl p-1.5 motion-reduce:!animate-none">
                <DropdownMenuLabel className="px-2 py-2 font-normal">
                  <p className="break-words text-body font-semibold">{currentUser.name}</p>
                  <p className="text-label text-muted-foreground">{roleLabel(currentRole)}</p>
                  {currentUser.email && <p className="break-all text-label text-muted-foreground">{currentUser.email}</p>}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => openProfileAction("view")} className="min-h-10 gap-2 rounded-lg"><UserRound aria-hidden="true" className="h-4 w-4" /> View profile</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => openProfileAction("edit")} className="min-h-10 gap-2 rounded-lg"><Pencil aria-hidden="true" className="h-4 w-4" /> Edit profile</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => openProfileAction("password")} className="min-h-10 gap-2 rounded-lg"><KeyRound aria-hidden="true" className="h-4 w-4" /> Change password</DropdownMenuItem>
                {canAccessAdminPath(currentRole, "/admin/notifications") && (
                  <DropdownMenuItem asChild className="min-h-10 gap-2 rounded-lg">
                    <Link to="/admin/notifications"><Bell aria-hidden="true" className="h-4 w-4" /> Notifications {unreadCount > 0 && <span className="ml-auto rounded-full bg-primary/10 px-2 text-helper font-semibold text-primary">{unreadCount} unread</span>}</Link>
                  </DropdownMenuItem>
                )}
                {/* Internal roles: moved here from the sidebar. Agency/customer sidebars keep their link. */}
                {isInternalRole(currentRole) && (
                  <DropdownMenuItem asChild className="min-h-10 gap-2 rounded-lg">
                    <Link to="/"><Globe aria-hidden="true" className="h-4 w-4" /> View public site</Link>
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
          {/* Bottom padding keeps content scrollable clear of the fixed Move-to-top button. */}
          <main className="flex-1 bg-muted/20 p-4 pb-24 md:p-6 md:pb-24">
            {!isAuthenticated ? null : allowed ? children : <AccessDeniedPage />}
          </main>
          {/* No WhatsApp chat button in the admin: it is a public-site help channel. */}
          <MoveToTopButton className="bottom-6" />
          {profileAction && <AdminProfileDialog key={profileAction} action={profileAction} onRestoreFocus={() => { if (!profileActionRef.current && accountTriggerRef.current?.getAttribute("aria-expanded") !== "true") accountTriggerRef.current?.focus(); }} onClose={() => setProfileAction(null)} onEdit={() => setProfileAction("edit")} />}
        </div>
      </div>
    </SidebarProvider>
    </>
  );
}
