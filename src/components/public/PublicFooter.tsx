import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Facebook, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";

const SUPPORT_PHONE = "+92 324 4440014";
const SUPPORT_PHONE_TEL = "+923244440014";
const SUPPORT_EMAIL = "travelian.pk@gmail.com";
const SUPPORT_ADDRESS = "Johar Town, Lahore";

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
          <Button asChild className="gradient-gold text-gold-foreground shrink-0 rounded-xl font-semibold">
            <a href="https://wa.me/923244440014" target="_blank" rel="noreferrer">WhatsApp Support</a>
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" onClick={scrollToTop} className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white">
                <img src="/travelian-official-icon.png" alt="" className="h-9 w-9 object-cover" />
              </div>
              <span className="text-lg font-bold font-display text-sidebar-accent-foreground">Travelian</span>
            </Link>
            <p className="text-sm text-sidebar-muted leading-relaxed mb-4">Travel support for flights, hotels, Umrah packages, tours and visa services.</p>
            <div className="flex gap-2">
              <a href="https://www.facebook.com/Travelian.pk/" target="_blank" rel="noreferrer" aria-label="Travelian on Facebook" className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-muted hover:text-sidebar-primary"><Facebook className="h-4 w-4" /></a>
              <a href="https://www.instagram.com/travelian.pk/" target="_blank" rel="noreferrer" aria-label="Travelian on Instagram" className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-muted hover:text-sidebar-primary"><Instagram className="h-4 w-4" /></a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sidebar-accent-foreground mb-4 text-sm">Products</h4>
            <ul className="space-y-2.5 text-sm text-sidebar-muted">
              <li><Link to="/" onClick={scrollToTop} className="hover:text-sidebar-primary">Flights</Link></li>
              <li><Link to="/hotels-search" className="hover:text-sidebar-primary">Hotels</Link></li>
              <li><Link to="/umrah-packages" className="hover:text-sidebar-primary">Umrah Packages</Link></li>
              <li><Link to="/tour-packages" className="hover:text-sidebar-primary">Tours</Link></li>
              <li><Link to="/visa-services" className="hover:text-sidebar-primary">Visa Services</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sidebar-accent-foreground mb-4 text-sm">Company</h4>
            <ul className="space-y-2.5 text-sm text-sidebar-muted">
              <li><Link to="/about" className="hover:text-sidebar-primary">About</Link></li>
              <li><Link to="/blog-public" className="hover:text-sidebar-primary">Travel Guide Blog</Link></li>
              <li><Link to="/contact" className="hover:text-sidebar-primary">Contact Us</Link></li>
              <li><Link to="/careers" className="hover:text-sidebar-primary">Careers</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sidebar-accent-foreground mb-4 text-sm">Support</h4>
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
              <li className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0" /> <a href={`tel:${SUPPORT_PHONE_TEL}`} className="hover:text-sidebar-primary">{SUPPORT_PHONE}</a></li>
              <li className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0" /> <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-sidebar-primary">{SUPPORT_EMAIL}</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-sidebar-border mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-sidebar-muted">&copy; {new Date().getFullYear()} Travelian. All rights reserved.</p>
          <p className="text-xs text-sidebar-muted">{SUPPORT_ADDRESS}</p>
        </div>
      </div>
    </footer>
  );
}
