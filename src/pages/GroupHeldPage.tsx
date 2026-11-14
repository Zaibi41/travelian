import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Notice } from "@/components/admin/ui/feedback";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { NotAvailableNotice } from "@/components/admin/bookings/NotAvailable";
import { GroupBookingSteps, HoldCountdown, useHoldOver } from "@/components/admin/search/GroupBookingSteps";
import { GatewayError } from "@/lib/gateway/client";
import { formatMoney } from "@/lib/admin-bookings/format";
import { sourceLine } from "@/lib/admin-search/group-ticketing";
import { departureText, fetchGroupHold, gatewayMessage, groupBookingPath, releaseGroupHold, travelerLine, type GroupHoldView } from "@/lib/admin-search/group-holds";

const SEARCH = "/admin/search?tab=group-ticketing";
export const groupHoldKey = (bookingId: string) => ["group-holds", bookingId];

function flightText(view: GroupHoldView) {
  const { sector, departure_date: date, departure_time: time } = view.flight;
  return [sector, departureText(date, time)].filter(Boolean).join(", ") || "—";
}

// Group seats held, step 3 of 4 (mockup page 11). Opened right after the hold with the gateway's
// answer; on reload the hold is read again (and reads as expired once its time limit has passed).
export default function GroupHeldPage() {
  const { bookingId = "" } = useParams();
  const fromHold = useLocation().state as GroupHoldView | null;
  const hold = useQuery({
    queryKey: groupHoldKey(bookingId),
    queryFn: ({ signal }) => fetchGroupHold(bookingId, { signal }),
    initialData: fromHold && fromHold.booking_id === bookingId ? fromHold : undefined,
    staleTime: 15_000, refetchInterval: 60_000, retry: 1,
  });
  const view = hold.data;
  return (
    <div className="flex min-w-0 flex-col gap-section-gap">
      <div className="flex flex-col gap-3">
        <Link to={SEARCH} className="inline-flex items-center gap-1 text-label font-medium text-teal hover:underline">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />Back to search
        </Link>
        <div>
          <h1 className="font-display text-page-title font-bold text-brand-navy">Group seats held</h1>
          <p className="text-body text-muted-foreground">Take the payment and issue the tickets before the hold expires.</p>
        </div>
        <GroupBookingSteps current={3} />
      </div>
      {hold.error && !view ? (
        <NotAvailableNotice title="This booking can't be shown">
          {hold.error instanceof GatewayError ? hold.error.message : "It will load when the service responds."}{" "}
          <Link to={SEARCH} className="font-medium text-teal hover:underline">Back to search</Link>
        </NotAvailableNotice>
      ) : !view ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading the hold"><Skeleton className="h-12 rounded-xl" /><Skeleton className="h-56 rounded-xl" /></div>
      ) : (
        <Held view={view} />
      )}
    </div>
  );
}

/** Admin and Super Admin only: the gateway sends supplier_release_failed only to viewers with supplier access. */
export function ReleaseFailedNotice() {
  return (
    <Notice tone="critical" title="Supplier release failed, release manually">
      The hold has ended here, but the supplier hasn't confirmed that the seats were released. Travelian keeps retrying; release them with the supplier.
    </Notice>
  );
}

/** What happens to the seats at the supplier, e.g. "Supplier hold ends by itself after 1 hour". The gateway sends
 *  supplier_notice only to viewers with supplier access (Super Admin, or staff granted it). */
