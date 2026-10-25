import { Link } from "react-router-dom";
import { BriefcaseBusiness, Building2, CircleHelp, Facebook, Globe, Instagram, Mail, MapPin, Music2, Phone, Youtube } from "lucide-react";
import { SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL } from "@/lib/site-config";

const SUPPORT_ADDRESS = "589-J2, Johar Town Lahore";

export function PublicFooter() {
  const scrollToTop = () => {
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  };

  return (
    <footer className="bg-sidebar text-sidebar-foreground">
      <div className="travelian-container py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" onClick={scrollToTop} className="mb-4 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white">
                <img src="/favicon.png" alt="" className="h-8 w-8 object-contain" />
              </span>
              <span className="text-lg font-bold font-display text-sidebar-accent-foreground">Travelian</span>
            </Link>
            <p className="text-sm text-sidebar-muted leading-relaxed mb-4">Travel support for flights, hotels and Umrah packages.</p>
            <div className="flex gap-2">
              <a href="https://www.facebook.com/Travelian.pk/" target="_blank" rel="noreferrer" aria-label="Travelian on Facebook" className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-muted transition-all hover:-translate-y-0.5 hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"><Facebook className="h-4 w-4" /></a>
              <a href="https://www.instagram.com/travelian.pk/" target="_blank" rel="noreferrer" aria-label="Travelian on Instagram" className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-muted transition-all hover:-translate-y-0.5 hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"><Instagram className="h-4 w-4" /></a>
              <a href="https://www.youtube.com/@Travelianpk" target="_blank" rel="noreferrer" aria-label="Travelian on YouTube" className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-muted transition-all hover:-translate-y-0.5 hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"><Youtube className="h-4 w-4" /></a>
              <a href="https://www.tiktok.com/@travelian.pk" target="_blank" rel="noreferrer" aria-label="Travelian on TikTok" className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-muted transition-all hover:-translate-y-0.5 hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"><Music2 className="h-4 w-4" /></a>
            </div>
          </div>

          <div>
            <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-sidebar-accent-foreground"><BriefcaseBusiness className="h-4 w-4 text-sidebar-primary" /> Services</h4>
            <ul className="space-y-2.5 text-sm text-sidebar-muted">
              <li><Link to="/" onClick={scrollToTop} className="hover:text-sidebar-primary">Flights</Link></li>
              <li><Link to="/hotels-search" className="hover:text-sidebar-primary">Hotels</Link></li>
              <li><Link to="/umrah-packages" className="hover:text-sidebar-primary">Umrah Packages</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-sidebar-accent-foreground"><Building2 className="h-4 w-4 text-sidebar-primary" /> Company</h4>
            <ul className="space-y-2.5 text-sm text-sidebar-muted">
              <li><Link to="/about" className="hover:text-sidebar-primary">About</Link></li>
              
              <li><Link to="/contact" className="hover:text-sidebar-primary">Contact Us</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-sidebar-accent-foreground"><CircleHelp className="h-4 w-4 text-sidebar-primary" /> Support</h4>
            <ul className="space-y-2.5 text-sm text-sidebar-muted">
              <li><Link to="/faq" className="hover:text-sidebar-primary">FAQ</Link></li>
              <li><Link to="/terms" className="hover:text-sidebar-primary">Terms & Conditions</Link></li>
              <li><Link to="/privacy" className="hover:text-sidebar-primary">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-sidebar-primary">Refund/Cancellation Policy</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-sidebar-accent-foreground"><Phone className="h-4 w-4 text-sidebar-primary" /> Contact</h4>
            <ul className="space-y-3 text-sm text-sidebar-muted">
              <li className="flex items-start gap-2"><MapPin className="h-4 w-4 shrink-0 mt-0.5 text-sidebar-primary" /> {SUPPORT_ADDRESS}</li>
              <li className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0 text-sidebar-primary" /> <a href={`tel:${SUPPORT_PHONE_TEL}`} className="hover:text-sidebar-primary">{SUPPORT_PHONE_DISPLAY}</a></li>
              <li className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0 text-sidebar-primary" /> <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-sidebar-primary">{SUPPORT_EMAIL}</a></li>
              <li className="flex items-center gap-2"><Globe className="h-4 w-4 shrink-0 text-sidebar-primary" /> <a href="https://www.travelian.pk" className="hover:text-sidebar-primary">www.travelian.pk</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-sidebar-border mt-10 pt-6 flex items-center justify-center pb-16 text-center md:pb-0">
          <p className="text-xs text-sidebar-muted">&copy; {new Date().getFullYear()} Travelian. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
