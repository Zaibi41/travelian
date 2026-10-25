import { SearchPageHero } from "@/components/public/SearchPageShell";
import { SearchTabs } from "@/components/public/SearchTabs";
import { SEO } from "@/components/SEO";
import { BadgeCheck, Globe, Headphones, Shield } from "lucide-react";
import { HomeWhyBook } from "@/components/public/HomeWhyBook";
import { HomeSupplierNetwork } from "@/components/public/HomeSupplierNetwork";
import { HomeTopRoutes } from "@/components/public/HomeTopRoutes";
import { HomeHowItWorks } from "@/components/public/HomeHowItWorks";
import { HomePopularLinks } from "@/components/public/HomePopularLinks";
import { HomeFaq } from "@/components/public/HomeFaq";
import { HomeSupportCta } from "@/components/public/HomeSupportCta";

const heroBadges = [
  { icon: Shield, label: "Secure payments" },
  { icon: Headphones, label: "WhatsApp booking support" },
  { icon: Globe, label: "B2B & B2C travel platform" },
  { icon: BadgeCheck, label: "Transparent fare guidance" },
];

const features = [
  { icon: BadgeCheck, title: "Registered travel company", desc: "Operating from Johar Town, Lahore" },
  { icon: Shield, title: "Secure payment options", desc: "Confirmed bookings with written details" },
  { icon: Headphones, title: "WhatsApp & office support", desc: "Talk to a real travel consultant" },
  { icon: Globe, title: "B2B agent solutions", desc: "Tools and support for partner agencies" },
];


export default function HomePage() {
  return (
    <div>
      <SEO
        title="Travelian | Flights, Umrah & Hotels"
        description="Search available flights and browse Travelian hotels and Umrah packages."
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Travelian",
            url: "https://travelian.pk",
            logo: "https://travelian.pk/travelian-logo-wordmark.png",
            sameAs: [
              "https://www.facebook.com/Travelian.pk/",
              "https://www.instagram.com/travelian.pk/",
            ],
            contactPoint: {
              "@type": "ContactPoint",
              telephone: "+92-324-4440014",
              contactType: "customer support",
              areaServed: "PK",
              availableLanguage: ["English", "Urdu", "Arabic"],
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Travelian",
            url: "https://travelian.pk",
            potentialAction: {
              "@type": "SearchAction",
              target: "https://travelian.pk/flights-search?from={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          },
        ]}
      />
      <SearchPageHero title="Book Flights, Umrah & Hotels with Travelian" support={
          <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
            {heroBadges.map((b) => (
              <span
                key={b.label}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1.5 text-[11px] md:px-3.5 md:py-2 md:text-xs font-semibold text-primary-foreground/85 ring-1 ring-white/12 backdrop-blur"
              >
                <b.icon className="h-3.5 w-3.5 text-gold" />
                {b.label}
              </span>
            ))}
          </div>
      }>
        <SearchTabs visibleTabIds={["flights", "group-ticketing", "hotels", "umrah"]} />
      </SearchPageHero>

      {/* Trust Bar */}
      <section className="py-6 bg-card border-b">
        <div className="travelian-container ">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">

            {features.map((f) => (
              <div key={f.title} className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-muted/40">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-gold-light flex items-center justify-center">
                  <f.icon className="h-5 w-5 text-gold" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{f.title}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <HomeWhyBook />
      <HomeSupplierNetwork />
      <HomeTopRoutes />
      <HomeHowItWorks />
      <HomePopularLinks />
      <HomeFaq />
      <HomeSupportCta />
    </div>
  );
}



