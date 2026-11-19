import { SearchPageHero } from "@/components/public/SearchPageShell";
import { SearchTabs } from "@/components/public/SearchTabs";
import { SEO } from "@/components/SEO";
import { ProductValuePills, TravelianTrustStrip } from "@/components/public/ProductTrust";
import { HomeWhyBook } from "@/components/public/HomeWhyBook";
import { HomeSupplierNetwork } from "@/components/public/HomeSupplierNetwork";
import { HomeTopRoutes } from "@/components/public/HomeTopRoutes";
import { HomeHowItWorks } from "@/components/public/HomeHowItWorks";
import { HomePopularLinks } from "@/components/public/HomePopularLinks";
import { HomeFaq } from "@/components/public/HomeFaq";
import { HomeSupportCta } from "@/components/public/HomeSupportCta";
import { useSiteSwitches } from "@/lib/site-switches";

export default function HomePage() {
  const { umrah } = useSiteSwitches(); // D39: Umrah wording only when Umrah is switched on
  return (
    <div>
      <SEO
        title={umrah ? "Travelian | Flights, Group Tickets, Hotels & Umrah" : "Travelian | Flights, Group Tickets & Hotels"}
        description={umrah ? "Search flights and group tickets, hotels and Umrah packages with Travelian." : "Search flights, group tickets and hotels with Travelian."}
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
      <SearchPageHero title={<><span className="text-xl sm:hidden">Book travel with Travelian</span><span className="hidden sm:inline sm:text-2xl md:text-[1.75rem]">{umrah ? "Book Flights, Group Tickets, Hotels & Umrah" : "Book Flights, Group Tickets & Hotels"}</span></>} support={<ProductValuePills product="flights" />}>
        <div className="home-search"><SearchTabs /></div>
      </SearchPageHero>

      <TravelianTrustStrip />

      <HomeTopRoutes />
      <HomeWhyBook />
      <HomeHowItWorks />
      <HomeSupplierNetwork />
      <HomePopularLinks />
      <HomeFaq />
      <HomeSupportCta />
    </div>
  );
}



