import { Link } from "react-router-dom";
import { Plane, Mail, Phone, MapPin, Facebook, Instagram, Shield, Award, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const SUPPORT_PHONE = "+92 324 4440014";
const SUPPORT_PHONE_TEL = "+923244440014";
const SUPPORT_EMAIL = "travelian.pk@gmail.com";
const SUPPORT_ADDRESS = "Johar Town, Lahore";
const FACEBOOK_URL = "https://www.facebook.com/Travelian.pk/";
const INSTAGRAM_URL = "https://www.instagram.com/travelian.pk/";

export function PublicFooter() {
  const handleSubscribe = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") || "");
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }
    toast.success("Subscribed! Check your inbox for exclusive deals.");
    e.currentTarget.reset();
  };

  const scrollToTop = () => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const socials = [
    { Icon: Facebook, href: FACEBOOK_URL, label: "Travelian on Facebook" },
    { Icon: Instagram, href: INSTAGRAM_URL, label: "Travelian on Instagram" },
  ];

  return (
    <footer className="bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-lg font-bold font-display text-sidebar-accent-foreground">Get exclusive travel deals</h3>
              <p className="text-sm text-sidebar-muted mt-1">Subscribe and save up to 50% on your next booking</p>
            </div>
            <form onSubmit={handleSubscribe} className="flex gap-2 w-full md:w-auto">
              <Input name="email" type="email" placeholder="Enter your email" className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-muted md:w-72 rounded-xl" />
              <Button type="submit" className="gradient-gold text-gold-foreground shrink-0 rounded-xl font-semibold">Subscribe</Button>
            </form>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-1 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary">
                <Plane className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold font-display text-sidebar-accent-foreground">Travelian</span>
            </Link>
            <p className="text-sm text-sidebar-muted leading-relaxed mb-4">
              Your premium travel partner. Making journeys seamless and memorable since 2020.
            </p>
            <div className="flex gap-2">
              {socials.map(({ Icon, href, label }) => (
                <a key={href} href={href} target="_blank" rel="noreferrer" aria-label={label} className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-muted hover:text-sidebar-primary transition-colors">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sidebar-accent-foreground mb-4 text-sm">Products</h4>
            <ul className="space-y-2.5 text-sm text-sidebar-muted">
              <li><Link to="/" onClick={scrollToTop} className="hover:text-sidebar-primary transition-colors">Flights</Link></li>
              <li><Link to="/hotels-search" className="hover:text-sidebar-primary transition-colors">Hotels</Link></li>
              <li><Link to="/umrah-packages" className="hover:text-sidebar-primary transition-colors">Umrah Packages</Link></li>
              <li><Link to="/tour-packages" className="hover:text-sidebar-primary transition-colors">Tours</Link></li>
              <li><Link to="/visa-services" className="hover:text-sidebar-primary transition-colors">Visa Services</Link></li>
              <li><Link to="/deals" className="hover:text-sidebar-primary transition-colors">Deals</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sidebar-accent-foreground mb-4 text-sm">Company</h4>
            <ul className="space-y-2.5 text-sm text-sidebar-muted">
              <li><Link to="/about" className="hover:text-sidebar-primary transition-colors">About</Link></li>
              <li><Link to="/blog-public" className="hover:text-sidebar-primary transition-colors">Travel Guide Blog</Link></li>
              <li><Link to="/contact" className="hover:text-sidebar-primary transition-colors">Contact Us</Link></li>
              <li><Link to="/careers" className="hover:text-sidebar-primary transition-colors">Careers</Link></li>
              <li><Link to="/contact?type=agency" className="hover:text-sidebar-primary transition-colors">Become a Partner</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sidebar-accent-foreground mb-4 text-sm">Support</h4>
            <ul className="space-y-2.5 text-sm text-sidebar-muted">
              <li><Link to="/faq" className="hover:text-sidebar-primary transition-colors">Help Center / FAQ</Link></li>
              <li><Link to="/terms" className="hover:text-sidebar-primary transition-colors">Cancellation Policy</Link></li>
              <li><Link to="/terms" className="hover:text-sidebar-primary transition-colors">Refund Policy</Link></li>
              <li><Link to="/terms" className="hover:text-sidebar-primary transition-colors">Terms & Conditions</Link></li>
              <li><Link to="/privacy" className="hover:text-sidebar-primary transition-colors">Privacy Policy</Link></li>
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

        <div className="border-t border-sidebar-border mt-10 pt-8 space-y-6">
          <div className="flex flex-wrap items-center justify-center md:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-sidebar-muted">
              {["IATA Accredited", "DTS Accredited", "TAAP Member", "SSL Secure", "PCI-DSS", "Verified by Visa"].map((t) => (
                <span key={t} className="px-2.5 py-1 rounded-md border border-sidebar-border bg-sidebar-accent/40 font-semibold tracking-wide">
                  {t}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-6 text-xs text-sidebar-muted">
              <div className="flex items-center gap-1.5"><Shield className="h-4 w-4 text-gold" /> Secure Booking</div>
              <div className="flex items-center gap-1.5"><Award className="h-4 w-4 text-gold" /> Best Price</div>
              <div className="flex items-center gap-1.5"><Lock className="h-4 w-4 text-gold" /> SSL Encrypted</div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-sidebar-muted">© {new Date().getFullYear()} Travelian. All rights reserved.</p>
            <div className="flex items-center gap-3">
              <span className="text-xs text-sidebar-muted">We accept:</span>
              <div className="flex gap-2">
                {["Visa", "Mastercard", "Amex", "PayPal", "Stripe"].map((p) => (
                  <span key={p} className="px-2.5 py-1 bg-sidebar-accent rounded-md text-xs text-sidebar-muted font-medium">{p}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
