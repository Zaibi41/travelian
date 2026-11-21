import { loadSiteLogo } from "@/lib/public-booking";
import { PRODUCT_TABS, useProductTabs } from "./product-navigation";
import { useSearchHeaderState } from "@/hooks/use-scroll-reveal";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, Globe, Menu, Phone, X, Info } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CURRENCIES, LANGUAGES, useLocale } from "@/contexts/LocaleContext";
import { SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL, whatsappUrl } from "@/lib/site-config";

const quickLinks = [
  { label: "About Us", href: "/about", icon: Info, match: ["/about"] },
];

function LocaleControls({ compact = false }: { compact?: boolean }) {
  const { currency, setCurrency, language, setLanguage } = useLocale();
  const triggerClass = `flex items-center gap-1 rounded-md px-2 font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground ${compact ? "h-8 text-xs" : "h-11 text-sm"}`;
  const menuClass = "z-[1120] max-h-[min(24rem,70dvh)] overflow-y-auto rounded-lg bg-popover p-1 shadow-sm";
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label={`${currency} — Select currency`} className={triggerClass}>
            {currency} <ChevronDown className="h-3 w-3" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={6} collisionPadding={12} className={menuClass}>
          <DropdownMenuLabel className="text-xs">Currency</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {CURRENCIES.map((item) => (
            <DropdownMenuItem key={item.code} onClick={() => setCurrency(item.code)} className="gap-2 text-sm">
              <span className="w-9 font-medium">{item.code}</span>
              <span className="text-muted-foreground">{item.label}</span>
              {currency === item.code && <span className="ml-auto text-primary">✓</span>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label={`${language.toUpperCase()} — Select language`} className={triggerClass}>
            <Globe className="h-3.5 w-3.5" aria-hidden="true" /> {language.toUpperCase()}
            <ChevronDown className="h-3 w-3" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={6} collisionPadding={12} className={menuClass}>
          <DropdownMenuLabel className="text-xs">Language</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {LANGUAGES.map((item) => (
            <DropdownMenuItem key={item.code} onClick={() => setLanguage(item.code)} className="gap-2 text-sm">
              <span>{item.label}</span>
              <span className="text-muted-foreground">{item.native}</span>
              {language === item.code && <span className="ml-auto text-primary">✓</span>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export function PublicNavbar() {
  const serviceLinks = useProductTabs(); // Umrah only when switched on (D39)
  // Website & CMS > Site logo (S3, D38); the built-in logo until one is uploaded or if it can't be loaded.
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  useEffect(() => { void loadSiteLogo().then(setLogoUrl); }, []);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const observedHeaderState = useSearchHeaderState({ pageKey: pathname, headerRef });
  const headerState = pathname === "/flights-search" ? "sticky" : observedHeaderState;
  const compact = headerState !== "top";
  const hidden = headerState === "search";

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (hidden) setMobileOpen(false);
  }, [hidden]);

  useEffect(() => {
    if (!mobileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      // Let the existing dropdown handle Escape before closing the mobile menu.
      if (event.key === "Escape" && !document.querySelector('[role="menu"]')) {
        setMobileOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (!navRef.current?.contains(target) && !target.closest('[role="menu"]')) setMobileOpen(false);
    };
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (desktop.matches) setMobileOpen(false); };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsideClick);
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      desktop.removeEventListener("change", closeOnDesktop);
    };
  }, [mobileOpen]);

  const renderLinks = (links: Array<Pick<(typeof PRODUCT_TABS)[number], "label" | "href" | "icon" | "match">>, mobile = false) => links
    .map((link) => {
      const active = link.match.some((path) => path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`));
      const className = `${mobile ? "min-h-11 px-3 py-3" : "px-3 py-2"} inline-flex items-center gap-2 rounded-lg whitespace-nowrap text-sm font-semibold transition-colors ${active ? "bg-accent text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`;
      return <Link key={link.href} to={link.href} onClick={() => setMobileOpen(false)} aria-current={active ? "page" : undefined} className={className}>{mobile && <link.icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />}<span>{link.label}</span></Link>;
    });

  const requestBookingLink = <a href={whatsappUrl("Assalam o Alaikum Travelian, I would like to request a booking.")} target="_blank" rel="noreferrer" onClick={() => setMobileOpen(false)} className="inline-flex min-h-11 items-center rounded px-2 text-sm font-medium text-primary hover:bg-accent lg:min-h-0 lg:h-8 lg:text-xs">Request a Booking</a>;

  const phoneLink = (
    <a href={`tel:${SUPPORT_PHONE_TEL}`} className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted/60 hover:text-foreground lg:min-h-0 lg:h-8 lg:text-xs">
      <Phone className="h-3.5 w-3.5" aria-hidden="true" /> {SUPPORT_PHONE_DISPLAY}
    </a>
  );
  const signInActive = pathname === "/signin";
  const signInLink = (
    <Link to="/signin" onClick={() => setMobileOpen(false)} aria-current={signInActive ? "page" : undefined} className={cn("inline-flex h-11 items-center justify-center whitespace-nowrap rounded-md px-3 text-sm font-semibold transition-colors lg:h-8 lg:text-xs", signInActive ? "bg-accent text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground")}>
      Sign In
    </Link>
  );

  return (
    <header ref={headerRef} aria-label="Travelian header" className="relative h-[57px] shrink-0">
      <div ref={element => { navRef.current = element; if (element) element.inert = hidden; }} aria-hidden={hidden} data-header-state={headerState} className={cn("travelian-navbar inset-x-0 top-0 z-[1000] border-b border-border/60 bg-card shadow-sm backdrop-blur-md transition-[transform,opacity,visibility] duration-200 motion-reduce:transition-none [&_a]:focus-visible:ring-2 [&_a]:focus-visible:ring-primary [&_a]:focus-visible:ring-offset-2 [&_button]:focus-visible:ring-2 [&_button]:focus-visible:ring-primary [&_button]:focus-visible:ring-offset-2", headerState === "sticky" ? "fixed" : "absolute", hidden ? "invisible pointer-events-none -translate-y-full opacity-0" : "visible translate-y-0 opacity-100", headerState === "sticky" && "shadow-sm")}>
        <div className="travelian-container relative">
          <nav aria-label="Main navigation">
            <div className={cn("flex items-center gap-4 transition-[height] duration-200 motion-reduce:transition-none lg:grid lg:grid-cols-[1fr_auto_1fr]", "h-14")}>
              <Link to="/" onClick={() => setMobileOpen(false)} className="flex w-fit shrink-0 items-center justify-self-start" aria-label="Travelian home">
                <img src={logoUrl ?? "/travelian-logo-wordmark.png"} alt="Travelian" width={576} height={164} fetchPriority="high" className={cn("h-8 w-auto max-w-[10rem] object-contain mix-blend-multiply sm:h-9 sm:max-w-[12rem]")} />
              </Link>
              <div className="hidden h-full items-center justify-center gap-1 lg:flex">{headerState === "sticky" && renderLinks(serviceLinks)}</div>
              <div aria-hidden="true" className="hidden lg:block" />
              <button ref={menuButtonRef} type="button" className="ml-auto flex h-11 w-11 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted/60 lg:hidden" aria-label={mobileOpen ? "Close menu" : "Open menu"} aria-expanded={mobileOpen} aria-controls="mobile-navigation" onClick={() => setMobileOpen(open => !open)}>
                {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
              </button>
            </div>
            {mobileOpen && (
              <div id="mobile-navigation" className="max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-t border-border bg-card py-4 lg:hidden">
                <section aria-label="Services">
                  <h2 className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Services</h2>
                  <div className="grid gap-1">{renderLinks(serviceLinks, true)}</div>
                </section>
                <section aria-label="Quick Links" className="mt-3 border-t border-border pt-3">
                  <h2 className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick Links</h2>
                  <div className="grid gap-1">{renderLinks(quickLinks, true)}</div>
                </section>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">{requestBookingLink}{signInLink}</div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3"><div className="flex flex-wrap items-center gap-1">{phoneLink}</div><div className="flex items-center gap-1"><LocaleControls key={hidden ? "hidden" : "visible"} /></div></div>
              </div>
            )}
          </nav>
          <div aria-label="Account and preferences" className="absolute right-5 top-1/2 hidden h-8 -translate-y-1/2 items-center gap-1 sm:right-6 lg:right-8 lg:flex">
            <div className={compact ? pathname === "/flights-search" ? "hidden xl:block" : "hidden" : "block"}>{phoneLink}</div>
            <LocaleControls key={hidden ? "hidden" : "visible"} compact />
            {signInLink}
          </div>
        </div>
      </div>
    </header>
  );
}
