import { Link, useLocation } from "react-router-dom";
import { ChevronDown, Globe, Menu, Phone, X } from "lucide-react";
import { useState } from "react";
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
  { label: "Flights", href: "/", match: ["/", "/flights-search"] },
  { label: "Umrah", href: "/umrah-packages", match: ["/umrah-packages", "/umrah"] },
  { label: "Hotels", href: "/hotels-search", match: ["/hotels-search", "/hotel"] },
  { label: "About", href: "/about", match: ["/about"] },
  { label: "Contact", href: "/contact", match: ["/contact"] },
];

export function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const { currency, setCurrency, language, setLanguage } = useLocale();

  const isActive = (match: string[]) =>
    match.some((path) => (path === "/" ? pathname === "/" : pathname.startsWith(path)));

  return (
    <nav className="fixed inset-x-0 top-0 z-[1000] border-b border-border/60 bg-card shadow-sm backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex h-14 shrink-0 items-center" aria-label="Travelian home">
          <img
            src="/travelian-logo-wordmark.png"
            alt="Travelian"
            className="h-8 w-auto max-w-[10rem] object-contain sm:h-9 sm:max-w-[12rem]"
          />
        </Link>

        <div className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {serviceLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                isActive(link.match)
                  ? "bg-accent text-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden shrink-0 items-center gap-1 lg:flex">
          <a href={`tel:${SUPPORT_PHONE_TEL}`} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted/60 hover:text-foreground">
            <Phone className="h-3.5 w-3.5" />
            <span>{SUPPORT_PHONE_DISPLAY}</span>
          </a>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground">
                {currency} <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[1120] bg-popover">
              <DropdownMenuLabel className="text-xs">Currency</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {CURRENCIES.map((c) => (
                <DropdownMenuItem key={c.code} onClick={() => setCurrency(c.code)} className="text-xs">
                  <span className="w-10 font-semibold">{c.code}</span>
                  <span className="text-muted-foreground">{c.label}</span>
                  {currency === c.code && <span className="ml-auto text-primary">✓</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground">
                <Globe className="h-3.5 w-3.5" /> {language.toUpperCase()} <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[1120] bg-popover">
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

        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg border text-foreground lg:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t bg-card px-4 py-4 shadow-elevated lg:hidden">
          <div className="grid gap-2">
            {serviceLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMobileOpen(false)}
                className={`rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
                  isActive(link.match) ? "bg-accent text-primary" : "text-foreground hover:bg-muted/50"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="mt-4 border-t pt-4">
            <a href={`tel:${SUPPORT_PHONE_TEL}`} className="flex items-center justify-center gap-2 rounded-xl border border-primary bg-primary px-3 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 active:bg-primary/95">
              <Phone className="h-4 w-4" /> Call
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
