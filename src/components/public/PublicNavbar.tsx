import { UmrahIcon } from "./icons/UmrahIcon";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, Globe, Hotel, Menu, Phone, Plane, Users, X } from "lucide-react";
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
import { SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL } from "@/lib/site-config";

const serviceLinks = [
  { label: "Flights", icon: Plane, href: "/", match: ["/", "/flights-search"] },
  { label: "Group Ticketing", icon: Users, href: "/group-ticketing", match: ["/group-ticketing"] },
  { label: "Hotels", icon: Hotel, href: "/hotels-search", match: ["/hotels-search", "/hotel"] },
  { label: "Umrah", icon: UmrahIcon, href: "/umrah-packages", match: ["/umrah-packages", "/umrah"] },
];

function LocaleControls({ compact = false }: { compact?: boolean }) {
  const { currency, setCurrency, language, setLanguage } = useLocale();
  const triggerClass = `flex items-center gap-1.5 rounded px-2 font-medium text-primary transition-colors hover:bg-accent ${compact ? "h-8 text-xs" : "h-11 text-sm"}`;
  const menuClass = "z-[1120] max-h-[min(24rem,70dvh)] overflow-y-auto rounded-lg bg-popover p-1 shadow-sm";
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label="Select currency" className={triggerClass}>
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
          <button type="button" aria-label="Select language" className={triggerClass}>
            <Globe className="h-4 w-4" aria-hidden="true" /> {language.toUpperCase()}
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();
  const visible = useScrollReveal({ pageKey: pathname, scrollContainerSelector: "[data-public-page-scroll]" });

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!visible) setMobileOpen(false);
  }, [visible]);

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

  const renderLinks = (mobile = false) => serviceLinks
    .map((link) => {
      const active = link.match.some((path) => path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`));
      const className = `${mobile ? "min-h-11 px-3 py-3" : "h-16 px-1"} inline-flex items-center gap-2 rounded-sm relative whitespace-nowrap text-[15px] font-medium transition-colors hover:text-primary ${active ? "text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary" : "text-primary/70"}`;
      return <Link key={link.href} to={link.href} onClick={() => setMobileOpen(false)} aria-current={active ? "page" : undefined} className={className}><link.icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" /><span>{link.label}</span></Link>;
    });

  const phoneLink = (
    <a href={`tel:${SUPPORT_PHONE_TEL}`} className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-lg px-2 text-sm font-medium text-primary hover:bg-accent/60 lg:min-h-0 lg:h-8 lg:text-xs">
      <Phone className="h-4 w-4" aria-hidden="true" /> {SUPPORT_PHONE_DISPLAY}
    </a>
  );
  const signInLink = (
    <Link to="/signin" onClick={() => setMobileOpen(false)} className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded px-3 text-sm font-medium text-primary transition-colors hover:bg-accent lg:h-8 lg:text-xs">
      Sign In
    </Link>
  );

  return (
    <nav ref={element => { navRef.current = element; if (element) element.inert = !visible; }} aria-hidden={!visible} aria-label="Main navigation" className={cn("travelian-navbar fixed inset-x-0 top-0 z-[1000] shadow-sm transition-[transform,opacity,visibility] duration-200 ease-out motion-reduce:transition-none border-b border-border/70 bg-white [&_a]:focus-visible:ring-2 [&_a]:focus-visible:ring-primary [&_a]:focus-visible:ring-offset-2 [&_button]:focus-visible:ring-2 [&_button]:focus-visible:ring-primary [&_button]:focus-visible:ring-offset-2", visible ? "visible translate-y-0 opacity-100" : "invisible pointer-events-none -translate-y-full opacity-0")}>
      <div className="travelian-container flex h-16 items-center gap-4 lg:grid lg:grid-cols-[auto_minmax(0,1fr)_auto] xl:grid-cols-[1fr_auto_1fr]">
        <Link to="/" onClick={() => setMobileOpen(false)} className="flex w-fit shrink-0 items-center justify-self-start" aria-label="Travelian home">
          <img src="/travelian-logo-wordmark.png" alt="Travelian" className="h-9 w-auto max-w-[8rem] object-contain" />
        </Link>
        <div className="hidden items-center justify-center gap-4 lg:flex xl:gap-6">{renderLinks()}</div>
        <div aria-label="Account and preferences" className="hidden items-center justify-self-end gap-1 lg:flex">
          {phoneLink}
          <LocaleControls key={visible ? "visible" : "hidden"} compact />
          {signInLink}
        </div>
        <button ref={menuButtonRef} type="button" className="ml-auto flex h-11 w-11 items-center justify-center rounded-lg text-primary hover:bg-accent lg:hidden" aria-label={mobileOpen ? "Close menu" : "Open menu"} aria-expanded={mobileOpen} aria-controls="mobile-navigation" onClick={() => setMobileOpen((open) => !open)}>
          {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>
      {mobileOpen && visible && (
        <div id="mobile-navigation" className="travelian-container max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-border bg-white py-3 lg:hidden">
          <div className="grid gap-1">{renderLinks(true)}</div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
            {signInLink}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            {phoneLink}
            <div className="flex items-center gap-1"><LocaleControls key={visible ? "visible" : "hidden"} /></div>
          </div>
        </div>
      )}
    </nav>
  );
}
