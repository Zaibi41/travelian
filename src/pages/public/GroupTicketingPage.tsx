import { Link, useParams } from "react-router-dom";
import { ArrowRight, CalendarDays, Plane, UsersRound } from "lucide-react";
import { SEO } from "@/components/SEO";
import { PageHeader } from "@/components/public/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const sectors = [
  { slug: "umrah", name: "Umrah", routes: ["LHE to JED", "KHI to MED", "ISB to JED"], note: "Fixed group allocations for Umrah departures." },
  { slug: "uae", name: "UAE", routes: ["LHE to DXB", "KHI to SHJ", "ISB to AUH"], note: "Dubai, Sharjah and Abu Dhabi group ticketing." },
  { slug: "ksa", name: "KSA", routes: ["LHE to RUH", "KHI to DMM", "ISB to JED"], note: "Saudi Arabia group seats for business, family and pilgrim travel." },
  { slug: "oman", name: "Oman", routes: ["LHE to MCT", "KHI to MCT", "ISB to MCT"], note: "Muscat group fares with managed ticketing support." },
  { slug: "bahrain", name: "Bahrain", routes: ["LHE to BAH", "KHI to BAH", "ISB to BAH"], note: "Bahrain sectors for worker, family and corporate groups." },
  { slug: "kuwait", name: "Kuwait", routes: ["LHE to KWI", "KHI to KWI", "ISB to KWI"], note: "Kuwait allocations with fast quotation support." },
];

export default function GroupTicketingPage() {
  const { sector } = useParams();
  const activeSector = sectors.find((item) => item.slug === sector);
  const title = activeSector ? `${activeSector.name} Group Ticketing` : "Group Ticketing";

  return (
    <div>
      <SEO
        title={`${title} | Travelian`}
        description="Explore Travelian group ticketing sectors for Umrah, UAE, KSA, Oman, Bahrain and Kuwait."
      />
      <PageHeader title={title} tagline="Live group sectors, managed allocations, and agency-ready travel support" />

      <section className="py-12 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {!activeSector ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {sectors.map((item) => (
                <Link key={item.slug} to={`/group-ticketing/${item.slug}`} className="group">
                  <Card className="h-full border-0 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-hover">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="h-12 w-12 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground">
                          <UsersRound className="h-5 w-5" />
                        </div>
                        <Badge variant="secondary">Available</Badge>
                      </div>
                      <h2 className="mt-5 text-xl font-bold text-foreground">{item.name}</h2>
                      <p className="mt-2 text-sm text-muted-foreground">{item.note}</p>
                      <div className="mt-4 space-y-2">
                        {item.routes.map((route) => (
                          <div key={route} className="flex items-center gap-2 text-sm text-foreground">
                            <Plane className="h-3.5 w-3.5 text-primary" /> {route}
                          </div>
                        ))}
                      </div>
                      <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                        View options <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <Card className="border-0 shadow-card">
                <CardContent className="p-6">
                  <Badge className="mb-4 bg-gold text-gold-foreground border-0">{activeSector.name}</Badge>
                  <h2 className="text-2xl font-bold text-foreground">Available routes</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{activeSector.note}</p>
                  <div className="mt-6 grid gap-3 md:grid-cols-3">
                    {activeSector.routes.map((route) => (
                      <div key={route} className="rounded-2xl border bg-card p-4">
                        <Plane className="h-5 w-5 text-primary" />
                        <p className="mt-3 font-semibold text-foreground">{route}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Dates and seat blocks confirmed by Travelian support.</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-card">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-foreground">Request latest availability</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Share route, date, passenger count and preferred airline. Our team will confirm live group seats and fare rules.
                  </p>
                  <Button className="mt-5 w-full gradient-primary text-primary-foreground rounded-xl" asChild>
                    <Link to={`/contact?type=group-ticketing&sector=${activeSector.slug}`}>Ask Travelian</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
