import { Link, Navigate, useParams } from "react-router-dom";
import { BookingHeading } from "@/components/admin/bookings/BookingHeading";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TabLinks } from "@/components/admin/ui/TabLinks";
import { StatusBadge, Tag } from "@/components/admin/ui/StatusBadge";
import { NotAvailableNotice } from "@/components/admin/bookings/NotAvailable";
import { GroupBookingSteps } from "@/components/admin/search/GroupBookingSteps";
import { DownloadItineraryButton } from "@/components/admin/bookings/DownloadItineraryButton";
import { HeldPriceDialog, ReleaseFailedNotice, SupplierNotice } from "./GroupHeldPage";
import { GroupPaymentsTab, groupHoldKey } from "@/components/admin/search/GroupPaymentsTab";
import { GroupNoCancelNotice } from "@/components/admin/bookings/GroupNoCancelNotice";
import { GatewayError } from "@/lib/gateway/client";
import { formatDateTime, formatMoney } from "@/lib/admin-bookings/format";
import { acknowledgedBy } from "@/lib/group-fare-terms";
import { GROUP_BOOKING_TABS, departureText, fetchGroupHold, groupBookingPath, returnFlightText, travelerLine, type GroupHoldView } from "@/lib/admin-search/group-holds";
import { sourceLine } from "@/lib/admin-search/group-ticketing";

const BOOKINGS = "/admin/bookings/group-ticketing";
const STATUS: Record<GroupHoldView["status"], { label: string; severity: "fine" | "action" | "critical" }> = {
  held: { label: "Held", severity: "action" }, expired: { label: "Expired", severity: "critical" }, released: { label: "Released", severity: "critical" },
  processing: { label: "Issuing", severity: "action" }, issued: { label: "Issued", severity: "fine" }, unknown: { label: "Unknown", severity: "critical" },
  not_recorded: { label: "Not recorded", severity: "critical" },
};

// Payment and issue tickets, step 4 of 4 (mockup pages 12 and 13): the group booking with
// Details, Travelers and Payments tabs. Everything shown comes from the gateway's hold view.
export default function GroupBookingPage() {
  const { bookingId = "", tab = "payments" } = useParams();
  const queryClient = useQueryClient();
  const hold = useQuery({
    queryKey: groupHoldKey(bookingId),
    queryFn: ({ signal }) => fetchGroupHold(bookingId, { signal }),
    staleTime: 15_000, refetchInterval: 60_000, retry: 1,
  });
  const view = hold.data;
  if (!GROUP_BOOKING_TABS.some(entry => entry.slug === tab)) return <Navigate to={groupBookingPath(bookingId)} replace />;
  const subtitle = view ? [view.flight.airline, [view.flight.sector, departureText(view.flight.departure_date, view.flight.departure_time)].filter(Boolean).join(", "),
    `${view.adults} ${view.adults === 1 ? "adult" : "adults"}`].filter(Boolean).join(", ") : null;
  return (
    <div className="flex min-w-0 flex-col gap-section-gap">
      <div className="flex flex-col gap-3">
        <Link to={BOOKINGS} className="inline-flex items-center gap-1 text-label font-medium text-teal hover:underline">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />Back to bookings
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <BookingHeading bookingId={bookingId} pnr={view?.pnr} className="text-brand-navy" />
            {subtitle ? <p className="truncate text-body text-muted-foreground" title={subtitle}>{subtitle}</p> : <Skeleton className="mt-1 h-4 w-64 rounded-sm" />}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {view && view.status !== "held" && <StatusBadge severity={STATUS[view.status].severity}>{STATUS[view.status].label}</StatusBadge>}
            {view && <DownloadItineraryButton bookingId={bookingId} />}
          </div>
        </div>
        <GroupBookingSteps current={4} />
      </div>
      {view?.supplier_release_failed && <ReleaseFailedNotice />}
      {view?.supplier_notice && !view.supplier_release_failed && <SupplierNotice view={view} />}
      {view?.status === "held" && <HeldPriceDialog view={view} />}
      <GroupNoCancelNotice />
      <TabLinks label="Booking" tabs={GROUP_BOOKING_TABS.map(entry => ({ to: groupBookingPath(bookingId, entry.slug), label: entry.label }))} />
      {hold.error && !view ? (
        <NotAvailableNotice title="This booking can't be shown">
          {hold.error instanceof GatewayError ? hold.error.message : "It will load when the service responds."}
        </NotAvailableNotice>
      ) : !view ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading booking"><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-48 rounded-xl" /></div>
      ) : tab === "payments" ? (
        <GroupPaymentsTab view={view} onChange={next => queryClient.setQueryData(groupHoldKey(bookingId), next)} />
      ) : tab === "travelers" ? (
        <Travelers view={view} />
      ) : (
        <Details view={view} />
      )}
    </div>
  );
}

