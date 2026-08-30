import { Link } from "react-router-dom";
import { ChevronDown, Globe, Phone } from "lucide-react";
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

export function PublicNavbar() {
  const { currency, setCurrency, language, setLanguage } = useLocale();

  return (
    <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border/50">
      <div className="bg-muted/40 border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between gap-4 text-sm">
          <Link to="/" className="flex h-12 shrink-0 items-center" aria-label="Travelian home">
            <img
              src="/travelian-logo-wordmark.png"
              alt="Travelian"
              className="h-8 w-auto max-w-[10rem] object-contain sm:h-9 sm:max-w-[12rem]"
            />
          </Link>

          <div className="flex min-w-0 items-center gap-1 sm:gap-2">
            <div className="hidden items-center gap-4 md:flex">
              <a href={`tel:${SUPPORT_PHONE_TEL}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                <Phone className="h-4 w-4" /> Support: <span className="font-bold text-foreground">{SUPPORT_PHONE_DISPLAY}</span>
              </a>
              <span className="hidden xl:inline text-xs text-muted-foreground">Registered travel company · Transparent fare guidance</span>
            </div>

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
    </nav>
  );
}
