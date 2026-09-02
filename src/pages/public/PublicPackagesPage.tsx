import { useMemo } from "react";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/public/PageHeader";
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
  UmrahVisaRates,
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
        description="Umrah packages from Lahore, Islamabad, Karachi, Multan and Sialkot with Makkah and Madinah hotels, visa, transport and ziarat. Starting-from rates, custom packages on WhatsApp."
      />

      <PageHeader
        eyebrow="Umrah with Travelian"
        title="Focus on your pilgrimage. We’ll take care of the journey."
        titleClassName="mx-auto max-w-[46rem] text-balance text-[2rem] font-black font-display leading-tight tracking-tight text-primary-foreground"
        icon={<Building2 className="h-6 w-6" aria-hidden="true" />}
      >
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-12 w-full rounded-xl border-white/25 bg-primary/90 px-6 text-base font-bold text-primary-foreground hover:bg-primary hover:text-primary-foreground sm:w-auto"
          >
            <a href="#custom-umrah">Request Custom Umrah</a>
          </Button>
          <a
            className="w-full sm:w-auto"
            href={whatsappUrl("Assalam o Alaikum Travelian, I need help with an Umrah package.")}
            target="_blank"
            rel="noreferrer"
          >
            <Button
              size="lg"
              className="h-12 w-full rounded-xl bg-whatsapp px-6 text-base font-bold text-whatsapp-foreground hover:bg-whatsapp-hover sm:w-auto"
            >
              <WhatsAppIcon className="mr-2 h-5 w-5" aria-hidden="true" /> Chat on WhatsApp
            </Button>
          </a>
        </div>
      </PageHeader>

      <div className="mx-auto max-w-7xl space-y-14 px-4 py-12 sm:px-6 lg:px-8">
        <UmrahPackages offers={offers} />
        <UmrahTierComparison />
        <UmrahRequestForm />
        <UmrahCityPackages />
        <UmrahVisaRates />
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
