import { Link } from "react-router-dom";
import { Plane, Mail, Phone, MapPin } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="bg-sidebar text-sidebar-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
                <Plane className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold font-display text-sidebar-accent-foreground">Travelian</span>
            </div>
            <p className="text-sm text-sidebar-muted leading-relaxed">
              Your trusted travel partner for Umrah, tours, flights, and visa services. Making your journey seamless and memorable.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-sidebar-accent-foreground mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-sidebar-muted">
              <li><Link to="/umrah-packages" className="hover:text-sidebar-primary transition-colors">Umrah Packages</Link></li>
              <li><Link to="/tour-packages" className="hover:text-sidebar-primary transition-colors">Tour Packages</Link></li>
              <li><Link to="/hotels-search" className="hover:text-sidebar-primary transition-colors">Hotels</Link></li>
              <li><Link to="/flights-search" className="hover:text-sidebar-primary transition-colors">Flights</Link></li>
              <li><Link to="/visa-services" className="hover:text-sidebar-primary transition-colors">Visa Services</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sidebar-accent-foreground mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-sidebar-muted">
              <li><Link to="/about" className="hover:text-sidebar-primary transition-colors">About Us</Link></li>
              <li><Link to="/blog-public" className="hover:text-sidebar-primary transition-colors">Blog</Link></li>
              <li><Link to="/contact" className="hover:text-sidebar-primary transition-colors">Contact Us</Link></li>
              <li><a href="#" className="hover:text-sidebar-primary transition-colors">Terms & Conditions</a></li>
              <li><a href="#" className="hover:text-sidebar-primary transition-colors">Privacy Policy</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sidebar-accent-foreground mb-4">Contact Info</h4>
            <ul className="space-y-3 text-sm text-sidebar-muted">
              <li className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0" /> Lahore, Pakistan</li>
              <li className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0" /> +92-300-1234567</li>
              <li className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0" /> info@travelian.com</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-sidebar-border mt-8 pt-8 text-center text-sm text-sidebar-muted">
          © {new Date().getFullYear()} Travelian. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