export function SupplierNotice({ view }: { view: GroupHoldView }) {
  if (!view.supplier_notice) return null;
  return <Notice tone={view.status === "not_recorded" ? "critical" : "info"} title={view.supplier_notice} />;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-label">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}

function Held({ view }: { view: GroupHoldView }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const over = useHoldOver(view.status === "held" ? view.hold_expires_at : null);
  const expired = view.status === "expired" || (view.status === "held" && over);
  const held = view.status === "held" && !expired;
  const [problem, setProblem] = useState<string | null>(null);
  const release = useMutation({
    mutationFn: () => releaseGroupHold(view.booking_id),
    onSuccess: next => { queryClient.setQueryData(groupHoldKey(view.booking_id), next); void queryClient.invalidateQueries({ queryKey: ["admin-bookings"] }); },
    onError: error => setProblem(gatewayMessage(error, "The hold couldn't be released. Nothing was changed.")),
  });
  const adults = `${view.adults} ${view.adults === 1 ? "adult" : "adults"}`;
  const source = sourceLine(view.group_source);
  return (
    <>
      {view.supplier_release_failed && <ReleaseFailedNotice />}
      {!view.supplier_release_failed && <SupplierNotice view={view} />}
      {held ? (
        <section aria-label="Seats held" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-status-fine/40 bg-status-fine-soft px-card py-3">
          <span className="flex items-center gap-2.5 text-body font-semibold text-status-fine-text">
            <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-full bg-card"><Check className="h-3.5 w-3.5" /></span>
            Seats held for {adults}
          </span>
          <HoldCountdown expiresAt={view.hold_expires_at} />
        </section>
      ) : (
        <Notice tone={expired || view.status === "not_recorded" ? "critical" : "info"} title={
          expired ? "This hold has expired" : view.status === "released" ? "This hold was released" : view.status === "issued" ? "Tickets issued"
            : view.status === "not_recorded" ? "This hold was not recorded" : "Issuing in progress"}>
          {view.status === "not_recorded" ? <>The supplier held the seats but the booking couldn't be saved. <Link to={SEARCH} className="font-medium text-teal hover:underline">Search again</Link> to hold new seats.</>
            : expired ? <>The seats were not kept and this booking can't be held again. <Link to={SEARCH} className="font-medium text-teal hover:underline">Search again</Link> and hold new seats.</>
            : view.status === "released" ? "The seats went back to the supplier. Search again to hold new seats."
            : "Open the booking for the details."}
        </Notice>
      )}
      <div className="grid min-w-0 grid-cols-1 items-start gap-section-gap lg:grid-cols-[minmax(0,1fr)_minmax(16rem,15.5rem)]">
        <section aria-labelledby="booking-details-title" className="min-w-0 rounded-xl border border-border bg-card px-card py-4 shadow-card">
          <h2 id="booking-details-title" className="font-display text-section font-semibold text-brand-navy">Booking details</h2>
          <dl className="mt-2 flex flex-col">
            <Row label="Booking reference" value={view.booking_id} />
            {view.pnr && <Row label="PNR" value={view.pnr} />}
            <div className="flex items-start justify-between gap-4 py-2 text-label">
              <dt className="shrink-0 text-muted-foreground">Flight</dt>
              <dd className="min-w-0 text-right font-medium text-foreground">
                <span className="block truncate" title={view.flight.airline ?? undefined}>{view.flight.airline ?? "—"}</span>
                <span className="block truncate">{flightText(view)}</span>
              </dd>
            </div>
            <Row label="Stock" value={view.stock === "owned" ? "Owned" : "Supplier"} />
            {source && <Row label="Source" value={<span title={source}>{source}</span>} />}
            {view.status !== "held" && <Row label="Status" value={<StatusBadge severity={view.status === "issued" ? "fine" : "critical"}>{view.status === "issued" ? "Issued" : view.status === "released" ? "Released" : view.status === "expired" ? "Expired" : view.status === "unknown" ? "Unknown" : view.status === "not_recorded" ? "Not recorded" : "Processing"}</StatusBadge>} />}
          </dl>
          <dl className="mt-2 flex flex-col border-t border-border pt-2">
            <Row label="Customer" value={view.customer?.name ?? "—"} />
            {view.travelers.map((traveler, index) => <Row key={traveler.position} label={`Adult ${index + 1}`} value={travelerLine(traveler)} />)}
          </dl>
        </section>
        <aside aria-labelledby="price-title" className="min-w-0 rounded-xl border border-border bg-card px-card py-4 shadow-card">
          <h2 id="price-title" className="font-display text-section font-semibold text-brand-navy">Price</h2>
          <dl className="mt-2 flex flex-col">
            <Row label="Price per adult" value={formatMoney(view.price_per_adult)} />
            <Row label="Adults" value={view.adults} />
            <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-border py-2.5 text-label">
              <dt className="text-muted-foreground">Total</dt>
              <dd className="text-body font-bold tabular-nums text-foreground">{formatMoney(view.total)}</dd>
            </div>
          </dl>
          <p className="text-helper text-muted-foreground">This price is valid until the hold expires. It is checked again when you issue the tickets.</p>
          {problem && <p role="alert" className="mt-2 text-helper text-status-critical-text">{problem}</p>}
          <div className="mt-3 flex flex-col gap-2">
            <Button type="button" variant="primary" className="w-full" disabled={!held} onClick={() => navigate(groupBookingPath(view.booking_id))}>Continue to payment</Button>
            <Button type="button" variant="outline" className="w-full" disabled={!held || !view.can_release || release.isPending} onClick={() => { setProblem(null); release.mutate(); }}>
              {release.isPending ? "Releasing…" : "Release hold"}
            </Button>
          </div>
        </aside>
      </div>
    </>
  );
}
