import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/admin/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { NotAvailableNotice } from "@/components/admin/bookings/NotAvailable";
import { useCountdown } from "@/components/admin/search/FlightsSearch";
import { formatMoney } from "@/lib/admin-bookings/format";
import { bookingDetailPath } from "@/lib/admin-bookings/tabs";
import { useBookingDetail } from "@/lib/admin-bookings/use-bookings";
import type { BookingPassenger } from "@/lib/admin-bookings/types";
import { writeFlightSearch } from "@/lib/admin-search/flights";
import { HOLD_PATH, type HoldDraft, type HoldMode, type HoldView } from "@/lib/admin-search/hold";
import { format } from "date-fns";

export type HoldResultState =
  | { kind: "held"; hold: HoldView; mode: HoldMode }
  | { kind: "problem"; code: string; message: string; extra: Record<string, unknown>; mode: HoldMode; draft?: HoldDraft };

const SEARCH = "/admin/search?tab=flights";

// Hold result (mockup flights-hold-result). Facts come from the gateway: the hold answer, then the
// saved booking (customer and masked travelers). Problems show the gateway's own sentence.
export default function HoldResultPage() {
  const state = useLocation().state as HoldResultState | null;
  return (
    <div className="flex min-w-0 flex-col gap-section-gap">
      <nav aria-label="Breadcrumb" className="text-body text-muted-foreground">
        <Link to={SEARCH} className="hover:underline">Search</Link> › <Link to={SEARCH} className="hover:underline">Flights</Link> › Hold flight › Result
      </nav>
      <h1 className="font-display text-page-title font-bold text-foreground">Hold result</h1>
      {state?.kind === "held" ? <Held hold={state.hold} />
        : state?.kind === "problem" ? <Problem state={state} />
        : (
          <NotAvailableNotice title="No hold to show">
            Hold results are shown right after a hold. Open the booking from Bookings, or{" "}
            <Link to={SEARCH} className="font-medium text-teal hover:underline">go back to search</Link>.
          </NotAvailableNotice>
        )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border border-border px-3 py-2.5">
      <p className="text-label text-muted-foreground">{label}</p>
      <p className="truncate text-section font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function Held({ hold }: { hold: HoldView }) {
  const countdown = useCountdown(hold.time_limit ?? undefined);
  const timeLeft = !hold.time_limit ? "—" : countdown && countdown.seconds > 0
    ? `${String(Math.floor(countdown.seconds / 3600)).padStart(2, "0")}:${String(Math.floor((countdown.seconds % 3600) / 60)).padStart(2, "0")}:${String(countdown.seconds % 60).padStart(2, "0")}`
    : "Expired";
  const until = hold.time_limit ? new Date(hold.time_limit) : null;
  return (
    <>
      <section aria-label="Hold confirmed" className="flex flex-col gap-3 rounded-xl border border-border border-l-4 border-l-status-fine bg-card px-card py-3.5 shadow-card">
        <div className="flex flex-wrap gap-1.5">
          <StatusBadge severity="fine">Hold confirmed</StatusBadge>
          {hold.label && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-label font-medium text-primary">{hold.label}</span>}
        </div>
        <div>
          <h2 className="text-section font-semibold text-foreground">
            {until ? `Seats are held until ${format(until, "d MMM yyyy")} at ${format(until, "HH:mm")}` : "Seats are held"}
          </h2>
          <p className="text-body text-muted-foreground">No payment has been taken. The customer must pay before the time limit or the seats are released.</p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <Fact label="Travelian reference" value={hold.booking_id} />
          <Fact label="Airline PNR" value={hold.pnr} />
          <Fact label="Time left" value={timeLeft} />
          <Fact label="Total" value={formatMoney(hold.selling_total)} />
          {/* Cost and profit only when the gateway sends them (cost and margin access); they reflect the airline's price at the hold. */}
          {hold.supplier_cost && <Fact label="Supplier cost" value={formatMoney(hold.supplier_cost)} />}
          {hold.profit && <Fact label="Profit" value={formatMoney(hold.profit)} />}
        </div>
        {hold.warnings && hold.warnings.length > 0 && (
          <ul aria-label="Warnings" className="flex flex-col gap-1">
            {hold.warnings.map(warning => (
              <li key={warning} className="flex items-start gap-2 text-body text-foreground"><StatusBadge severity="action">Check</StatusBadge>{warning}</li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="primary"><Link to={bookingDetailPath(hold.booking_id)}>View booking</Link></Button>
          <Button asChild variant="outline"><Link to={SEARCH}>Back to search</Link></Button>
        </div>
      </section>
      <People bookingId={hold.booking_id} />
      <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-body text-foreground">
        A held booking appears in Bookings as Flights, status Held, unpaid, not issued, with the hold deadline. The Passengers tab in Booking detail shows the saved travelers with masked documents.
      </p>
    </>
  );
}

const TYPE: Record<BookingPassenger["type"], string> = { ADT: "Adult", CHD: "Child", INF: "Infant" };

/** Customer and travelers as the gateway saved them (masked). */
function People({ bookingId }: { bookingId: string }) {
  const detail = useBookingDetail(bookingId);
  const booking = detail.data;
  if (detail.isPending) return <Skeleton className="h-40 rounded-xl" aria-label="Loading customer and travelers" />;
  if (!booking) return <NotAvailableNotice title="Customer and travelers can't be shown right now">Open the booking to see them.</NotAvailableNotice>;
  const customer = booking.customer;
  return (
    <div className="grid min-w-0 grid-cols-1 gap-section-gap lg:grid-cols-2">
      <section aria-label="Customer" className="min-w-0 rounded-xl border border-border bg-card px-card py-3.5 shadow-card">
        <h2 className="mb-2 text-section font-semibold text-foreground">Customer</h2>
        <dl className="grid grid-cols-[minmax(5rem,8rem)_minmax(0,1fr)] text-body">
          {([["Name", customer ? `${customer.first_name} ${customer.last_name}` : "—"], ["Phone", customer?.phone ?? "—"], ["Email", customer?.email ?? "—"]] as const).map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="border-t border-border py-2 text-muted-foreground">{label}</dt>
              <dd className="min-w-0 truncate border-t border-border py-2 text-foreground" title={value}>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section aria-label="Travelers" className="min-w-0 rounded-xl border border-border bg-card px-card py-3.5 shadow-card">
        <h2 className="mb-2 text-section font-semibold text-foreground">Travelers</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[26rem] border-collapse text-table">
            <thead>
              <tr className="bg-muted text-left">
                {["Name", "Type", "Document", "Date of birth"].map(column => <th key={column} scope="col" className="h-table-header px-2.5 font-semibold text-foreground">{column}</th>)}
              </tr>
            </thead>
            <tbody>
              {(booking.passengers ?? []).map(passenger => (
                <tr key={passenger.position} className="border-b border-border last:border-b-0">
                  <td className="h-table-row max-w-[12rem] truncate px-2.5 text-foreground">{passenger.first_name} {passenger.last_name}</td>
                  <td className="h-table-row px-2.5 text-foreground">{TYPE[passenger.type]}{passenger.type === "INF" && passenger.infant_of_position != null ? ` with Adult ${adultNumber(booking.passengers ?? [], passenger.infant_of_position)}` : ""}</td>
                  <td className="h-table-row px-2.5 tabular-nums text-foreground">{passenger.document_number_masked ?? "—"}</td>
                  <td className="h-table-row px-2.5 tabular-nums text-foreground">{passenger.date_of_birth_masked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-body text-muted-foreground">Documents and dates of birth are masked. Reveal is logged.</p>
      </section>
    </div>
  );
}

/** "Adult n" for the adult at a booking position (adults counted in booking order). */
function adultNumber(passengers: BookingPassenger[], position: number) {
  return passengers.filter(passenger => passenger.type === "ADT" && passenger.position <= position).length;
}

const PROBLEMS: Record<string, { badge: string; severity: "action" | "critical" | "neutral"; title: string }> = {
  total_unverified: { badge: "Needs attention", severity: "action", title: "Hold created, but its total couldn't be verified" },
  not_saved: { badge: "Action needed now", severity: "critical", title: "The hold was created but couldn't be saved" },
  not_confirmed_hold: { badge: "Not confirmed", severity: "critical", title: "The supplier didn't confirm the hold" },
  booking_off: { badge: "Not available", severity: "neutral", title: "Booking is turned off" },
};

function Problem({ state }: { state: Extract<HoldResultState, { kind: "problem" }> }) {
  const navigate = useNavigate();
  const problem = PROBLEMS[state.code] ?? { badge: "Not confirmed", severity: "critical" as const, title: "The hold didn't go through" };
  const pnr = typeof state.extra.pnr === "string" ? state.extra.pnr : null;
  const bookingId = typeof state.extra.booking_id === "string" ? state.extra.booking_id : null;
  const results = state.draft ? `/admin/search?${writeFlightSearch(new URLSearchParams("tab=flights"), state.draft.request).toString()}` : SEARCH;
  const copyPnr = async () => {
    if (!pnr) return;
    try {
      await navigator.clipboard.writeText(pnr);
      toast.success(`PNR ${pnr} copied`);
    } catch {
      toast.error(`Copy didn't work. The PNR is ${pnr}.`);
    }
  };
  const border = problem.severity === "action" ? "border-l-status-action" : problem.severity === "critical" ? "border-l-status-critical" : "border-l-border";
  return (
    <section aria-label={problem.title} className={`flex flex-col gap-3 rounded-xl border border-border border-l-4 ${border} bg-card px-card py-3.5 shadow-card`}>
      <div>
        {problem.severity === "neutral"
          ? <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-label font-semibold text-foreground">{problem.badge}</span>
          : <StatusBadge severity={problem.severity}>{problem.badge}</StatusBadge>}
      </div>
      <div>
        <h2 className="text-section font-semibold text-foreground">{problem.title}</h2>
        <p className="text-body text-muted-foreground">{state.message}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {state.code === "total_unverified" && bookingId && (
          <Button asChild variant="primary"><Link to={bookingDetailPath(bookingId)}>View booking</Link></Button>
        )}
        {(state.code === "total_unverified" || state.code === "not_saved") && pnr && (
          <Button type="button" variant="outline" onClick={() => void copyPnr()}>Copy PNR</Button>
        )}
        {state.code === "not_confirmed_hold" && state.draft && (
          <Button type="button" variant="outline" onClick={() => navigate(`${HOLD_PATH}?mode=${state.mode}`, { state: state.draft })}>Back to the hold form</Button>
        )}
        {state.code === "booking_off"
          ? <Button asChild variant="outline"><Link to={results}>Back to results</Link></Button>
          : state.code !== "total_unverified" && <Button asChild variant="outline"><Link to={SEARCH}>Back to search</Link></Button>}
      </div>
    </section>
  );
}
