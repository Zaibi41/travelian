import { ProductValuePills, TravelianTrustStrip } from "@/components/public/ProductTrust";
import { useEffect, useMemo, useState } from "react";

import { Navigate, useNavigate, useSearchParams } from "react-router-dom";

import { ArrowRight, Info, Luggage, Search, ShieldCheck, Sparkles, Users } from "lucide-react";

import { Button } from "@/components/ui/button";

import { Card, CardContent } from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

import { SearchPageHero } from "@/components/public/SearchPageShell";
import { SEO } from "@/components/SEO";

import { SearchTabs } from "@/components/public/SearchTabs";

import { cn } from "@/lib/utils";

import { airportByCode } from "@/data/airports";

import { searchPublicGroups } from "@/lib/public-booking";

import { useLocale } from "@/contexts/LocaleContext";

import { extractAvailableSectors, groupResultsPath, parseGroupTicketSearchParams, type AvailableSector, type GroupTicket } from "@/lib/group-ticketing";

const popularAirportByCode = new Map(

  [

    { code: "LHE", city: "Lahore" },

    { code: "KHI", city: "Karachi" },

    { code: "ISB", city: "Islamabad" },

    { code: "SKT", city: "Sialkot" },

    { code: "PEW", city: "Peshawar" },

    { code: "MUX", city: "Multan" },

    { code: "DXB", city: "Dubai" },

    { code: "JED", city: "Jeddah" },

    { code: "MED", city: "Madinah" },

    { code: "RUH", city: "Riyadh" },

    { code: "IST", city: "Istanbul" },

    { code: "DOH", city: "Doha" },

    { code: "AUH", city: "Abu Dhabi" },

    { code: "LHR", city: "London" },

    { code: "MAN", city: "Manchester" },

    { code: "JFK", city: "New York" },

    { code: "YYZ", city: "Toronto" },

    { code: "KUL", city: "Kuala Lumpur" },

    { code: "BKK", city: "Bangkok" },

    { code: "SIN", city: "Singapore" },

    { code: "MCT", city: "Muscat" },

    { code: "SHJ", city: "Sharjah" },

  ].map((a) => [a.code, a])

);

function airportCity(code?: string | null) {

  const cleanCode = String(code || "").trim().toUpperCase();

  if (!cleanCode) return "";

  const airport = airportByCode(cleanCode) || popularAirportByCode.get(cleanCode);

  return airport?.city || cleanCode;

}

