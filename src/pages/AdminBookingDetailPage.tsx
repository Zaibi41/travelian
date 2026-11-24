import { useState } from "react";
import { formatDay } from "@/lib/admin-search/date-display";
import { Navigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/admin/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Input, Textarea } from "@/components/admin/ui/field";
import { DashboardErrorNotice } from "@/components/admin/dashboard/DashboardStates";
import { TabLinks } from "@/components/admin/ui/TabLinks";
import { NotAvailableTable } from "@/components/admin/bookings/NotAvailable";
import { PaymentsAndIssuing, TicketsTab } from "@/components/admin/bookings/PaymentsAndIssuing";
import { ItineraryTab } from "@/components/admin/bookings/ItineraryTab";
import { DownloadItineraryButton } from "@/components/admin/bookings/DownloadItineraryButton";
import { GroupNoCancelNotice } from "@/components/admin/bookings/GroupNoCancelNotice";
import { GroupTicketsTab } from "@/components/admin/bookings/GroupTicketsTab";
import { EmailNotSentNotice } from "@/components/admin/bookings/EmailNotSentNotice";
import { SupplierBookingCard } from "@/components/admin/bookings/SupplierBookingCard";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { GROUP_TICKETING_LABEL } from "@/lib/admin-search/group-holds";
import { SampleDataBadge, StatusChips } from "@/components/admin/bookings/BookingChips";
import { BookingHeading } from "@/components/admin/bookings/BookingHeading";
import { acknowledgedBy } from "@/lib/group-fare-terms";
import { GatewayError } from "@/lib/gateway/client";
import {
  BOOKING_STATUS_LABEL, ISSUANCE_STATUS_LABEL, PAYMENT_STATUS_LABEL, PRODUCT_LABEL, formatDateTime, formatMoney, formatTimeLeft, isOpenHold,
} from "@/lib/admin-bookings/format";
import { DETAIL_TABS, bookingDetailPath, type DetailTabSlug } from "@/lib/admin-bookings/tabs";
import { useBookingDetail } from "@/lib/admin-bookings/use-bookings";
import { setSellingPrice } from "@/lib/admin-bookings/api";
import type { BookingAuditEntry, BookingDetail, BookingPassenger } from "@/lib/admin-bookings/types";
import { titleText } from "@/lib/passenger-details";

// Tabs the gateway doesn't record yet: the mockup's columns with a not-available row
// (docs/backend-todo.md, Booking detail). No "Edit booking" (decided 2026-11-09).
const SHELL_TABS: Partial<Record<DetailTabSlug, { columns: string[]; what: string }>> = {
  itinerary: { columns: ["Segment", "From", "To", "Departs", "Arrives", "Airline / flight", "Fare", "Baggage"], what: "itinerary segments" },
  passengers: { columns: ["Passenger name", "Type", "Document", "Date of birth", "Nationality", "Ticket number"], what: "passengers" },
  servicing: { columns: ["Case", "Type (refund, reissue, void, cancellation)", "Opened", "Status", "Amount (Rs)", "Owner"], what: "refund, reissue, void or cancellation cases" },
  audit: { columns: ["When", "Who", "Action", "Details"], what: "an audit trail" },
};

function errorMessage(error: unknown) {
  if (error instanceof GatewayError) return error.kind === "not_found" ? "This booking wasn't found." : error.message;
  return "This booking couldn't be loaded. It will load when the service responds.";
}

