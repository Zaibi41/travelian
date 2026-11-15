import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { NotAvailableNotice } from "@/components/admin/bookings/NotAvailable";
import {
  AdminOnlyCost, BookingHoldColumns, BookingHoldForm, BookingHoldLayout, FarePanel, NO_ERRORS, customerCard, fieldErrorMap, money, passengerRequest,
  type BookingValues, type FormErrors,
} from "@/components/admin/search/BookingHoldForm";
import { FareCheckDialog } from "@/components/admin/search/FareCheckDialog";
import { FareConfirmedTimer, FlightFareDetails, fareProviders } from "@/components/admin/search/SelectedFareSummary";
import { useCountdown } from "@/components/admin/search/FlightsSearch";
import { GatewayError } from "@/lib/gateway/client";
import { holdFlight, repriceFlights, writeFlightSearch } from "@/lib/admin-search/flights";
import { HOLD_RESULT_PATH, fareCheckFailure, type FareCheckState, type HoldDraft, type HoldRequest } from "@/lib/admin-search/hold";

const FORM_ID = "flight-hold-form";
const RESULT_CODES = new Set(["booking_off", "not_confirmed_hold", "not_saved", "total_unverified"]);
const RECHECK_CODES = new Set(["price_changed", "price_not_accepted", "confirm_total", "quote_expired"]);

/** The Flights hold request from the shared form: the gateway's quote and confirmed total, the customer card, every traveler. */
export function flightHoldRequest(draft: HoldDraft, { customer, travelers }: BookingValues): HoldRequest {
  return {
    quote_id: draft.quote.quote_id,
    confirmed_total: draft.quote.new_total,
    accept_price_change: draft.acceptPriceChange,
    customer: customerCard(customer),
    passengers: travelers.map((traveler, index) => passengerRequest(traveler, index, customer, false)),
  } as HoldRequest;
}

// Hold flight / Book flight on the shared booking form. Opened by the fare check with the gateway's
// quote in the router state; without it (reload, direct link) the fare must be checked again.
export default function HoldFlightPage() {
  const location = useLocation();
  const [params] = useSearchParams();
  // The draft changes when the fare is checked again (new quote, accepted price change).
  const [draft, setDraft] = useState<HoldDraft | null>(() => (location.state as HoldDraft | null) ?? null);
  const mode = params.get("mode") === "book" ? "book" : "hold";
  const title = mode === "book" ? "Book flight" : "Hold flight";
  const results = useMemo(() => (draft ? `/admin/search?${writeFlightSearch(new URLSearchParams("tab=flights"), draft.request).toString()}` : "/admin/search?tab=flights"), [draft]);
  return (
    <BookingHoldLayout backTo={results} title={title} subtitle="Enter the customer and traveler details, then hold the seats.">
      {draft?.quote ? <FlightHold draft={draft} mode={mode} results={results} onDraft={setDraft} /> : (
        <NotAvailableNotice title="This fare check has ended">
          Choose the fare again from the search results: the fare is checked with the supplier before booking.{" "}
          <Link to="/admin/search?tab=flights" className="font-medium text-teal hover:underline">Back to search</Link>
        </NotAvailableNotice>
      )}
    </BookingHoldLayout>
  );
}

function FlightHold({ draft, mode, results, onDraft }: { draft: HoldDraft; mode: HoldDraft["mode"]; results: string; onDraft: (next: HoldDraft) => void }) {
  const navigate = useNavigate();
  const [errors, setErrors] = useState<FormErrors>(NO_ERRORS);
  const [pending, setPending] = useState(false);
  const [check, setCheck] = useState<FareCheckState | null>(null);
  const countdown = useCountdown(draft.quote.expires_at);
  const rechecked = useRef<string | null>(null);
  const { quote } = draft;

  /** Fare check again (timer ran out, or the hold found the price or quote changed). */
  const recheck = async (alwaysAsk: boolean) => {
    rechecked.current = draft.quote.quote_id;
    try {
      const next = await repriceFlights(draft.searchId, draft.picks.map(pick => pick.fare.id));
      const moved = next.new_total.amount_minor !== draft.quote.new_total.amount_minor || next.new_total.currency !== draft.quote.new_total.currency;
      if (moved || (alwaysAsk && next.price_changed)) setCheck({ kind: "changed", quote: next });
      else onDraft({ ...draft, quote: next, confirmedAt: new Date().toISOString() });
    } catch (error) {
      setCheck(fareCheckFailure(error));
    }
  };

  useEffect(() => {
    if (countdown && countdown.seconds === 0 && rechecked.current !== draft.quote.quote_id) void recheck(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-check once per quote when its timer ends
  }, [countdown?.seconds, draft.quote.quote_id]);

  const submit = async (values: BookingValues) => {
    setPending(true);
    setErrors(NO_ERRORS);
    try {
      const hold = await holdFlight(flightHoldRequest(draft, values));
      navigate(HOLD_RESULT_PATH, { state: { kind: "held", hold, mode } });
    } catch (error) {
      if (error instanceof GatewayError && error.code && RESULT_CODES.has(error.code)) {
        navigate(HOLD_RESULT_PATH, { state: { kind: "problem", code: error.code, message: error.message, extra: error.extra, mode, draft } });
        return;
      }
      if (error instanceof GatewayError && error.code && RECHECK_CODES.has(error.code)) {
        setErrors({ fields: {}, message: error.message });
        await recheck(true);
        return;
      }
      setErrors({
        fields: error instanceof GatewayError ? fieldErrorMap(error.fieldErrors) : {},
        message: error instanceof Error ? error.message : "The hold couldn't be placed. Try again.",
      });
    } finally {
      setPending(false);
    }
  };

  const counts = { adults: draft.request.adults, children: draft.request.children, infants: draft.request.infants };
  return (
    <>
      <BookingHoldColumns
        form={<BookingHoldForm formId={FORM_ID} counts={counts} canSubmit={!pending && check === null} onSubmit={values => void submit(values)} errors={errors} />}
        panel={
          <FarePanel
            title="Selected fare" formId={FORM_ID} canHold={check === null} pending={pending}
            footnote={mode === "book"
              ? "Holding reserves the seats until the time limit. Payment and issuing happen on the booking's Payments tab."
              : "Holding reserves the seats until the time limit. No payment is taken."}
            pricing={<FareConfirmedTimer draft={draft} />}
            adminOnly={<AdminOnlyCost provider={fareProviders(draft).join(", ") || null} supplierCost={money(quote.supplier_total)} margin={money(quote.margin)} />}
          >
            <FlightFareDetails draft={draft} />
          </FarePanel>
        }
      />
      <FareCheckDialog
        state={check}
        onCancel={() => setCheck(null)}
        onBack={() => navigate(results)}
        onContinue={() => {
          if (check?.kind !== "changed") return;
          onDraft({ ...draft, quote: check.quote, acceptPriceChange: true, confirmedAt: new Date().toISOString() });
          setCheck(null);
          setErrors(NO_ERRORS);
        }}
        onTryAgain={() => { setCheck(null); void recheck(false); }}
        onSearchAgain={() => navigate(results)}
        onEditSearch={() => navigate(results)}
      />
    </>
  );
}
