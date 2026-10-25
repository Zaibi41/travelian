import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { SearchPageHero, SearchCard, SEARCH_PAGE_CONTAINER } from "@/components/public/SearchPageShell";
import { ProductTabs } from "@/components/public/ProductTabs";
import { SEO } from "@/components/SEO";
import { WhatsAppIcon } from "@/components/public/WhatsAppIcon";
import { UmrahPackages } from "@/components/public/umrah/UmrahPackages";
import { UmrahRequestForm } from "@/components/public/umrah/UmrahRequestForm";
import { UmrahHotels } from "@/components/public/umrah/UmrahHotels";
import { UmrahTransport } from "@/components/public/umrah/UmrahTransport";
import {
  UmrahCityPackages,
  UmrahFaqs,
  UmrahFinalCta,
  UmrahNotes,
  UmrahTierComparison,
} from "@/components/public/umrah/UmrahSections";
import { useAdmin } from "@/contexts/AdminStore";
import { isPublishedUmrahPackage } from "@/lib/package-availability";
import { whatsappUrl } from "@/lib/site-config";
import { makkahHotels, madinahHotels, umrahOffers } from "@/data/services/umrah";
import { packageToUmrahOffer } from "@/data/services/umrah-adapter";

export default function PublicPackagesPage() {
  const { packages } = useAdmin();

  const offers = useMemo(() => {
    const adminOffers = packages.filter(isPublishedUmrahPackage).map(packageToUmrahOffer);
    const seen = new Set(adminOffers.map((offer) => offer.id));
    return [...adminOffers, ...umrahOffers.filter((offer) => !seen.has(offer.id))];
  }, [packages]);

  return (
    <div>
      <SEO
        title="Umrah Packages from Pakistan | Travelian"
        description="Umrah packages from Lahore, Islamabad, Karachi, Multan and Sialkot with Makkah and Madinah hotels, transport and ziarat. Starting-from rates, custom packages on WhatsApp."
      />

      <SearchPageHero title="Plan Your Umrah with Travelian" description="Explore Umrah packages, flights and stay options with Travelian support.">
        <SearchCard>
          <ProductTabs active="umrah" />
        <div className="flex flex-col items-center justify-center gap-3 p-5 sm:flex-row sm:gap-4">
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-12 w-full rounded-xl border-primary/20 bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground sm:w-auto"
          >
            <a href="#custom-umrah">Request Custom Umrah</a>
          </Button>
          <Button asChild size="lg" className="h-12 w-full rounded-xl bg-whatsapp px-6 text-sm font-semibold text-whatsapp-foreground hover:bg-whatsapp-hover sm:w-auto">
            <a href={whatsappUrl("Assalam o Alaikum Travelian, I need help with an Umrah package.")} target="_blank" rel="noreferrer">
              <WhatsAppIcon className="mr-2 h-5 w-5" aria-hidden="true" /> Chat on WhatsApp
            </a>
          </Button>
        </div>
        </SearchCard>
      </SearchPageHero>

      <div className={`${SEARCH_PAGE_CONTAINER} space-y-10 py-8 md:py-10`}>
        <UmrahPackages offers={offers} />
        <UmrahTierComparison />
        <UmrahRequestForm />
        <UmrahCityPackages />
        <UmrahHotels
          id="makkah-hotels"
          eyebrow="Makkah stay"
          title="Makkah Hotels"
          description="Contracted Makkah hotels with distance from Haram, meal plan, shuttle service and starting-from room rates."
          hotels={makkahHotels}
        />
        <UmrahHotels
          id="madinah-hotels"
          eyebrow="Madinah stay"
          title="Madinah Hotels"
          description="Contracted Madinah hotels with distance from Masjid Nabawi, meal plan and starting-from room rates."
          hotels={madinahHotels}
        />
        <UmrahTransport />
        <UmrahNotes />
        <UmrahFaqs />
        <UmrahFinalCta />
      </div>
    </div>
  );
}
