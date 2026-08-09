import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Calendar, Info, Luggage, Plane, RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AirlineLogo } from "@/components/public/AirlineLogo";
import { PageHeader } from "@/components/public/PageHeader";
import { WhatsAppIcon } from "@/components/public/WhatsAppIcon";
import { GroupTicketingCategories } from "@/components/public/GroupTicketingCategories";
import { SearchTabs } from "@/components/public/SearchTabs";
import { whatsappUrl } from "@/lib/site-config";
import {
  buildGroupTicketSearchParams,
  fetchGroupTicketDetail,
  fetchGroupTickets,
  filterGroupTickets,
  ensureGroupTicketCollectionsLoaded,
  groupTicketCategoryLabel,
  groupTicketDisplayTitle,
  groupTicketPublicCollectionLabel,
  groupTicketWhatsAppMessage,
  maskGroupTicketForDisplay,
  parseGroupTicketSearchParams,
  type GroupTicket,
} from "@/lib/group-ticketing";

function whatsappHref(message: string) {
  return whatsappUrl(message);
}

function SkeletonCards() {
  return (
    <div className="grid gap-4">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-36 animate-pulse rounded-2xl bg-muted" />
      ))}
    </div>
  );
}

function GroupCard({ group, category, index }: { group: GroupTicket; category: string; index: number }) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<GroupTicket | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const toggleDetail = useCallback(() => {
    setDetailOpen((open) => !open);
  }, []);

  useEffect(() => {
    if (!detailOpen || detail) return;

    if (group.itinerary?.length) {
      setDetail(group);
      return;
    }

    let cancelled = false;
    setLoadingDetail(true);
    fetchGroupTicketDetail(group.id)
      .then((loaded) => {
        if (!cancelled) setDetail(loaded);
      })
      .catch(() => {
        if (!cancelled) setDetail(group);
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });

    return () => {
      cancelled = true;
    };
  }, [detailOpen, detail, group]);

  const active = detail || group;
  const display = maskGroupTicketForDisplay(active, index);
  const categorySlug = active.categorySlug || group.categorySlug;
  const collectionLabel = groupTicketPublicCollectionLabel(categorySlug, active.categoryLabel);
  const message = groupTicketWhatsAppMessage(category, active);

  return (
    <Card className="overflow-hidden border-0 shadow-card">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-4">
            <AirlineLogo
              airline={active.airlineName || active.airlineCode || "Airline"}
              flightNumber={group.flightNumber}
              imageUrl={active.airlineLogo}
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">{display.displayTitle || groupTicketDisplayTitle(group, index)}</h2>
                <Badge
                  variant="secondary"
                  className="border border-border/60 bg-muted/50 text-[11px] font-medium text-muted-foreground"
                >
                  {collectionLabel}
                </Badge>
                {group.tripType && <Badge variant="outline" className="capitalize">{group.tripType}</Badge>}
                {group.status && <Badge className="bg-success/10 text-success hover:bg-success/10">{group.status}</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{group.sector || "Route will be confirmed by Travelian"}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {group.departureDate || "Departure TBA"}</span>
                {group.returnDate && <span>Return: {group.returnDate}</span>}
                <span className="inline-flex items-center gap-1"><Luggage className="h-3.5 w-3.5" /> {group.baggage || "Baggage TBA"}</span>
                <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {group.seatsAvailable || "Seats TBA"}</span>
              </div>
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <div className="sm:text-right">
              <p className="text-xs text-muted-foreground">Fare</p>
              <p className="text-2xl font-bold text-primary">{group.fare ? `${group.currency || "PKR"} ${group.fare}` : "On request"}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl sm:w-auto"
              onClick={toggleDetail}
              aria-expanded={detailOpen}
            >
              {detailOpen ? "Hide Details" : "View Details"}
            </Button>
            <a href={whatsappHref(message)} target="_blank" rel="noreferrer" className="block w-full sm:w-auto">
              <Button className="w-full rounded-xl bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp-hover">
                <WhatsAppIcon className="mr-2 h-4 w-4" /> WhatsApp
              </Button>
            </a>
          </div>
        </div>

        {detailOpen && (
          <div className="mt-5 rounded-2xl border bg-muted/25 p-4">
            {loadingDetail ? (
              <p className="text-sm text-muted-foreground">Loading group details...</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="font-semibold text-foreground">Flight details</h3>
                  <dl className="mt-2 grid gap-1 text-sm text-muted-foreground">
                    <div>Collection: {collectionLabel}</div>
                    <div>Route: {display.sector || "Please confirm"}</div>
                    <div>Departure: {display.departureDate || "Please confirm"}</div>
                    <div>Return: {display.returnDate || "Not listed"}</div>
                    <div>Baggage: {display.baggage || "Please confirm"}</div>
                  </dl>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Terms</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{display.terms || "Detailed terms will be confirmed by Travelian before booking."}</p>
                  {display.cancellationRules && <p className="mt-2 text-sm text-muted-foreground">Cancellation: {display.cancellationRules}</p>}
                </div>
              </div>
            )}
            {!loadingDetail && display.itinerary && display.itinerary.length > 0 && (
              <div className="mt-4 border-t pt-4">
                <h3 className="font-semibold text-foreground">Itinerary</h3>
                <div className="mt-3 grid gap-3">
                  {display.itinerary.map((leg, legIndex) => (
                    <div key={leg.id || `${leg.flightDate}-${legIndex}`} className="grid gap-2 rounded-xl border bg-background p-3 text-sm md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center">
                      <div>
                        <p className="font-semibold text-foreground">{leg.origin || "Origin TBA"} to {leg.destination || "Destination TBA"}</p>
                        <p className="text-muted-foreground">{leg.flightDate || "Date TBA"}</p>
                      </div>
                      <p className="text-muted-foreground">{leg.departureTime || "Time TBA"} - {leg.arrivalTime || "Time TBA"}</p>
                      <p className="text-muted-foreground"><Luggage className="mr-1 inline h-3.5 w-3.5" />{leg.baggage || display.baggage || "Baggage TBA"}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function filterSummary(filters: { from?: string; to?: string; dateFrom?: string }) {
  const parts: string[] = [];
  if (filters.from && filters.to) parts.push(`${filters.from} to ${filters.to}`);
  else if (filters.from) parts.push(`from ${filters.from}`);
  else if (filters.to) parts.push(`to ${filters.to}`);
  if (filters.dateFrom) parts.push(`departing ${filters.dateFrom}`);
  if (!parts.length) return "Showing all available group tickets";
  return `Showing tickets ${parts.join(" · ")}`;
}

export default function GroupTicketingPage() {
  const { category } = useParams();
  const selectedCategory = category || "all";
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const searchFilters = useMemo(() => parseGroupTicketSearchParams(searchParams), [searchParams]);
  const [groups, setGroups] = useState<GroupTicket[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const load = () => {
    const controller = new AbortController();
    setStatus("loading");
    fetchGroupTickets(selectedCategory, controller.signal)
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

  useEffect(load, [selectedCategory]);

  useEffect(() => {
    const controller = new AbortController();
    ensureGroupTicketCollectionsLoaded(controller.signal, true).catch(() => undefined);
    return () => controller.abort();
  }, []);

  const filteredGroups = useMemo(
    () => filterGroupTickets(groups, searchFilters),
    [groups, searchFilters],
  );

  const label = selectedCategory === "all"
    ? "All Available Group Tickets"
    : groupTicketCategoryLabel(selectedCategory);

  const handleSearch = (values: { from?: string; to?: string; dateFrom?: string }) => {
    const params = buildGroupTicketSearchParams(values);
    const basePath = selectedCategory === "all" ? "/group-ticketing" : `/group-ticketing/${selectedCategory}`;
    const query = params.toString();
    navigate(query ? `${basePath}?${query}` : basePath);
  };

  return (
    <div>
      <PageHeader title="Group Ticketing" tagline="Live group ticket availability from Travelian">
        <SearchTabs initialTab="group-ticketing" groupInitialValues={searchFilters} onGroupSearch={handleSearch} />
      </PageHeader>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <GroupTicketingCategories compact />
        <div className="flex items-center justify-between gap-3">
          <div>
            {selectedCategory !== "all" && (
              <Link to="/group-ticketing" className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                <ArrowLeft className="h-4 w-4" /> All group tickets
              </Link>
            )}
            <h2 className="text-2xl font-bold text-foreground">{label}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {filterSummary(searchFilters)}
              {status === "success" ? ` · ${filteredGroups.length} ticket${filteredGroups.length === 1 ? "" : "s"}` : ""}
            </p>
          </div>
          <Button variant="outline" className="rounded-xl" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </Button>
        </div>

        {status === "loading" && <SkeletonCards />}
        {status === "error" && (
          <div className="rounded-2xl border bg-card p-8 text-center shadow-card">
            <Info className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-bold">Group ticketing is temporarily unavailable</h2>
            <p className="mt-2 text-sm text-muted-foreground">The group ticketing service is temporarily unavailable. Please retry shortly or contact Travelian for the latest availability.</p>
            <Button className="mt-5 rounded-xl" onClick={load}>Retry</Button>
          </div>
        )}
        {status === "success" && filteredGroups.length === 0 && (
          <div className="rounded-2xl border bg-card p-8 text-center shadow-card">
            <Plane className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-bold">No group tickets match your search.</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchFilters.from || searchFilters.to || searchFilters.dateFrom
                ? "Try different airports or dates, or clear the filters to browse all available group tickets."
                : "Please contact Travelian on WhatsApp for the latest group ticket availability."}
            </p>
            <a href={whatsappHref("Hello Travelian, please share the latest group ticket availability.")} target="_blank" rel="noreferrer">
              <Button className="mt-5 rounded-xl bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp-hover">
                <WhatsAppIcon className="mr-2 h-4 w-4" /> WhatsApp Travelian
              </Button>
            </a>
          </div>
        )}
        {status === "success" && filteredGroups.length > 0 && (
          <div className="grid gap-4">
            {filteredGroups.map((group, index) => <GroupCard key={group.id} group={group} category={label} index={index} />)}
          </div>
        )}
      </div>
    </div>
  );
}

