import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plane, Menu, X, Globe, User, Heart, Bell } from "lucide-react";
import { useState } from "react";

const navLinks = [
  { label: "Flights", href: "/flights-search" },
  { label: "Hotels", href: "/hotels-search" },
  { label: "Umrah", href: "/umrah-packages" },
  { label: "Tours", href: "/tour-packages" },
  { label: "Visa", href: "/visa-services" },
  { label: "Deals", href: "/deals" },
];

type PublicCurrency = "PKR" | "USD";

export function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currency, setCurrency] = useState<PublicCurrency>("PKR");
  const location = useLocation();

  return (
    <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border/50">
      {/* Top bar */}
      <div className="border-b border-border/30 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-8">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <button className="flex items-center gap-1 hover:text-foreground transition-colors">
              <Globe className="h-3 w-3" /> English
            </button>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1.5">
              {(["PKR", "USD"] as const).map((code, i) => (
                <span key={code} className="flex items-center gap-1.5">
                  {i > 0 ? <span className="text-border">|</span> : null}
                  <button
                    type="button"
                    onClick={() => setCurrency(code)}
                    className={`transition-colors ${
                      currency === code
                        ? "text-foreground font-medium"
                        : "hover:text-foreground text-muted-foreground"
                    }`}
                  >
                    {code === "PKR" ? "PKR Rs" : "USD $"}
                  </button>
                </span>
              ))}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link to="/about" className="hover:text-foreground transition-colors">About</Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">Support</Link>
            <Link to="/admin" className="hover:text-foreground transition-colors font-medium text-gold">Partner Portal</Link>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary shadow-sm">
              <Plane className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-extrabold font-display text-foreground tracking-tight">Travelian</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
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
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
              <Heart className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-gold rounded-full animate-pulse-gold" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Link to="/account">
              <Button variant="outline" size="sm" className="gap-2 rounded-lg">
                <User className="h-4 w-4" /> Sign In
              </Button>
            </Link>
            <Button size="sm" className="gradient-primary text-primary-foreground rounded-lg font-semibold">Register</Button>
          </div>

          <button className="lg:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
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
            <div className="flex gap-2 pt-3 px-3 border-t mt-2">
              <Link to="/account" className="flex-1">
                <Button variant="outline" size="sm" className="w-full rounded-lg">Sign In</Button>
              </Link>
              <Button size="sm" className="flex-1 gradient-primary text-primary-foreground rounded-lg">Register</Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
