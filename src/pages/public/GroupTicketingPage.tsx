import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Info, Luggage, Plane, RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/public/PageHeader";
import { WhatsAppIcon } from "@/components/public/WhatsAppIcon";
import { GroupTicketingCategories } from "@/components/public/GroupTicketingCategories";
import { whatsappUrl } from "@/lib/site-config";
import {
  fetchGroupTicketDetail,
  fetchGroupTickets,
  groupTicketWhatsAppMessage,
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

function GroupCard({ group, category }: { group: GroupTicket; category: string }) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<GroupTicket | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadDetail = async () => {
    setDetailOpen(true);
    if (detail) return;
    try {
      setLoadingDetail(true);
      setDetail(await fetchGroupTicketDetail(group.id));
    } catch {
      setDetail(group);
    } finally {
      setLoadingDetail(false);
    }
  };

  const active = detail || group;
  const message = groupTicketWhatsAppMessage(category, active);

  return (
    <Card className="overflow-hidden border-0 shadow-card">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10">
              {group.airlineLogo ? <img src={group.airlineLogo} alt="" className="h-full w-full object-contain p-2" /> : <Plane className="h-6 w-6 text-primary" />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">{group.airlineName || "Available Group Ticket"}</h2>
                {group.airlineCode && <Badge variant="outline">{group.airlineCode}</Badge>}
                {group.flightNumber && <Badge variant="secondary">{group.flightNumber}</Badge>}
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="sm:text-right">
              <p className="text-xs text-muted-foreground">Fare</p>
              <p className="text-2xl font-bold text-primary">{group.fare ? `${group.currency || "PKR"} ${group.fare}` : "On request"}</p>
            </div>
            <Button variant="outline" className="rounded-xl" onClick={loadDetail}>View Details</Button>
            <a href={whatsappHref(message)} target="_blank" rel="noreferrer">
              <Button className="rounded-xl bg-[#25D366] text-white hover:bg-[#20bd5a]">
                <WhatsAppIcon className="mr-2 h-4 w-4" /> Inquiry
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
                    <div>Airline: {active.airlineName || "Please confirm"}</div>
                    <div>Route: {active.sector || "Please confirm"}</div>
                    <div>Departure: {active.departureDate || "Please confirm"}</div>
                    <div>Return: {active.returnDate || "Not listed"}</div>
                    <div>Baggage: {active.baggage || "Please confirm"}</div>
                  </dl>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Terms and supplier remarks</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{active.terms || active.supplierRemarks || "Detailed terms will be confirmed by Travelian before booking."}</p>
                  {active.cancellationRules && <p className="mt-2 text-sm text-muted-foreground">Cancellation: {active.cancellationRules}</p>}
                </div>
              </div>
            )}
            {!loadingDetail && active.itinerary && active.itinerary.length > 0 && (
              <div className="mt-4 border-t pt-4">
                <h3 className="font-semibold text-foreground">Itinerary</h3>
                <div className="mt-3 grid gap-3">
                  {active.itinerary.map((leg, index) => (
                    <div key={leg.id || `${leg.flightNumber}-${leg.flightDate}-${index}`} className="grid gap-2 rounded-xl border bg-background p-3 text-sm md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center">
                      <div>
                        <p className="font-semibold text-foreground">{leg.origin || "Origin TBA"} to {leg.destination || "Destination TBA"}</p>
                        <p className="text-muted-foreground">{leg.flightDate || "Date TBA"} · {leg.flightNumber || "Flight TBA"}</p>
                      </div>
                      <p className="text-muted-foreground">{leg.departureTime || "Time TBA"} - {leg.arrivalTime || "Time TBA"}</p>
                      <p className="text-muted-foreground"><Luggage className="mr-1 inline h-3.5 w-3.5" />{leg.baggage || active.baggage || "Baggage TBA"}</p>
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

export default function GroupTicketingPage() {
  const { category = "all" } = useParams();
  const selectedCategory = category;
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

  const label = selectedCategory === "all"
    ? "All Available Group Tickets"
    : groups[0]?.categoryLabel || selectedCategory.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

  return (
    <div>
      <PageHeader title="Group Ticketing" tagline="Live group ticket availability from Travelian suppliers" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <GroupTicketingCategories compact />
        <div className="flex items-center justify-between gap-3">
          <div>
            <Link to="/group-ticketing" className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-primary">
              <ArrowLeft className="h-4 w-4" /> All categories
            </Link>
            <h1 className="text-2xl font-bold text-foreground">{label}</h1>
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
            <p className="mt-2 text-sm text-muted-foreground">The group supplier is temporarily unavailable. Please retry shortly or contact Travelian for the latest availability.</p>
            <Button className="mt-5 rounded-xl" onClick={load}>Retry</Button>
          </div>
        )}
        {status === "success" && groups.length === 0 && (
          <div className="rounded-2xl border bg-card p-8 text-center shadow-card">
            <Plane className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-bold">No group tickets are available right now.</h2>
            <p className="mt-2 text-sm text-muted-foreground">Please contact Travelian on WhatsApp for the latest group ticket availability.</p>
            <a href={whatsappHref("Hello Travelian, please share the latest group ticket availability.")} target="_blank" rel="noreferrer">
              <Button className="mt-5 rounded-xl bg-[#25D366] text-white hover:bg-[#20bd5a]">
                <WhatsAppIcon className="mr-2 h-4 w-4" /> WhatsApp Travelian
              </Button>
            </a>
          </div>
        )}
        {status === "success" && groups.length > 0 && (
          <div className="grid gap-4">
            {groups.map((group) => <GroupCard key={group.id} group={group} category={label} />)}
          </div>
        )}
      </div>
    </div>
  );
}
