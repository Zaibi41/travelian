import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, User, Phone, Globe, ChevronDown, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { clearSession, getSession, useSessionEvent, type AuthSession } from "@/lib/auth-session";
import { cognitoLogoutUrl } from "@/lib/cognito-auth";
import { isAdminPortalRole, roleForSession } from "@/lib/role-mapping";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CURRENCIES, LANGUAGES, useLocale } from "@/contexts/LocaleContext";
import { WhatsAppIcon } from "./WhatsAppIcon";

const navLinks = [
  { label: "Flights", href: "/" },
  { label: "Hotels", href: "/hotels-search" },
  { label: "Umrah", href: "/umrah-packages" },
  { label: "Visas", href: "/visa-services" },
  { label: "Deals", href: "/deals" },
  { label: "About", href: "/about" },
];

const SUPPORT_PHONE = "+92 324 4440014";
const SUPPORT_PHONE_TEL = "+923244440014";
const WHATSAPP_URL = `https://wa.me/${SUPPORT_PHONE_TEL.replace("+", "")}`;

export function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currency, setCurrency, language, setLanguage } = useLocale();
  const [session, setSessionState] = useState<AuthSession | null>(() => getSession());
  const sessionRole = roleForSession(session);
  const showAdminPortal = isAdminPortalRole(sessionRole);
  const isSuperAdmin = ["super_admin", "admin", "qa", "internal_support"].includes(sessionRole);
  const isAgency = sessionRole === "agency_owner" || sessionRole === "agency_staff";

  useEffect(() => useSessionEvent(() => setSessionState(getSession())), []);

  const handleLogout = () => {
    clearSession();
    toast.success("Signed out");
    if (session?.provider === "Cognito") {
      window.location.assign(cognitoLogoutUrl());
      return;
    }
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border/50">
      <div className="hidden md:block bg-muted/40 border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center justify-between text-sm">
          <a href={`tel:${SUPPORT_PHONE_TEL}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
            <Phone className="h-4 w-4" /> 24/7 Support: <span className="font-bold text-foreground">{SUPPORT_PHONE}</span>
          </a>
          <div className="flex items-center gap-1">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] text-white hover:bg-[#20BD5A] font-semibold shadow-sm"
            >
              <WhatsAppIcon className="h-4 w-4" /> WhatsApp
            </a>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-card font-medium">
                  {currency} <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[60] bg-popover">
                <DropdownMenuLabel className="text-xs">Currency</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {CURRENCIES.map((c) => (
                  <DropdownMenuItem key={c.code} onClick={() => setCurrency(c.code)} className="text-xs">
                    <span className="font-semibold w-10">{c.code}</span>
                    <span className="text-muted-foreground">{c.label}</span>
                    {currency === c.code && <span className="ml-auto text-primary">✓</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-card font-medium">
                  <Globe className="h-3.5 w-3.5" /> {language.toUpperCase()} <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[60] bg-popover">
                <DropdownMenuLabel className="text-xs">Language</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {LANGUAGES.map((l) => (
                  <DropdownMenuItem key={l.code} onClick={() => setLanguage(l.code)} className="text-xs">
                    <span className="w-12">{l.label}</span>
                    <span className="text-muted-foreground">{l.native}</span>
                    {language === l.code && <span className="ml-auto text-primary">✓</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center">
            <img src="/travelian-brand-logo.png" alt="Travelian" className="h-12 w-12 rounded-full object-contain" />
            <span className="ml-2 text-xl font-black tracking-tight text-foreground">Travelian</span>
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  location.pathname === link.href
                    ? "text-primary bg-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-2">
            {session && (
              <Link to="/my-bookings">
                <Button variant="ghost" size="sm" className="rounded-lg text-sm">My Bookings</Button>
              </Link>
            )}
            {session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 rounded-lg">
                    <User className="h-4 w-4" /> {(session.name || session.email || "Account").split(" ")[0]} <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[60] bg-popover">
                  <DropdownMenuLabel className="text-xs truncate max-w-[200px]">{session.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isSuperAdmin && <DropdownMenuItem onClick={() => navigate("/admin")}>Super Admin Dashboard</DropdownMenuItem>}
                  {isSuperAdmin && <DropdownMenuItem onClick={() => navigate("/admin/settings")}>Account Settings</DropdownMenuItem>}
                  {isSuperAdmin && <DropdownMenuItem onClick={() => navigate("/")}>View Public Site</DropdownMenuItem>}
                  {isAgency && <DropdownMenuItem onClick={() => navigate("/admin")}>Agency Dashboard</DropdownMenuItem>}
                  {isAgency && <DropdownMenuItem onClick={() => navigate("/admin/bookings")}>My Bookings</DropdownMenuItem>}
                  {isAgency && <DropdownMenuItem onClick={() => navigate("/admin/wallet")}>Wallet</DropdownMenuItem>}
                  {isAgency && <DropdownMenuItem onClick={() => navigate("/admin")}>Reports</DropdownMenuItem>}
                  {!showAdminPortal && <DropdownMenuItem onClick={() => navigate("/admin/customer")}>My Account</DropdownMenuItem>}
                  {!showAdminPortal && <DropdownMenuItem onClick={() => navigate("/admin/customer/bookings")}>My Bookings</DropdownMenuItem>}
                  {!showAdminPortal && <DropdownMenuItem onClick={() => navigate("/admin/customer/wallet")}>Wallet</DropdownMenuItem>}
                  {!showAdminPortal && <DropdownMenuItem onClick={() => navigate("/admin/customer/support")}>Support</DropdownMenuItem>}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link to="/signin">
                  <Button variant="outline" size="sm" className="gap-2 rounded-lg">
                    <User className="h-4 w-4" /> Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="gradient-primary text-primary-foreground rounded-lg font-semibold">Register</Button>
                </Link>
              </>
            )}
          </div>

          <button type="button" className="lg:hidden p-2" aria-label={mobileOpen ? "Close menu" : "Open menu"} onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="lg:hidden border-t py-3 space-y-1 pb-4 animate-fade-in">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-muted/50"
              >
                {link.label}
              </Link>
            ))}
            <div className="flex items-center justify-between gap-2 px-3 pt-2 text-xs">
              <a href={`tel:${SUPPORT_PHONE_TEL}`} className="flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3.5 w-3.5" /> {SUPPORT_PHONE}</a>
              <div className="flex items-center gap-2">
                <select value={currency} onChange={(e) => setCurrency(e.target.value as typeof currency)} className="bg-muted rounded-md px-2 py-1 text-xs" aria-label="Currency">
                  {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                </select>
                <select value={language} onChange={(e) => setLanguage(e.target.value as typeof language)} className="bg-muted rounded-md px-2 py-1 text-xs" aria-label="Language">
                  {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-3 px-3 border-t mt-2">
              {session ? (
                <>
                  <Link to="/account" className="flex-1" onClick={() => setMobileOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full rounded-lg gap-2"><User className="h-4 w-4" /> Account</Button>
                  </Link>
                  {showAdminPortal && (
                    <Link to="/admin" className="flex-1" onClick={() => setMobileOpen(false)}>
                      <Button variant="outline" size="sm" className="w-full rounded-lg">Dashboard</Button>
                    </Link>
                  )}
                  <Button size="sm" className="flex-1 rounded-lg gap-2" variant="destructive" onClick={() => { setMobileOpen(false); handleLogout(); }}>
                    <LogOut className="h-4 w-4" /> Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/signin" className="flex-1" onClick={() => setMobileOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full rounded-lg">Sign In</Button>
                  </Link>
                  <Link to="/register" className="flex-1" onClick={() => setMobileOpen(false)}>
                    <Button size="sm" className="w-full gradient-primary text-primary-foreground rounded-lg">Register</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