function FieldTable({ label, rows }: { label: string; rows: [string, React.ReactNode][] }) {
  return (
    <section aria-label={label} className="rounded-xl border border-border bg-card px-card py-2 shadow-card">
      <dl className="flex flex-col">
        {rows.map(([name, value]) => (
          <div key={name} className="flex items-start justify-between gap-4 border-b border-border py-2 text-label last:border-b-0">
            <dt className="shrink-0 text-muted-foreground">{name}</dt>
            <dd className="min-w-0 truncate text-right font-medium text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Details({ view }: { view: GroupHoldView }) {
  const status = STATUS[view.status];
  const source = sourceLine(view.group_source);
  return (
    <FieldTable label="Details" rows={[
      ["Booking reference", view.booking_id],
      ...(view.pnr ? [["PNR", view.pnr] as [string, React.ReactNode]] : []),
      ["Status", <StatusBadge key="status" severity={status.severity}>{status.label}</StatusBadge>],
      ["Hold expires", view.hold_expires_at ? formatDateTime(view.hold_expires_at) : "—"],
      ["Flight", [view.flight.airline, view.flight.sector].filter(Boolean).join(", ") || "—"],
      ["Departure", departureText(view.flight.departure_date, view.flight.departure_time) ?? "—"],
      ...(returnFlightText(view.flight) ? [["Return", <span key="return" title={returnFlightText(view.flight) ?? undefined}>{returnFlightText(view.flight)}</span>] as [string, React.ReactNode]] : []),
      ["Stock", view.stock === "owned" ? "Owned" : "Supplier"],
      ...(source ? [["Source", <span key="source" title={source}>{source}</span>] as [string, React.ReactNode]] : []),
      ...(view.supplier ? [["Supplier", <Tag key="supplier">{view.supplier}</Tag>] as [string, React.ReactNode]] : []),
      ["Adults", view.adults],
      ...(view.fare_terms ? [["Fare terms", <span key="terms">Non-refundable · Non-changeable. {view.fare_terms.text}{" "}
        <span className="text-muted-foreground">({acknowledgedBy(view.fare_terms, formatDateTime(view.fare_terms.acknowledged_at))})</span></span>] as [string, React.ReactNode]] : []),
      ["Price per adult", formatMoney(view.price_per_adult)],
      ["Total", formatMoney(view.total)],
      // Cost and profit: only when the gateway sends them (cost and margin access).
      ...(view.supplier_cost ? [["Supplier cost", formatMoney(view.supplier_cost)] as [string, React.ReactNode]] : []),
      ...(view.profit ? [["Profit", formatMoney(view.profit)] as [string, React.ReactNode]] : []),
      ["Customer", view.customer ? [view.customer.name, view.customer.phone, view.customer.email].filter(Boolean).join(", ") : "—"],
    ]} />
  );
}

function Travelers({ view }: { view: GroupHoldView }) {
  return (
    <FieldTable label="Travelers" rows={view.travelers.length
      ? view.travelers.map((traveler, index) => [`Adult ${index + 1}`, <span key={traveler.position}>{traveler.title} {travelerLine(traveler)}{traveler.ticket_number ? `, ticket ${traveler.ticket_number}` : ""}</span>])
      : [["Travelers", "—"]]} />
  );
}
