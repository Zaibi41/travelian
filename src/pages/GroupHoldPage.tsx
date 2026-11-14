import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Notice } from "@/components/admin/ui/feedback";
import { NotAvailableNotice } from "@/components/admin/bookings/NotAvailable";
import { GroupBookingSteps } from "@/components/admin/search/GroupBookingSteps";
import { GroupHoldForm } from "@/components/admin/search/GroupHoldForm";
import { GatewayError } from "@/lib/gateway/client";
import { formatMoney } from "@/lib/admin-bookings/format";
import { parseGroupSearch } from "@/lib/admin-search/group-ticketing";
import { departureText, fetchGroupTicket, groupResultsPath } from "@/lib/admin-search/group-holds";

const FORM_ID = "group-hold-form";

// Hold group seats, step 2 of 4 (mockup PDF docs/2026-11-14 page 10). The fare and the search
// are in the URL (?ticket=…&from=…&to=…&date=…&adults=…); the fare is checked with the gateway
// again, so seats left and the stock label are current. Price: "Shown after hold".
export default function GroupHoldPage() {
  const [params] = useSearchParams();
  const ticketId = params.get("ticket") ?? "";
  const search = parseGroupSearch(params);
  const adults = search.adults;
  const results = groupResultsPath(search);
  const [pending, setPending] = useState(false);
  const ticket = useQuery({
    queryKey: ["admin-search", "group-ticket", ticketId],
    queryFn: ({ signal }) => fetchGroupTicket(ticketId, { signal }),
    enabled: Boolean(ticketId),
    staleTime: 60_000,
    retry: 1,
  });
  const fare = ticket.data;
  const gone = ticket.error instanceof GatewayError && (ticket.error.kind === "not_found" || ticket.error.status === 409);
  const canHold = Boolean(fare?.can_hold) && (fare?.remaining == null || fare.remaining >= adults);

  return (
    <div className="flex min-w-0 flex-col gap-section-gap">
      <div className="flex flex-col gap-3">
        <Link to={results} className="inline-flex items-center gap-1 text-label font-medium text-teal hover:underline">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />Back to results
        </Link>
        <div>
          <h1 className="font-display text-page-title font-bold text-brand-navy">Hold group seats</h1>
          <p className="text-body text-muted-foreground">Enter the customer and traveler details, then hold the seats.</p>
        </div>
        <GroupBookingSteps current={2} />
      </div>

      {!ticketId ? (
        <NotAvailableNotice title="No group fare chosen">
          Choose a fare from the search results. <Link to={results} className="font-medium text-teal hover:underline">Back to results</Link>
        </NotAvailableNotice>
      ) : gone ? (
        <NotAvailableNotice title="This group fare is no longer available">
          Search again and choose another departure. <Link to={results} className="font-medium text-teal hover:underline">Back to results</Link>
        </NotAvailableNotice>
      ) : ticket.error ? (
        <Notice tone="critical">{ticket.error instanceof GatewayError ? ticket.error.message : "The group fare couldn't be checked. Try again in a moment."}</Notice>
      ) : (
        <div className="grid min-w-0 grid-cols-1 items-start gap-section-gap lg:grid-cols-[minmax(0,1fr)_minmax(16rem,15.5rem)]">
          <div className="min-w-0 lg:order-1">
            <GroupHoldForm ticketId={ticketId} adults={adults} canHold={canHold} onPendingChange={setPending} formId={FORM_ID} />
          </div>
          <aside aria-labelledby="selected-fare-title" className="min-w-0 rounded-xl border border-border bg-card px-card py-4 shadow-card lg:order-2 lg:sticky lg:top-4">
            <h2 id="selected-fare-title" className="font-display text-section font-semibold text-brand-navy">Selected group fare</h2>
            {ticket.isPending || !fare ? (
              <div className="mt-3 flex flex-col gap-2" aria-busy="true" aria-label="Loading the selected fare">
                <Skeleton className="h-5 w-32 rounded-sm" /><Skeleton className="h-4 w-44 rounded-sm" /><Skeleton className="h-control w-full rounded-md" />
              </div>
            ) : (
              <>
                <p className="mt-2 truncate text-body font-semibold text-foreground" title={fare.airline ?? undefined}>{fare.airline ?? "Group fare"}</p>
                <p className="truncate text-label text-muted-foreground">{fare.sector ?? "—"}, {departureText(fare.departure_date, fare.departure_time) ?? "—"}</p>
                <dl className="mt-3 flex flex-col border-t border-border">
                  {([
                    ["Passengers", `${adults} ${adults === 1 ? "adult" : "adults"}`],
                    ["Stock", fare.stock === "owned" ? "Owned" : "Supplier"],
                    ["Price", fare.selling_price ? `${formatMoney(fare.selling_price)} per adult` : "Shown after hold"],
                  ] as const).map(([label, value]) => (
                    <div key={label} className="flex items-baseline justify-between gap-3 py-2 text-label">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="text-right font-medium text-foreground">{value}</dd>
                    </div>
                  ))}
                </dl>
                {fare.remaining != null && fare.remaining < adults ? (
                  <Notice tone="critical" className="mt-2">Only {fare.remaining} {fare.remaining === 1 ? "seat" : "seats"} left. Search again with fewer adults.</Notice>
                ) : !fare.can_hold ? (
                  <Notice tone="action" className="mt-2">{fare.hold_unavailable_reason ?? "Holding isn't available for this provider"}.</Notice>
                ) : null}
                <Button type="submit" form={FORM_ID} variant="primary" className="mt-3 w-full" disabled={!canHold || pending}>
                  {pending ? "Holding seats…" : "Hold seats"}
                </Button>
                <p className="mt-2 text-helper text-muted-foreground">The seats are held for a limited time. The price is confirmed when the seats are held.</p>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
