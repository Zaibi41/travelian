import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Hotel, Landmark, Loader2, Plane, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import { AdminHotelSearchPanel } from "@/components/AdminHotelSearchPanel";
import { SearchTabs } from "@/components/public/SearchTabs";
import { useAdmin } from "@/contexts/AdminStore";
import { useLocale } from "@/contexts/LocaleContext";
import type { UmrahPackage } from "@/data/models";
import { isPublishedUmrahPackage } from "@/lib/package-availability";
import { createBookingRequest } from "@/lib/booking-request-api";
import { useRole } from "@/contexts/RoleContext";
import { isInternalRole } from "@/lib/admin-navigation";
import InternalSearchPage from "./InternalSearchPage";

const searchTabs = [
  { id: "flights", label: "Flights", icon: Plane },
  { id: "group-ticketing", label: "Group Ticketing", icon: Users },
  { id: "hotels", label: "Hotels", icon: Hotel },
  { id: "umrah", label: "Umrah", icon: Landmark },
] as const;

type SearchTabId = typeof searchTabs[number]["id"];
function unique(values: Array<string | undefined>) {
  return Array.from(new Set(values.map(value => value?.trim()).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b));
}

function RequestDialog({
  item,
  onClose,
}: {
  item: UmrahPackage | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ customerName: "", phone: "", email: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const label = "package";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!item) return;
    if (!form.customerName.trim() || !form.phone.trim()) {
      toast.error("Name and phone number are required");
      return;
    }
    setSubmitting(true);
    try {
      await createBookingRequest({
        type: "umrah",
        packageId: item.packageId,
        packageName: item.name,
        customerName: form.customerName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
      });
      setSubmitted(true);
      toast.success("Request saved in Booking Requests");
    } catch (error) {
      console.error(error);
      toast.error("Request could not be saved");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{submitted ? "Request saved" : `Request ${label}`}</DialogTitle>
          <DialogDescription>
            Submit the customer name and phone number so this {label} can be handled from Booking Requests.
          </DialogDescription>
        </DialogHeader>
        {submitted ? (
          <div className="space-y-4 py-4 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <p className="text-sm text-muted-foreground">The request for <strong>{item?.name}</strong> is saved in the Requests module. Admin notification email will be handled by the configured backend notification settings.</p>
            <Button className="w-full" onClick={onClose}>Done</Button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={submit}>
            <div className="rounded-xl border bg-muted/30 p-3">
              <p className="text-xs font-bold uppercase text-muted-foreground">Selected {label}</p>
              <p className="font-semibold">{item?.name}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-request-name">Name *</Label>
              <Input id="admin-request-name" value={form.customerName} onChange={event => setForm(current => ({ ...current, customerName: event.target.value }))} autoComplete="name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-request-phone">Phone number *</Label>
              <Input id="admin-request-phone" value={form.phone} onChange={event => setForm(current => ({ ...current, phone: event.target.value }))} autoComplete="tel" placeholder="+92 300 1234567" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-request-email">Email (optional)</Label>
              <Input id="admin-request-email" type="email" value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} autoComplete="email" />
            </div>
            <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={submitting}>
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Request"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ServiceSearchPanel({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: UmrahPackage[];
}) {
  const { formatPrice } = useLocale();
  const [query, setQuery] = useState("");
  const [primary, setPrimary] = useState("all");
  const [secondary, setSecondary] = useState("all");
  const [duration, setDuration] = useState("all");
  const [requestItem, setRequestItem] = useState<UmrahPackage | null>(null);
  const published = items.filter(isPublishedUmrahPackage);
  const primaryOptions = unique(published.map(item => item.departureCity || item.city));
  const secondaryOptions = unique(published.map(item => item.packageType || item.hotel || item.roomSharing));
  const durationOptions = unique(published.map(item => item.duration || item.processingTime));
  const filtered = published.filter(item => {
    const haystack = [
      item.name, item.description, item.duration, item.processingTime, item.city, item.departureCity, item.packageType,
      item.makkahHotel, item.madinahHotel, item.hotel, item.requiredDocuments?.join(" "), item.itineraryText,
    ].filter(Boolean).join(" ").toLowerCase();
    if (query && !haystack.includes(query.toLowerCase())) return false;
    if (primary !== "all" && !haystack.includes(primary.toLowerCase())) return false;
    if (secondary !== "all" && !haystack.includes(secondary.toLowerCase())) return false;
    if (duration !== "all" && !haystack.includes(duration.toLowerCase())) return false;
    return true;
  });
  const placeholder = "Search package, hotel, city, or duration";

  return (
    <div className="space-y-5">
      <Card className="shadow-card">
        <CardContent className="space-y-5 p-5">
          <div>
            <h2 className="text-xl font-bold font-display">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Search</Label>
              <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={event => setQuery(event.target.value)} className="h-12 rounded-xl pl-9" placeholder={placeholder} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Departure city</Label>
              <Select value={primary} onValueChange={setPrimary}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Departure city" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All</SelectItem>{primaryOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">Hotel category</Label>
                <Select value={secondary} onValueChange={setSecondary}>
                  <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Hotel category" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All</SelectItem>{secondaryOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                </Select>
            </div>
            <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Duration" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All</SelectItem>{durationOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                </Select>
            </div>
            <Button className="h-12 self-end rounded-xl px-6">Search Umrah</Button>
          </div>
        </CardContent>
      </Card>
      {filtered.length === 0 ? (
        <EmptyState icon={Landmark} title={`No active ${title.toLowerCase()} found`} description="Only active, published database records are shown here." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filtered.map(item => (
            <Card key={item.packageId} className="shadow-card">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Landmark className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold">{item.name}</h3>
                      <Badge variant="secondary" className="capitalize">{item.packageType || "umrah"}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{[item.duration || item.processingTime, item.departureCity || item.city, item.travelDates].filter(Boolean).join(" / ") || "Details available on request"}</p>
                  </div>
                </div>
                <div className="grid gap-2 rounded-2xl border bg-muted/30 p-3 text-sm">
                    <p><span className="font-bold">Makkah:</span> {item.makkahHotel || item.hotelOptions?.[0]?.makkahHotel || "On request"}</p>
                    <p><span className="font-bold">Madinah:</span> {item.madinahHotel || item.hotelOptions?.[0]?.madinahHotel || "On request"}</p>
                    <p className="text-muted-foreground">{item.transportIncluded ? "Transport included" : "Transport on request"}</p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                  <p className="text-xl font-black text-primary">{formatPrice(item.basePrice || 0)}</p>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" className="rounded-xl"><Link to={`/umrah/${item.packageId}`}>View Package</Link></Button>
                    <Button className="rounded-xl" onClick={() => setRequestItem(item)}>Request Package</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <RequestDialog item={requestItem} onClose={() => setRequestItem(null)} />
    </div>
  );
}

/** Internal roles get the gateway Search (spec 6); agency and customer roles keep this one. */
export default function AdminSearchPage() {
  const { currentRole } = useRole();
  return isInternalRole(currentRole) ? <InternalSearchPage /> : <LegacyAdminSearchPage />;
}

function LegacyAdminSearchPage() {
  const [params, setParams] = useSearchParams();
  const { hotels, packages, loadHotelContent } = useAdmin();
  const tabParam = params.get("tab") as SearchTabId | null;
  const activeTab = useMemo(
    () => searchTabs.some((tab) => tab.id === tabParam) ? tabParam! : "flights",
    [tabParam],
  );

  useEffect(() => {
    if (activeTab === "hotels") loadHotelContent();
  }, [activeTab, loadHotelContent]);

  useEffect(() => {
    if (!tabParam || !searchTabs.some((tab) => tab.id === tabParam)) {
      setParams({ tab: "flights" }, { replace: true });
    }
  }, [setParams, tabParam]);

  const setTab = (tab: SearchTabId) => setParams({ tab });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold font-display">Search</h1>
        <p className="mt-1 text-sm text-muted-foreground">Search live fares and published Travelian services. Inventory, pricing and supplier settings stay in their own admin modules.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto rounded-2xl border bg-card p-2 shadow-card">
        {searchTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTab(tab.id)}
            className={`inline-flex min-w-max items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
              activeTab === tab.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "flights" && (
        <div className="admin-product-search">
          <SearchTabs initialTab="flights" showProductNavigation={false} flightResultsPath="/admin/flights-search" />
        </div>
      )}
      {activeTab === "group-ticketing" && (
        <div className="admin-product-search">
          <SearchTabs initialTab="group-ticketing" showProductNavigation={false} />
        </div>
      )}
      {activeTab === "hotels" && <AdminHotelSearchPanel hotels={hotels} />}
      {activeTab === "umrah" && (
        <ServiceSearchPanel title="Umrah Packages" description="Search published Umrah inventory and start an assisted package request." items={packages} />
      )}
    </div>
  );
}
