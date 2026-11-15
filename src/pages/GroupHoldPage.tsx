import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Notice } from "@/components/admin/ui/feedback";
import { NotAvailableNotice } from "@/components/admin/bookings/NotAvailable";
import {
  AdminOnlyCost, BookingHoldColumns, BookingHoldForm, BookingHoldLayout, FarePanel, NO_ERRORS, customerCard, fieldErrorMap, money, passengerRequest,
  passengerText, type BookingValues, type FormErrors,
} from "@/components/admin/search/BookingHoldForm";
import { GatewayError } from "@/lib/gateway/client";
import { baggageText, parseGroupSearch, sourceLine } from "@/lib/admin-search/group-ticketing";
import { departureText, fetchGroupTicket, gatewayMessage, groupHeldPath, groupResultsPath, holdGroupSeats, type GroupHoldRequest } from "@/lib/admin-search/group-holds";

const FORM_ID = "group-hold-form";

/** The Group Ticketing hold request from the shared form: adults only, with each traveler's gender. */
export function groupHoldRequest(ticketId: string, { customer, travelers, sellingPerAdult }: BookingValues): GroupHoldRequest {
  return {
    ticket_id: ticketId,
    adults: travelers.length,
    contact: customerCard(customer),
    ...(sellingPerAdult ? { selling_price_per_adult: sellingPerAdult } : {}),
    passengers: travelers.map((traveler, index) => passengerRequest(traveler, index, customer, true)),
  } as GroupHoldRequest;
}

// Hold group seats, step 2 of 4 (mockup PDF docs/2026-11-14 page 10), on the shared booking form.
// The fare and the search are in the URL (?ticket=…&from=…&to=…&date=…&adults=…); the fare is
// checked with the gateway again, so seats left and the stock label are current.
export default function GroupHoldPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const ticketId = params.get("ticket") ?? "";
  const search = parseGroupSearch(params);
  const adults = search.adults;
  const results = groupResultsPath(search);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<FormErrors>(NO_ERRORS);
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

  const submit = async (values: BookingValues) => {
    setPending(true);
    setErrors(NO_ERRORS);
    try {
      const view = await holdGroupSeats(groupHoldRequest(ticketId, values));
      navigate(groupHeldPath(view.booking_id), { state: view });
    } catch (error) {
      setErrors({
        fields: error instanceof GatewayError ? fieldErrorMap(error.fieldErrors) : {},
        message: gatewayMessage(error, "The seats couldn't be held. Nothing was held. Try again."),
      });
    } finally {
      setPending(false);
    }
  };

  const baggage = fare ? baggageText(fare.baggage, fare.hand_carry) : null;
  return (
    <BookingHoldLayout backTo={results} title="Hold group seats" subtitle="Enter the customer and traveler details, then hold the seats.">
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
        <BookingHoldColumns
          form={<BookingHoldForm formId={FORM_ID} counts={{ adults, children: 0, infants: 0 }} canSubmit={canHold && !pending}
            onSubmit={values => void submit(values)} errors={errors} defaultSelling={fare?.selling_price ?? null} />}
          panel={
            <FarePanel
              title="Selected group fare" formId={FORM_ID} canHold={canHold} pending={pending}
              footnote="The seats are held for a limited time. Payment and issuing happen on the booking's Payments tab."
              pricing={<p className="text-label text-muted-foreground">The price is confirmed when the seats are held.</p>}
              adminOnly={fare && <AdminOnlyCost provider={fare.supplier} source={sourceLine(fare.group_source)}
                supplierCost={fare.supplier_cost ? `${money(fare.supplier_cost)} per adult` : null} />}
              notice={!fare ? null : fare.remaining != null && fare.remaining < adults ? (
                <Notice tone="critical">Only {fare.remaining} {fare.remaining === 1 ? "seat" : "seats"} left. Search again with fewer adults.</Notice>
              ) : !fare.can_hold ? (
                <Notice tone="action">{fare.hold_unavailable_reason ?? "Holding isn't available for this provider"}.</Notice>
              ) : null}
            >
              {!fare ? (
                <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading the selected fare">
                  <Skeleton className="h-5 w-32 rounded-sm" /><Skeleton className="h-4 w-44 rounded-sm" /><Skeleton className="h-control w-full rounded-md" />
                </div>
              ) : (
                <>
                  <div className="min-w-0">
                    <p className="truncate text-body font-semibold text-foreground" title={fare.airline ?? undefined}>{fare.airline ?? "Group fare"}</p>
                    <p className="truncate text-label text-muted-foreground">{fare.sector ?? "—"}, {departureText(fare.departure_date, fare.departure_time) ?? "—"}</p>
                  </div>
                  <dl className="flex flex-col border-t border-border">
                    {([
                      ["Passengers", passengerText({ adults, children: 0, infants: 0 })],
                      ["Stock", fare.stock === "owned" ? "Owned" : "Supplier"],
                      ...(baggage ? [["Baggage", baggage]] : []),
                      ["Price", fare.selling_price ? `${money(fare.selling_price)} per adult` : "Shown after hold"],
                    ] as [string, string][]).map(([label, value]) => (
                      <div key={label} className="flex items-baseline justify-between gap-3 py-2 text-label">
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="min-w-0 truncate text-right font-medium text-foreground" title={value}>{value}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}
            </FarePanel>
          }
        />
      )}
    </BookingHoldLayout>
  );
}