export default function GroupTicketingPage() {

  const { currency: selectedCurrency } = useLocale();

  const [searchParams] = useSearchParams();

  const navigate = useNavigate();

  const searchFilters = useMemo(() => parseGroupTicketSearchParams(searchParams), [searchParams]);

  const [groups, setGroups] = useState<GroupTicket[]>([]);

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const hasSearchCriteria = Boolean(searchFilters.from || searchFilters.to || searchFilters.dateFrom);

  const load = () => {

    const controller = new AbortController();

    setStatus("loading");

    // Every group fare through the Travelian gateway (all suppliers, selling prices only), not the legacy feed (A5).

    searchPublicGroups({}, controller.signal)

      .then((items) => {

        setGroups(items);

        setStatus("success");

      })

      .catch(() => {

        setGroups([]);

        setStatus("error");

      });

    return () => controller.abort();

  };

  useEffect(load, []);

  const availableSectors = useMemo(() => extractAvailableSectors(groups), [groups]);

  // The results are the Flights results page with group fares only: the same list, cards, filters and Book.
  const handleSearch = (values: { from?: string; to?: string; dateFrom?: string }) => {
    navigate(groupResultsPath(values));
  };

  const handleQuickSector = (sec: AvailableSector) => {

    handleSearch({ from: sec.from, to: sec.to });

  };

  // Old result links (/group-ticketing?from=…&to=…) open the results page.
  if (hasSearchCriteria) return <Navigate to={groupResultsPath(searchFilters)} replace />;
  return (

    <div>
      <SEO breadcrumbs={[{ name: "Group Ticketing", path: "/group-ticketing" }]}
        title="Group Ticketing & Fixed Flight Fares | Travelian"
        description="Search available group ticket allocations and fixed flight fares across popular international routes from Pakistan with Travelian."
      />

      {/* 1. Navbar handled globally */}

      {/* 2. Group Ticketing Hero + Search */}

      <SearchPageHero
        title="Group Ticketing"

        support={<ProductValuePills product="group-ticketing" />}
      >

        <SearchTabs

          initialTab="group-ticketing"

          groupInitialValues={searchFilters}

          onGroupSearch={handleSearch}

        />

      </SearchPageHero>
      <TravelianTrustStrip />

      <div className="travelian-container py-10 space-y-12">
        {/* Loading state */}

        {/* Error state */}

        {status === "error" && (

          <div className="rounded-2xl border bg-card p-8 text-center shadow-card">

            <Info className="mx-auto h-10 w-10 text-muted-foreground" />

            <h2 className="mt-4 text-lg font-bold">Group ticketing is temporarily unavailable</h2>

            <p className="mt-2 text-sm text-muted-foreground">

              The group ticketing service is temporarily unavailable. Please retry shortly or contact Travelian for the latest availability.

            </p>

            <Button className="mt-5 rounded-xl" onClick={load}>Retry</Button>

          </div>

        )}

        {/* 4. On Platform: Live + Group Tickets Section */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 gradient-hero p-6 text-white shadow-xl sm:p-8 lg:p-10">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            aria-hidden="true"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, hsl(0 0% 100%) 1px, transparent 0)",
              backgroundSize: "22px 22px",
            }}
          />
          <div className="relative">
            <div className="max-w-3xl">
              <Badge className="mb-3 border border-white/15 bg-white/10 text-xs font-semibold uppercase tracking-wider text-gold-on-dark">
                Group Ticketing
              </Badge>
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                Fixed-Fare Group Seats Alongside Live Flights
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/85 sm:text-base">
                Compare scheduled airline fares with dedicated group seat allocations across popular routes from Pakistan to Saudi Arabia, the UAE, and the Gulf.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm transition-colors hover:bg-white/[0.09]">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10">
                  <ShieldCheck className="h-5 w-5 text-gold-on-dark" aria-hidden="true" />
                </div>
                <h3 className="text-sm font-bold text-white">Fixed Group Fares</h3>
                <p className="mt-1 text-xs leading-5 text-white/80">
                  Locked seat pricing on group departures without sudden dynamic fare jumps during busy travel periods.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm transition-colors hover:bg-white/[0.09]">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10">
                  <Luggage className="h-5 w-5 text-emerald-400" aria-hidden="true" />
                </div>
                <h3 className="text-sm font-bold text-white">Clear Baggage Allowances</h3>
                <p className="mt-1 text-xs leading-5 text-white/80">
                  Checked and hand-carry baggage limits are listed upfront on every group fare before you confirm.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm transition-colors hover:bg-white/[0.09]">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10">
                  <Sparkles className="h-5 w-5 text-sky-400" aria-hidden="true" />
                </div>
                <h3 className="text-sm font-bold text-white">Verified Seat Inventory</h3>
                <p className="mt-1 text-xs leading-5 text-white/80">
                  Live group departure dates, flight timings, and fare conditions presented clearly for every sector.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm transition-colors hover:bg-white/[0.09]">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10">
                  <Users className="h-5 w-5 text-gold-on-dark" aria-hidden="true" />
                </div>
                <h3 className="text-sm font-bold text-white">Direct Desk Support</h3>
                <p className="mt-1 text-xs leading-5 text-white/80">
                  Share your selected route and travel dates directly with our group ticketing team on WhatsApp for fast confirmation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Popular Group Sectors Section */}

        {availableSectors.length > 0 && (

          <section className="space-y-4">

            <div className="flex items-center justify-between gap-3">

              <div>

                <h2 className="text-xl sm:text-2xl font-black text-foreground">Popular Group Sectors</h2>

                <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">

                  Explore active group inventory by sector. Click any sector to view all available flight dates.

                </p>

              </div>

            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">

              {availableSectors.slice(0, 6).map((sec) => {

                const fromCity = airportCity(sec.from);

                const toCity = airportCity(sec.to);

                const isSelected = searchFilters.from === sec.from && searchFilters.to === sec.to;

                return (

                  <Card

                    key={sec.sector}

                    className={cn(

                      "cursor-pointer overflow-hidden border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",

                      isSelected ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-border/80 bg-card hover:border-primary/40",

                    )}

                    onClick={() => handleQuickSector(sec)}

                  >

                    <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-3">

                      <div className="min-w-0">

                        <div className="flex items-center gap-2">

                          <span className="text-lg font-black text-foreground">{sec.from}</span>

                          <ArrowRight className="h-4 w-4 text-primary" />

                          <span className="text-lg font-black text-foreground">{sec.to}</span>

                        </div>

                        <p className="truncate text-xs font-semibold text-muted-foreground mt-0.5">

                          {fromCity} to {toCity}

                        </p>

                        <Badge variant="secondary" className="mt-2 text-xs font-bold text-primary bg-primary/10">

                          {sec.count} group departure{sec.count === 1 ? "" : "s"}

                        </Badge>

                      </div>

                      <Button

                        size="sm"

                        variant={isSelected ? "default" : "outline"}

                        className="h-11 rounded-xl text-xs font-bold shrink-0 sm:h-9"

                        onClick={(e) => {

                          e.stopPropagation();

                          handleQuickSector(sec);

                        }}

                      >

                        View Tickets

                      </Button>

                    </CardContent>

                  </Card>

                );

              })}

            </div>

          </section>

        )}

        {/* 6. How It Works Section */}

        <section className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6 sm:p-10 space-y-6">

          <div className="text-center max-w-xl mx-auto">

            <h2 className="text-xl sm:text-2xl font-black text-foreground">How Group Ticketing Works</h2>

            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">

              Simple, transparent wholesale seat booking in four convenient steps

            </p>

          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-2">

              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-sm font-black text-primary">

                1

              </span>

              <h3 className="text-sm font-bold text-foreground">Select Route or Sector</h3>

              <p className="text-xs text-muted-foreground">

                Search with origin and destination airports or choose from the dynamic Available Sectors dropdown.

              </p>

            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-sm font-black text-primary">
                2
              </span>
              <h3 className="text-sm font-bold text-foreground">Compare Fares &amp; Baggage</h3>
              <p className="text-xs text-muted-foreground">
                Review fixed fares, flight timings, checked and hand-carry baggage limits, and fare rules for your preferred date.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-sm font-black text-primary">
                3
              </span>
              <h3 className="text-sm font-bold text-foreground">Confirm with Our Team</h3>
              <p className="text-xs text-muted-foreground">
                Tap WhatsApp Help to send your selected route, flight date and passenger count to our desk, or call us.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-sm font-black text-primary">
                4
              </span>
              <h3 className="text-sm font-bold text-foreground">Receive Your Ticket</h3>
              <p className="text-xs text-muted-foreground">
                A Travelian specialist confirms seat availability, shares payment details in writing, and issues your ticket.
              </p>
            </div>

          </div>

        </section>

      </div>

    </div>

  );

}