// Booking detail (spec 7 "Booking detail tabs", mockups booking-detail-*). Each tab is a
// page. The gateway leaves supplier cost, margin and the Supplier payment tab out for
// viewers without the cost and margin permission (D23); the tab is hidden then.
export default function AdminBookingDetailPage() {
  const { bookingId = "", tab = "overview" } = useParams();
  const detail = useBookingDetail(bookingId);
  const booking = detail.data;
  const known = DETAIL_TABS.some(entry => entry.slug === tab);
  const visibleTabs = DETAIL_TABS.filter(entry => entry.slug !== "supplier-payment" || booking?.supplier_payment);

  if (!known) return <Navigate to={bookingDetailPath(bookingId)} replace />;
  if (detail.error && !booking) {
    return (
      <div className="flex flex-col gap-section-gap">
        <h1 className="font-display text-page-title font-bold text-foreground">Booking</h1>
        <DashboardErrorNotice message={errorMessage(detail.error)} />
      </div>
    );
  }
  if (!booking) {
    return (
      <div className="flex flex-col gap-section-gap" aria-busy="true" aria-label="Loading booking">
        <Skeleton className="h-8 w-56 rounded-sm" />
        <Skeleton className="h-control w-full rounded-sm" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }
  if (tab === "supplier-payment" && !booking.supplier_payment) return <Navigate to={bookingDetailPath(bookingId)} replace />;

  const shell = SHELL_TABS[tab as DetailTabSlug];
  return (
    <div className="flex min-w-0 flex-col gap-section-gap">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <BookingHeading bookingId={booking.booking_id} pnr={booking.pnr} className="text-foreground" />
          {booking.sample && <SampleDataBadge label={booking.sample_label} />}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusChips statuses={booking.statuses} direction="row" />
          {booking.group_ticketing_status && (
            <StatusBadge severity={booking.group_ticketing_status === "ticketed" ? "fine" : "action"}>{GROUP_TICKETING_LABEL[booking.group_ticketing_status]}</StatusBadge>
          )}
          <DownloadItineraryButton bookingId={booking.booking_id} available={booking.itinerary_available} />
        </div>
      </div>
      {booking.product === "group" && <GroupNoCancelNotice />}
      <TabLinks label="Booking" tabs={visibleTabs.map(entry => ({ to: bookingDetailPath(booking.booking_id, entry.slug), label: entry.label }))} />
      {detail.error && <DashboardErrorNotice message={errorMessage(detail.error)} />}
      {tab === "overview" && <EmailNotSentNotice booking={booking} />}
      {tab === "overview" && <Overview booking={booking} />}
      {tab === "overview" && booking.supplier_booking && <SupplierBookingCard booking={booking} />}
      {tab === "fare" && <Fare booking={booking} />}
      {tab === "supplier-payment" && booking.supplier_payment && <SupplierPaymentTab booking={booking} />}
      {tab === "payments" && <PaymentsAndIssuing booking={booking} />}
      {tab === "tickets" && (booking.product === "group" ? <GroupTicketsTab booking={booking} /> : <TicketsTab booking={booking} />)}
      {tab === "itinerary" && booking.itinerary?.length ? <ItineraryTab segments={booking.itinerary} /> : null}
      {tab === "itinerary" && booking.itinerary?.length ? null
        : tab === "passengers" && booking.passengers?.length ? <Passengers booking={booking} />
        : tab === "audit" && booking.audit?.length ? <Audit entries={booking.audit} />
        : shell && <NotAvailableTable columns={shell.columns} message={tab === "itinerary"
          ? "Not recorded for this booking. Flights are saved with holds placed from 14 November 2026."
          : `Not available yet. The gateway doesn't record ${shell.what} for bookings yet.`} />}
    </div>
  );
}

function FieldTable({ rows, label }: { rows: [string, React.ReactNode][]; label: string }) {
  return (
    <section aria-label={label} className="rounded-xl border border-border bg-card px-card py-3.5 shadow-card">
      <dl className="grid grid-cols-1 sm:grid-cols-[minmax(10rem,16rem)_minmax(0,1fr)]">
        {rows.map(([name, value]) => (
          <div key={name} className="contents">
            <dt className="border-b border-border bg-muted px-2.5 py-2 text-body font-semibold text-foreground">{name}</dt>
            <dd className="min-w-0 break-words border-b border-border px-2.5 py-2 text-body text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function deadline(value: string | null | undefined, open: boolean) {
  if (!value) return "—";
  return open ? `${formatDateTime(value)} (${formatTimeLeft(value)})` : formatDateTime(value);
}

// Owner (and Assign) and Supplier status are hidden: not recorded yet.
function Overview({ booking }: { booking: BookingDetail }) {
  return (
    <FieldTable
      label="Overview"
      rows={[
        ["Airline PNR", booking.pnr ?? "—"],
        ...(booking.product === "group" ? [["Final PNR", booking.final_pnr ?? "—"] as [string, React.ReactNode]] : []),
        ["Booking ID", booking.booking_id],
        ["Product", PRODUCT_LABEL[booking.product] ?? booking.product],
        ["Customer or agency", booking.customer_or_agency ?? "—"],
        // B20: the contact saved with the booking (who pays and is contacted). Passports and dates of birth are on Passengers.
        ...(booking.customer ? [
          ["Customer phone", <span className="tabular-nums">{booking.customer.phone}</span>],
          ["Customer email", <span className="break-all">{booking.customer.email}</span>],
        ] as [string, React.ReactNode][] : []),
        ["Booking status", BOOKING_STATUS_LABEL[booking.statuses.booking]],
        ["Payment status", PAYMENT_STATUS_LABEL[booking.statuses.payment]],
        ["Issuance status", ISSUANCE_STATUS_LABEL[booking.statuses.issuance]],
        ["Amount", <span className="tabular-nums">{formatMoney(booking.amount)}</span>],
        ["Deadline", <span className="tabular-nums">{deadline(booking.deadline, isOpenHold(booking.statuses.booking))}</span>],
        // Group bookings: the stored acknowledgement that the fare is non-refundable and non-changeable.
        ...(booking.fare_terms ? [["Fare terms", <span>Non-refundable · Non-changeable. {booking.fare_terms.text}{" "}
          <span className="text-muted-foreground">({acknowledgedBy(booking.fare_terms, formatDateTime(booking.fare_terms.acknowledged_at))})</span></span>] as [string, React.ReactNode]] : []),
      ]}
    />
  );
}

// Searched price, booked price, difference, base fare, taxes, fees, service charge and
// discount are hidden: not recorded yet. Supplier cost and margin arrive only with the
// cost and margin permission.
const TYPE_LABEL = { ADT: "Adult", CHD: "Child", INF: "Infant" } as const;

function Fare({ booking }: { booking: BookingDetail }) {
  const rows: [string, string, boolean?][] = [["Billable price", formatMoney(booking.fare.billable_price), true]];
  for (const item of booking.fare.per_passenger ?? []) {
    rows.push([`${TYPE_LABEL[item.passenger_type]} × ${item.count}, selling price each`, formatMoney(item.selling_each)]);
    if (item.supplier_cost_each) rows.push([`${TYPE_LABEL[item.passenger_type]}, supplier cost each`, formatMoney(item.supplier_cost_each)]);
  }
  if (booking.fare.supplier_cost) rows.push(["Supplier cost", formatMoney(booking.fare.supplier_cost)]);
  const profit = booking.fare.profit;
  // No real supplier cost (an imported booking, or an old one whose cost was filled in as the selling price):
  // "Not known", never a profit of 0 (travelian#91). Sent only with cost access.
  if (booking.fare.cost_unknown) {
    rows.push(["Supplier cost", "Not known"]);
    if (!profit) rows.push(["Profit", "Not known"]);
  }
  if (profit) {
    // travelian#70: the same profit as Finance > Reports and the dashboard (worked out by the gateway).
    if (profit.fees_charged.amount_minor) rows.push(["Card fees charged", formatMoney(profit.fees_charged)]);
    if (profit.supplier_charge && profit.supplier_charge_basis === "recorded") rows.push(["Supplier actual charge", formatMoney(profit.supplier_charge)]);
    rows.push(["Payment fees", profit.missing.includes("payment_fees") && !profit.payment_fees.amount_minor ? "Not recorded" : formatMoney(profit.payment_fees)]);
    if (profit.refunds.amount_minor) rows.push(["Refunds paid", formatMoney(profit.refunds)]);
    rows.push(["Profit", profit.profit ? formatMoney(profit.profit) : "Not known", true]);
  } else if (booking.fare.margin) rows.push(["Profit", formatMoney(booking.fare.margin)]);
  return (
    <div className="flex min-w-0 flex-col gap-section-gap">
      <section aria-label="Fare" className="overflow-x-auto rounded-xl border border-border bg-card px-card py-3.5 shadow-card">
        <table className="w-full min-w-[20rem] border-collapse text-table">
          <thead>
            <tr className="bg-muted text-left">
              <th scope="col" className="h-table-header px-2.5 font-semibold text-foreground">Item</th>
              <th scope="col" className="h-table-header px-2.5 font-semibold text-foreground">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([item, amount, strong]) => (
              <tr key={item} className="border-b border-border last:border-b-0">
                <td className={`h-table-row px-2.5 ${strong ? "font-semibold" : ""} text-foreground`}>{item}</td>
                <td className={`h-table-row whitespace-nowrap px-2.5 tabular-nums ${strong ? "font-semibold" : ""} text-foreground`}>{amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {booking.can_set_selling_price && booking.fare.per_passenger && <SellingPriceForm booking={booking} />}
    </div>
  );
}

/** What the customer pays per traveler, per passenger type (before any payment). Whole rupees, not below the
 *  supplier cost: the gateway checks it. */
function SellingPriceForm({ booking }: { booking: BookingDetail }) {
  const queryClient = useQueryClient();
  const items = booking.fare.per_passenger ?? [];
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map(item => [item.passenger_type, String(Math.round(item.selling_each.amount_minor / 100))])));
  const [problem, setProblem] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => setSellingPrice(booking.booking_id, items.map(item => ({
      passenger_type: item.passenger_type, selling_each: { amount_minor: Number(values[item.passenger_type]) * 100, currency: item.selling_each.currency } }))),
    onSuccess: () => { setProblem(null); void queryClient.invalidateQueries({ queryKey: ["admin-bookings"] }); },
    onError: error => setProblem(error instanceof GatewayError ? error.message : "The selling price couldn't be saved. Nothing was changed."),
  });
  const valid = items.every(item => /^[1-9]\d*$/.test(values[item.passenger_type] ?? ""));
  return (
    <section aria-labelledby="selling-price-title" className="flex flex-col gap-3 rounded-xl border border-border bg-card px-card py-3.5 shadow-card">
      <div>
        <h2 id="selling-price-title" className="text-section font-semibold text-foreground">Selling price</h2>
        <p className="text-body text-muted-foreground">What the customer pays. It can't be below the supplier cost, and can't change once a payment is recorded.</p>
      </div>
      <form className="flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); if (valid) save.mutate(); }}>
        {items.map(item => (
          <div key={item.passenger_type} className="flex w-full min-w-0 flex-col gap-1 sm:w-48">
            <label htmlFor={`selling-${item.passenger_type}`} className="text-label font-medium text-foreground">{TYPE_LABEL[item.passenger_type]} (Rs each)</label>
            <Input id={`selling-${item.passenger_type}`} inputMode="numeric" maxLength={9} value={values[item.passenger_type] ?? ""}
              onChange={event => setValues({ ...values, [item.passenger_type]: event.target.value.replace(/[^\d]/g, "") })} />
          </div>
        ))}
        <Button type="submit" variant="outline" disabled={!valid || save.isPending}>{save.isPending ? "Saving…" : "Save selling price"}</Button>
      </form>
      {problem && <p role="alert" className="text-helper text-status-critical-text">{problem}</p>}
    </section>
  );
}

const PAID_FROM_LABEL = { bank: "Bank", supplier_wallet: "Supplier wallet", credit: "Credit" } as const;

// Confirmation is hidden: not recorded yet. Transfer reference, time sent and paid from show once recorded at
// Mark as issued (issue 202); the amount due is what the supplier billed once it's recorded, else the hold-time cost.
function SupplierPaymentTab({ booking }: { booking: BookingDetail }) {
  const payment = booking.supplier_payment!;
  const due = payment.billed ?? payment.amount_due;
  const rows: [string, React.ReactNode][] = [["Amount due", <span className="tabular-nums">{due ? formatMoney(due) : "—"}</span>]];
  if (payment.transfer_reference) rows.push(["Transfer reference", <span className="break-all">{payment.transfer_reference}</span>]);
  if (payment.time_sent) rows.push(["Time sent", <span className="tabular-nums">{formatDateTime(payment.time_sent)}</span>]);
  if (payment.paid_from) rows.push(["Paid from", PAID_FROM_LABEL[payment.paid_from]]);
  rows.push(["Hold deadline", <span className="tabular-nums">{formatDateTime(payment.hold_deadline)}</span>]);
  return <FieldTable label="Supplier payment" rows={rows} />;
}

const PASSENGER_TYPE: Record<BookingPassenger["type"], string> = { ADT: "Adult", CHD: "Child", INF: "Infant" };
const ID_TYPE: Record<BookingPassenger["id_type"], string> = { PSPT: "Passport", NATI: "National ID" };

function Cell({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return <td className={`h-table-row max-w-[14rem] px-2.5 ${muted ? "text-muted-foreground" : "text-foreground"}`}><span className="line-clamp-2 break-words">{children}</span></td>;
}

// Passengers tab (mockup booking-detail-passengers): the full passport or ID number and date of birth, as stored.
function Passengers({ booking }: { booking: BookingDetail }) {
  const passengers = booking.passengers ?? [];
  const columns = ["Passenger name", "Type", "Document", "Date of birth", "Nationality", "Ticket number"];
  return (
    <section aria-label="Passengers" className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-xl border border-border bg-card px-card py-3.5 shadow-card">
        <table className="w-full min-w-[44rem] border-collapse text-table">
          <thead>
            <tr className="bg-muted text-left">
              {columns.map(column => <th key={column} scope="col" className="h-table-header px-2.5 font-semibold text-foreground">{column}</th>)}
            </tr>
          </thead>
          <tbody>
            {passengers.map(passenger => {
              const name = [titleText(passenger.title), passenger.first_name, passenger.last_name].filter(Boolean).join(" ");
              const type = PASSENGER_TYPE[passenger.type] + (passenger.type === "INF" && passenger.infant_of_position != null ? ` (with passenger ${passenger.infant_of_position + 1})` : "");
              return (
                <tr key={passenger.position} className="border-b border-border last:border-b-0">
                  <Cell>{name}</Cell>
                  <Cell>{type}</Cell>
                  <Cell muted={!passenger.document_number}>{ID_TYPE[passenger.id_type]} {passenger.document_number ?? "—"}</Cell>
                  <Cell>{formatDay(passenger.date_of_birth)}</Cell>
                  <Cell muted={!passenger.nationality}>{passenger.nationality ?? "—"}</Cell>
                  <Cell muted={!passenger.ticket_number}>{passenger.ticket_number ?? "—"}</Cell>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const AUDIT_ACTION: Record<string, string> = { hold_created: "Hold created", identity_revealed: "Identity revealed", fare_terms_acknowledged: "Fare terms acknowledged",
  final_pnr_recorded: "Final PNR recorded", ticket_numbers_recorded: "Ticket numbers recorded", group_ticketed: "Ticketed",
  issuance_recorded_offline: "Marked as issued", due_settled: "Due settled", ticket_document_attached: "Ticket document attached" };
const FARE_CHECK: Record<string, string> = { matches: "total verified", differs: "total differs", no_total: "total not verified", failed: "total not verified" };
const REVEALED_FIELD: Record<string, string> = { date_of_birth: "date of birth", document_number: "document number", document_expiry: "document expiry" };

function auditDetails(entry: BookingAuditEntry) {
  const d = entry.details as Record<string, unknown>;
  if (entry.action === "hold_created") {
    return [d.pnr && `PNR ${d.pnr}`, d.time_limit && `time limit ${d.time_limit}`, typeof d.travelers === "number" && `${d.travelers} ${d.travelers === 1 ? "traveler" : "travelers"}`,
      typeof d.fare_info === "string" && (FARE_CHECK[d.fare_info] ?? d.fare_info), d.label].filter(Boolean).join(" · ");
  }
  if (entry.action === "identity_revealed") {
    const fields = Array.isArray(d.fields) ? d.fields.map(field => REVEALED_FIELD[String(field)] ?? String(field)).join(", ") : "";
    return [typeof d.traveler_position === "number" && `Passenger ${d.traveler_position + 1}`, fields, d.reason && `Reason: ${d.reason}`].filter(Boolean).join(" · ");
  }
  if (entry.action === "fare_terms_acknowledged") {
    return [d.terms_text, d.terms_version && `version ${d.terms_version}`, d.acknowledged_by && `ticked by ${d.acknowledged_by}`].filter(Boolean).join(" · ");
  }
  if (entry.action === "final_pnr_recorded") {
    return [d.final_pnr && `Final PNR ${d.final_pnr}`, d.previous_final_pnr && `was ${d.previous_final_pnr}`].filter(Boolean).join(" · ");
  }
  if (entry.action === "ticket_numbers_recorded" || entry.action === "group_ticketed") {
    return [d.final_pnr && `Final PNR ${d.final_pnr}`, typeof d.tickets === "number" && `${d.tickets} ${d.tickets === 1 ? "ticket" : "tickets"}`,
      typeof d.travelers === "number" && `of ${d.travelers} travelers`].filter(Boolean).join(" ");
  }
  if (entry.action === "due_settled") {
    const rupees = (minor: unknown) => typeof minor === "number" ? formatMoney({ amount_minor: minor, currency: String(d.currency ?? "PKR") }) : null;
    return [rupees(d.waived_minor) && `${rupees(d.waived_minor)} waived`, rupees(d.previous_total_minor) && `total was ${rupees(d.previous_total_minor)}`,
      d.reason && `Reason: ${d.reason}`].filter(Boolean).join(" · ");
  }
  if (entry.action === "issuance_recorded_offline") {
    return [typeof d.tickets === "number" && `${d.tickets} ${d.tickets === 1 ? "ticket" : "tickets"}`, d.ticket_document && "ticket document attached",
      d.note].filter(Boolean).join(" · ");
  }
  if (entry.action === "ticket_document_attached") return d.replaced ? "Replaced the earlier document" : "";
  return Object.entries(d).map(([key, value]) => `${key.replace(/_/g, " ")}: ${String(value)}`).join(" · ");
}

function who(entry: BookingAuditEntry) {
  if (!entry.actor_user_id) return "System";
  const role = entry.actor_role ? entry.actor_role.replace(/_/g, " ").replace(/\b\w/g, letter => letter.toUpperCase()) : "User";
  return `${role} · ${entry.actor_user_id.slice(0, 8)}`;
}

// Audit tab (mockup booking-detail-audit): When, Who, Action, Details. User names aren't
// stored in the gateway yet, so Who is the role and a short user reference.
function Audit({ entries }: { entries: BookingAuditEntry[] }) {
  return (
    <section aria-label="Audit" className="overflow-x-auto rounded-xl border border-border bg-card px-card py-3.5 shadow-card">
      <table className="w-full min-w-[40rem] border-collapse text-table">
        <thead>
          <tr className="bg-muted text-left">
            {["When", "Who", "Action", "Details"].map(column => <th key={column} scope="col" className="h-table-header px-2.5 font-semibold text-foreground">{column}</th>)}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr key={`${entry.at}-${index}`} className="border-b border-border last:border-b-0">
              <td className="h-table-row whitespace-nowrap px-2.5 tabular-nums text-foreground">{formatDateTime(entry.at)}</td>
              <Cell>{who(entry)}</Cell>
              <Cell>{AUDIT_ACTION[entry.action] ?? entry.action.replace(/_/g, " ")}</Cell>
              <Cell>{auditDetails(entry)}</Cell>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
