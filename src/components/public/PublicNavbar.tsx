import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, User, Phone, Globe, ChevronDown, LogOut, Plane, Hotel, FileCheck2, Palmtree, Building2 } from "lucide-react";
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

import { SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL, whatsappUrl } from "@/lib/site-config";

const productLinks = [
  { label: "Flights", href: "/", icon: Plane },
  { label: "Hotels", href: "/hotels-search", icon: Hotel },
  { label: "Umrah", href: "/umrah-packages", icon: Building2 },
  { label: "Visas", href: "/visa-services", icon: FileCheck2 },
  { label: "Tours", href: "/tour-packages", icon: Palmtree },
  { label: "About", href: "/about", icon: Info },
  { label: "Contact", href: "/contact", icon: MessageSquare },
];


const SUPPORT_PHONE = SUPPORT_PHONE_DISPLAY;
const WHATSAPP_URL = whatsappUrl("Hi, I need help with a Travelian booking.");

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

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    clearSession();
    toast.success("Signed out");
    if (session?.provider === "Cognito") {
      window.location.assign(cognitoLogoutUrl());
      return;
    }
    navigate("/");
  };

  const isActive = (href: string) => location.pathname === href;

  return (
    <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border/50">
      {/* Utility bar */}
      <div className="hidden md:block bg-muted/40 border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <a href={`tel:${SUPPORT_PHONE_TEL}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
              <Phone className="h-4 w-4" /> Support: <span className="font-bold text-foreground">{SUPPORT_PHONE}</span>
            </a>
            <span className="hidden xl:inline text-xs text-muted-foreground">Registered travel company · Transparent fare guidance</span>
          </div>
          <div className="flex items-center gap-1">
            <Link to="/request-booking" className="hidden xl:inline-flex px-2 py-1 rounded-md text-xs font-semibold text-muted-foreground hover:text-foreground">
              Request a booking
            </Link>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp-hover font-semibold shadow-sm transition-colors"
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

      {/* Main bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          <Link to="/" className="flex h-16 shrink-0 items-center" aria-label="Travelian home">
            <img src="/travelian-logo-wordmark.png" alt="Travelian" className="h-10 w-auto max-w-[11rem] object-contain sm:h-12 sm:max-w-[13rem]" />
          </Link>

          <div className="hidden lg:flex flex-1 items-center justify-center gap-0.5">
            {productLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  isActive(link.href)
                    ? "text-primary bg-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
                  More <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="z-[60] w-56 bg-popover">
                {moreLinks.map((l) => (
                  <DropdownMenuItem key={l.href} onClick={() => navigate(l.href)} className="text-sm">
                    {l.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="hidden lg:flex shrink-0 items-center gap-2">
            {session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 rounded-lg">
                    <User className="h-4 w-4" /> {(session.name || session.email || "Account").split(" ")[0]} <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[60] w-56 bg-popover">
                  <DropdownMenuLabel className="text-xs truncate max-w-[200px]">{session.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isSuperAdmin && <DropdownMenuItem onClick={() => navigate("/admin")}>Admin Dashboard</DropdownMenuItem>}
                  {isSuperAdmin && <DropdownMenuItem onClick={() => navigate("/admin/settings")}>Account Settings</DropdownMenuItem>}
                  {isAgency && <DropdownMenuItem onClick={() => navigate("/admin")}>Agency Dashboard</DropdownMenuItem>}
                  {isAgency && <DropdownMenuItem onClick={() => navigate("/admin/flight-bookings?tab=all")}>Agency Bookings</DropdownMenuItem>}
                  {isAgency && <DropdownMenuItem onClick={() => navigate("/admin/wallet")}>Wallet</DropdownMenuItem>}
                  {!showAdminPortal && <DropdownMenuItem onClick={() => navigate("/my-bookings")}>My Bookings</DropdownMenuItem>}
                  {!showAdminPortal && <DropdownMenuItem onClick={() => navigate("/account")}>My Account</DropdownMenuItem>}
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
                  <Button variant="ghost" size="sm" className="gap-2 rounded-lg font-semibold">
                    <User className="h-4 w-4" /> Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="gradient-primary text-primary-foreground rounded-lg font-semibold shadow-sm">Register</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile actions */}
          <div className="flex items-center gap-1 lg:hidden">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Chat on WhatsApp"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-whatsapp text-whatsapp-foreground"
            >
              <WhatsAppIcon className="h-4 w-4" />
            </a>
            <a
              href={`tel:${SUPPORT_PHONE_TEL}`}
              aria-label="Call Travelian support"
              className="flex h-9 w-9 items-center justify-center rounded-lg border text-foreground"
            >
              <Phone className="h-4 w-4" />
            </a>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg border"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t bg-card max-h-[calc(100dvh-4rem)] overflow-y-auto animate-fade-in">
          <div className="px-4 py-4 space-y-5">
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Book with Travelian</p>
              <div className="grid grid-cols-2 gap-2">
                {productLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ${
                      isActive(link.href) ? "border-primary/40 bg-accent text-primary" : "text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <link.icon className="h-4 w-4 text-primary" />
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Company & support</p>
              <div className="space-y-0.5">
                {moreLinks.map((l) => (
                  <Link
                    key={l.href}
                    to={l.href}
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>

            </div>

            <div className="grid grid-cols-2 gap-2">
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-whatsapp px-3 py-3 text-sm font-semibold text-whatsapp-foreground"
              >
                <WhatsAppIcon className="h-4 w-4" /> WhatsApp
              </a>
              <a
                href={`tel:${SUPPORT_PHONE_TEL}`}
                className="flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold text-foreground"
              >
                <Phone className="h-4 w-4" /> Call us
              </a>
            </div>

            <div className="flex items-center justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2.5">
              <span className="text-xs font-semibold text-muted-foreground">Currency & language</span>
              <div className="flex items-center gap-2">
                <select value={currency} onChange={(e) => setCurrency(e.target.value as typeof currency)} className="bg-card border rounded-md px-2 py-1.5 text-xs" aria-label="Currency">
                  {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                </select>
                <select value={language} onChange={(e) => setLanguage(e.target.value as typeof language)} className="bg-card border rounded-md px-2 py-1.5 text-xs" aria-label="Language">
                  {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-2 border-t pt-4">
              {session ? (
                <>
                  <Link to={showAdminPortal ? "/admin" : "/my-bookings"} className="flex-1" onClick={() => setMobileOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full rounded-lg gap-2">
                      <User className="h-4 w-4" /> {showAdminPortal ? "Dashboard" : "My Bookings"}
                    </Button>
                  </Link>
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
        </div>
      )}
    </nav>
  );
}
