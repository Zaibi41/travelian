import { ProductValuePills, TravelianTrustStrip } from "@/components/public/ProductTrust";
import { useSearchParams } from "react-router-dom";
import { UmrahSearchBar } from "@/components/public/umrah/UmrahSearchBar";
import { parseUmrahSearch, serializeUmrahSearch } from "@/lib/umrah-search";
import { useEffect, useMemo, useState } from "react";
import { SearchPageHero, SearchCard, SearchContent, SEARCH_PAGE_CONTAINER } from "@/components/public/SearchPageShell";
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
  const [params, setParams] = useSearchParams();
  const search = useMemo(() => parseUmrahSearch(params), [params]);
  const [draft, setDraft] = useState(search);
  useEffect(() => setDraft(search), [search]);

  const offers = useMemo(() => {
    const adminOffers = packages.filter(isPublishedUmrahPackage).map(packageToUmrahOffer);
    const seen = new Set(adminOffers.map((offer) => offer.id));
    return [...adminOffers, ...umrahOffers.filter((offer) => !seen.has(offer.id))];
  }, [packages]);

  const focusResults = () => requestAnimationFrame(() => {
    const results = document.getElementById("umrah-packages");
    results?.scrollIntoView({ behavior: "instant", block: "start" });
    results?.focus({ preventScroll: true });
  });

  return (
    <div>
      <SEO
        title="Umrah Packages from Pakistan | Travelian"
        description="Umrah packages from Lahore, Islamabad, Karachi, Multan and Sialkot with Makkah and Madinah hotels, transport and ziarat. Starting-from rates, custom packages on WhatsApp."
      />

      <SearchPageHero title={<><span className="sm:hidden">Umrah with Travelian</span><span className="hidden sm:inline">Plan Your Umrah with Travelian</span></>} description="Find your Umrah package." support={<ProductValuePills product="umrah" />}>
        <SearchCard>
          <ProductTabs active="umrah" />
          <SearchContent>
            <UmrahSearchBar offers={offers} value={draft} onChange={setDraft} onSearch={value => {
              setParams(serializeUmrahSearch(value));
              focusResults();
            }} />
            <a href={whatsappUrl("Assalam o Alaikum Travelian, I need help with an Umrah package.")} target="_blank" rel="noreferrer" className="absolute bottom-1 left-5 inline-flex min-h-11 items-center gap-2 rounded text-xs text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><WhatsAppIcon className="h-4 w-4" aria-hidden="true" />Need help? Chat on WhatsApp</a>
          </SearchContent>
        </SearchCard>
      </SearchPageHero>
      <TravelianTrustStrip />

      <div className={`${SEARCH_PAGE_CONTAINER} space-y-10 py-8 md:py-10`}>
        <UmrahPackages key={params.toString()} offers={offers} search={search} onResetSearch={() => { setParams(new URLSearchParams()); focusResults(); }} />
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
