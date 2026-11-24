import { Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/public/WhatsAppIcon";
import { SUPPORT_PHONE_TEL, whatsappUrl } from "@/lib/site-config";
import { useSiteSwitches } from "@/lib/site-switches";

export function HomeSupportCta() {
  const { umrah } = useSiteSwitches(); // D39: Umrah wording only when Umrah is switched on
  return (
    <section className="py-6 md:py-9">
      <div className="travelian-container ">
        <div className="relative isolate overflow-hidden rounded-3xl gradient-hero p-6 shadow-elevated md:p-8">
          <div className="absolute inset-x-0 top-0 h-1 gradient-gold" aria-hidden="true" />
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-teal/20 blur-3xl" aria-hidden="true" />
          <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-gold-on-dark ring-1 ring-white/15">
                <MessageCircle className="h-3 w-3" /> Travel support
              </span>
              <h2 className="mt-4 text-xl md:text-2xl font-bold font-display tracking-tight text-primary-foreground">
                Need help planning your journey?
              </h2>
              <p className="mt-2 text-sm md:text-base leading-7 text-primary-foreground">
                {umrah ? "Talk to our travel team for flights, Umrah and hotels." : "Talk to our travel team for flights and hotels."}
              </p>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row">
              <Button asChild size="lg" className="rounded-xl bg-whatsapp font-semibold text-whatsapp-foreground hover:bg-whatsapp-hover">
                <a href={whatsappUrl("Hi, I need help choosing a Travelian service.")} target="_blank" rel="noreferrer">
                  <WhatsAppIcon className="mr-2 h-5 w-5" /> WhatsApp Us
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-xl border-primary bg-primary font-semibold text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/95 sm:border-white/25 sm:bg-white/5 sm:hover:bg-white/10"
              >
                <a href={`tel:${SUPPORT_PHONE_TEL}`}>
                  <Phone className="mr-2 h-4 w-4" /> Call Travelian
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
