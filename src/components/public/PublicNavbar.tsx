import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plane, Menu, X, User } from "lucide-react";
import { useState } from "react";

const navLinks = [
  { label: "Flights", href: "/" },
  { label: "Hotels", href: "/hotels-search" },
  { label: "Umrah", href: "/umrah-packages" },
  { label: "Tours", href: "/tour-packages" },
  { label: "Visa", href: "/visa-services" },
  { label: "Deals", href: "/deals" },
  { label: "About Travelian", href: "/about" },
];

export function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary shadow-sm">
              <Plane className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-extrabold font-display text-foreground tracking-tight">Travelian</span>
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
            <Link to="/signin">
              <Button variant="outline" size="sm" className="gap-2 rounded-lg">
                <User className="h-4 w-4" /> Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="gradient-primary text-primary-foreground rounded-lg font-semibold">Register</Button>
            </Link>
          </div>

          <button className="lg:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
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
              <Link to="/signin" className="flex-1" onClick={() => setMobileOpen(false)}>
                <Button variant="outline" size="sm" className="w-full rounded-lg">Sign In</Button>
              </Link>
              <Link to="/register" className="flex-1" onClick={() => setMobileOpen(false)}>
                <Button size="sm" className="w-full gradient-primary text-primary-foreground rounded-lg">Register</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
