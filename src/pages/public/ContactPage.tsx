import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Mail, Phone, MapPin, Clock, MessageSquare } from "lucide-react";
import { SEO } from "@/components/SEO";
import { SearchPageHero, PageSection } from "@/components/public/SearchPageShell";
import { WhatsAppIcon } from "@/components/public/WhatsAppIcon";
import { SUPPORT_ADDRESS, SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL, whatsappUrl } from "@/lib/site-config";
import { useSiteSwitches } from "@/lib/site-switches";

export default function ContactPage() {
  const { umrah } = useSiteSwitches(); // D39: Umrah wording only when Umrah is switched on

  return (
    <div>
      <SEO breadcrumbs={[{ name: "Contact", path: "/contact" }]}
        title={umrah ? "Contact Travelian | Flights, Umrah & Hotel Support" : "Contact Travelian | Flights & Hotel Support"}
        description={`Talk to the Travelian team about flights, ${umrah ? "Umrah packages and hotels" : "group tickets and hotels"}. Call, WhatsApp or email our Lahore travel desk for booking support.`}
      />
      <SearchPageHero
        title="Contact Travelian"
        description={umrah ? "We're here to help with flights, group tickets, hotels, Umrah and booking support." : "We're here to help with flights, group tickets, hotels and booking support."}
      />
      <PageSection>
        <div className="mx-auto max-w-4xl space-y-6">
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground md:text-2xl">Talk to Travelian</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Reach our travel desk directly for new enquiries, group ticket availability, or help with an existing booking.
            </p>
          </div>

          <div className="grid items-stretch gap-6 md:grid-cols-2">
            {/* Direct contact channels — contact form stays hidden until backed by a real gateway endpoint (docs/backend-todo.md). */}
            <Card className="rounded-xl border-border/70 shadow-card">
              <CardContent className="divide-y divide-border/60 p-3 sm:p-4">
                <a
                  href={whatsappUrl("Hi Travelian, I need help with my travel plans.")}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex min-h-16 items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-whatsapp/10 text-whatsapp">
                    <WhatsAppIcon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground group-hover:text-primary">Chat on WhatsApp</span>
                    <span className="block text-xs text-muted-foreground">Fastest reply during working hours</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
                </a>

                <a
                  href={`tel:${SUPPORT_PHONE_TEL}`}
                  className="group flex min-h-16 items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                    <Phone className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground group-hover:text-primary">{SUPPORT_PHONE_DISPLAY}</span>
                    <span className="block text-xs text-muted-foreground">Call our travel desk</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
                </a>

                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="group flex min-h-16 items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                    <Mail className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground group-hover:text-primary">{SUPPORT_EMAIL}</span>
                    <span className="block text-xs text-muted-foreground">Email our support team</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
                </a>
              </CardContent>
            </Card>

            <Card className="rounded-xl border-border/70 shadow-card">
              <CardContent className="flex h-full flex-col justify-between space-y-5 p-6">
                <div className="space-y-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                      <MapPin className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Office</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{SUPPORT_ADDRESS}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                      <Clock className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Working Hours</h3>
                      <p className="mt-1 text-sm text-muted-foreground">Mon–Sat: 9:00 AM – 6:00 PM (PKT)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                      <MessageSquare className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Existing Bookings</h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Include your booking reference or PNR when messaging or emailing so our team can assist you faster.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageSection>
    </div>
  );
}
