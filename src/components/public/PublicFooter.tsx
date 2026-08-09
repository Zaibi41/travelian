import { Link } from "react-router-dom";
import { BriefcaseBusiness, Building2, CircleHelp, Mail, MapPin, Phone, Facebook, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL, whatsappUrl } from "@/lib/site-config";

const SUPPORT_ADDRESS = "589-J2, Johar Town Lahore";

export function PublicFooter() {
  const scrollToTop = () => {
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  };

  return (
    <footer className="bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-lg font-bold font-display text-sidebar-accent-foreground">Need help planning your journey?</h3>
            <p className="text-sm text-sidebar-muted mt-1">Talk to the Travelian team for current fares, packages and travel support.</p>
          </div>
          <Button asChild className="bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp-hover shrink-0 rounded-xl font-semibold">
            <a href={whatsappUrl("Hi, I need help with a Travelian booking.")} target="_blank" rel="noreferrer">WhatsApp Support</a>
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" onClick={scrollToTop} className="mb-4 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white">
                <img src="/favicon.png" alt="" className="h-8 w-8 object-contain" />
              </span>
              <span className="text-lg font-bold font-display text-sidebar-accent-foreground">Travelian</span>
            </Link>
            <p className="text-sm text-sidebar-muted leading-relaxed mb-4">Travel support for flights, hotels, Umrah packages, tours and visa services.</p>
            <div className="flex gap-2">
              <a href="https://www.facebook.com/Travelian.pk/" target="_blank" rel="noreferrer" aria-label="Travelian on Facebook" className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-muted transition-all hover:-translate-y-0.5 hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"><Facebook className="h-4 w-4" /></a>
              <a href="https://www.instagram.com/travelian.pk/" target="_blank" rel="noreferrer" aria-label="Travelian on Instagram" className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-muted transition-all hover:-translate-y-0.5 hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"><Instagram className="h-4 w-4" /></a>
            </div>
          </div>

          <div>
            <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-sidebar-accent-foreground"><BriefcaseBusiness className="h-4 w-4 text-sidebar-primary" /> Products</h4>
            <ul className="space-y-2.5 text-sm text-sidebar-muted">
              <li><Link to="/" onClick={scrollToTop} className="hover:text-sidebar-primary">Flights</Link></li>
              <li><Link to="/hotels-search" className="hover:text-sidebar-primary">Hotels</Link></li>
              <li><Link to="/umrah-packages" className="hover:text-sidebar-primary">Umrah Packages</Link></li>
              <li><Link to="/tour-packages" className="hover:text-sidebar-primary">Tours</Link></li>
              <li><Link to="/visa-services" className="hover:text-sidebar-primary">Visa Services</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-sidebar-accent-foreground"><Building2 className="h-4 w-4 text-sidebar-primary" /> Company</h4>
            <ul className="space-y-2.5 text-sm text-sidebar-muted">
              <li><Link to="/about" className="hover:text-sidebar-primary">About</Link></li>
              
              <li><Link to="/contact" className="hover:text-sidebar-primary">Contact Us</Link></li>
              <li><Link to="/careers" className="hover:text-sidebar-primary">Careers</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-sidebar-accent-foreground"><CircleHelp className="h-4 w-4 text-sidebar-primary" /> Support</h4>
            <ul className="space-y-2.5 text-sm text-sidebar-muted">
              <li><Link to="/faq" className="hover:text-sidebar-primary">Help Center / FAQ</Link></li>
              <li><Link to="/terms" className="hover:text-sidebar-primary">Terms & Conditions</Link></li>
              <li><Link to="/privacy" className="hover:text-sidebar-primary">Privacy Policy</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sidebar-accent-foreground mb-4 text-sm">Contact</h4>
            <ul className="space-y-3 text-sm text-sidebar-muted">
              <li className="flex items-start gap-2"><MapPin className="h-4 w-4 shrink-0 mt-0.5" /> {SUPPORT_ADDRESS}</li>
              <li className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0" /> <a href={`tel:${SUPPORT_PHONE_TEL}`} className="hover:text-sidebar-primary">{SUPPORT_PHONE_DISPLAY}</a></li>
              <li className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0" /> <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-sidebar-primary">{SUPPORT_EMAIL}</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-sidebar-border mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 pb-16 md:pb-0 md:pr-20">
          <p className="text-xs text-sidebar-muted">&copy; {new Date().getFullYear()} Travelian. All rights reserved.</p>
          <p className="text-xs text-sidebar-muted">Registered travel company · Secure online payments · 24/7 human support</p>
        </div>
      </div>
    </footer>
  );
}
