import { Link } from "react-router-dom";
import { BriefcaseBusiness, Building2, CircleHelp, Facebook, Globe, Instagram, Mail, MapPin, Music2, Phone, Youtube } from "lucide-react";
import { SITE_DISPLAY, SITE_URL, SOCIAL_LINKS, SUPPORT_ADDRESS, SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL } from "@/lib/site-config";
import { PRODUCT_TABS } from "./product-navigation";

const socialIcons = { facebook: Facebook, instagram: Instagram, youtube: Youtube, tiktok: Music2 };
const navigationGroups = [
  { id: "products", title: "Products", icon: BriefcaseBusiness, links: PRODUCT_TABS.map(product => ({ label: product.label, href: product.href })) },
  { id: "company", title: "Company", icon: Building2, links: [{ label: "About", href: "/about" }, { label: "Contact", href: "/contact" }] },
  { id: "support", title: "Support & Policies", icon: CircleHelp, links: [
    { label: "FAQ", href: "/faq" },
    { label: "Terms & Conditions", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Refund / Cancellation Policy", href: "/terms" },
  ] },
];

export function PublicFooter() {
  const scrollToTop = () => {
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }));
  };
  return (
    <footer className="travelian-footer bg-sidebar text-sidebar-foreground">
      <div className="travelian-container py-10">
        <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-[1.25fr_.85fr_.65fr_1.05fr_1.25fr] lg:gap-6">
          <div className="min-w-0">
            <Link to="/" onClick={scrollToTop} aria-label="Travelian home" className="mb-4 inline-flex w-fit rounded bg-white p-1.5">
              <img src="/travelian-logo-wordmark.png" alt="Travelian" className="h-9 w-auto max-w-[9rem] object-contain" />
            </Link>
            <p className="mb-3 text-sm leading-relaxed text-sidebar-muted">Flights, group tickets, hotels and Umrah all in one Travelian platform.</p>
            <div aria-label="Travelian social profiles" className="flex gap-1">
              {SOCIAL_LINKS.map(social => {
                const Icon = socialIcons[social.id];
                return <a key={social.id} href={social.href} target="_blank" rel="noreferrer" aria-label={`Travelian on ${social.label}`} className="flex h-11 w-11 items-center justify-center rounded-full text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"><Icon className="h-4 w-4" aria-hidden="true" /></a>;
              })}
            </div>
          </div>

          {navigationGroups.map(group => (
            <nav key={group.id} aria-labelledby={`footer-${group.id}`} className="min-w-0">
              <h2 id={`footer-${group.id}`} className="mb-2 flex items-center gap-2 text-sm font-semibold text-sidebar-accent-foreground"><group.icon aria-hidden="true" className="h-4 w-4 shrink-0 text-sidebar-primary" />{group.title}</h2>
              <ul className={`text-sm ${group.id === "products" ? "font-medium text-sidebar-foreground" : "text-sidebar-muted"}`}>
                {group.links.map(link => <li key={link.label}><Link to={link.href} onClick={link.href === "/" ? scrollToTop : undefined} className="inline-flex min-h-11 items-center rounded-sm py-2 leading-5 transition-colors hover:text-sidebar-accent-foreground">{link.label}</Link></li>)}
              </ul>
            </nav>
          ))}

          <section aria-labelledby="footer-contact" className="min-w-0">
            <h2 id="footer-contact" className="mb-2 flex items-center gap-2 text-sm font-semibold text-sidebar-accent-foreground"><Phone aria-hidden="true" className="h-4 w-4 text-sidebar-primary" />Contact</h2>
            <ul className="text-sm text-sidebar-muted">
              <li className="flex min-h-11 items-start gap-2 py-2 leading-5"><MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-sidebar-primary" /><span>{SUPPORT_ADDRESS}</span></li>
              <li className="flex items-center gap-2"><Phone aria-hidden="true" className="h-4 w-4 shrink-0 text-sidebar-primary" /><a href={`tel:${SUPPORT_PHONE_TEL}`} className="inline-flex min-h-11 items-center rounded-sm hover:text-sidebar-accent-foreground">{SUPPORT_PHONE_DISPLAY}</a></li>
              <li className="flex items-center gap-2"><Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-sidebar-primary" /><a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex min-h-11 min-w-0 items-center break-all rounded-sm hover:text-sidebar-accent-foreground">{SUPPORT_EMAIL}</a></li>
              <li className="flex items-center gap-2"><Globe aria-hidden="true" className="h-4 w-4 shrink-0 text-sidebar-primary" /><a href={SITE_URL} className="inline-flex min-h-11 min-w-0 items-center break-all rounded-sm hover:text-sidebar-accent-foreground">{SITE_DISPLAY}</a></li>
            </ul>
          </section>
        </div>
        <div className="mt-7 border-t border-sidebar-border pt-5 pb-16 text-center md:pb-0">
          <p className="text-xs text-sidebar-muted">&copy; {new Date().getFullYear()} Travelian. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
