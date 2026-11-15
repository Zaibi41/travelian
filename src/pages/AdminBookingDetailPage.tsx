import { useState } from "react";
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
import { SampleDataBadge, StatusChips } from "@/components/admin/bookings/BookingChips";
import { GatewayError } from "@/lib/gateway/client";
import {
  BOOKING_STATUS_LABEL, ISSUANCE_STATUS_LABEL, PAYMENT_STATUS_LABEL, PRODUCT_LABEL, formatDateTime, formatMoney, formatTimeLeft, isOpenHold,
} from "@/lib/admin-bookings/format";
import { DETAIL_TABS, bookingDetailPath, type DetailTabSlug } from "@/lib/admin-bookings/tabs";
import { useBookingDetail } from "@/lib/admin-bookings/use-bookings";
import { revealTraveler, setSellingPrice } from "@/lib/admin-bookings/api";
import type { BookingAuditEntry, BookingDetail, BookingPassenger, RevealResponse } from "@/lib/admin-bookings/types";

// Tabs the gateway doesn't record yet: the mockup's columns with a not-available row
// (docs/backend-todo.md, Booking detail). No "Edit booking" (decided 2026-11-09).
const SHELL_TABS: Partial<Record<DetailTabSlug, { columns: string[]; what: string }>> = {
  itinerary: { columns: ["Segment", "From", "To", "Departs", "Arrives", "Airline / flight", "Fare", "Baggage"], what: "itinerary segments" },
  passengers: { columns: ["Passenger name", "Type", "Document (masked)", "Date of birth (masked)", "Nationality", "Ticket number"], what: "passengers" },
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
          <h1 className="min-w-0 break-all font-display text-page-title font-bold text-foreground">Booking {booking.pnr ?? booking.booking_id}</h1>
          {booking.sample && <SampleDataBadge label={booking.sample_label} />}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusChips statuses={booking.statuses} direction="row" />
          <DownloadItineraryButton bookingId={booking.booking_id} />
        </div>
      </div>
      <TabLinks label="Booking" tabs={visibleTabs.map(entry => ({ to: bookingDetailPath(booking.booking_id, entry.slug), label: entry.label }))} />
      {detail.error && <DashboardErrorNotice message={errorMessage(detail.error)} />}
      {tab === "overview" && <Overview booking={booking} />}
      {tab === "fare" && <Fare booking={booking} />}
      {tab === "supplier-payment" && booking.supplier_payment && <SupplierPaymentTab booking={booking} />}
      {tab === "payments" && <PaymentsAndIssuing booking={booking} />}
      {tab === "tickets" && <TicketsTab booking={booking} />}
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
        ["Booking ID", booking.booking_id],
        ["Product", PRODUCT_LABEL[booking.product] ?? booking.product],
        ["Customer or agency", booking.customer_or_agency ?? "—"],
        ["Booking status", BOOKING_STATUS_LABEL[booking.statuses.booking]],
        ["Payment status", PAYMENT_STATUS_LABEL[booking.statuses.payment]],
        ["Issuance status", ISSUANCE_STATUS_LABEL[booking.statuses.issuance]],
        ["Amount", <span className="tabular-nums">{formatMoney(booking.amount)}</span>],
        ["Deadline", <span className="tabular-nums">{deadline(booking.deadline, isOpenHold(booking.statuses.booking))}</span>],
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
  if (booking.fare.margin) rows.push(["Profit", formatMoney(booking.fare.margin)]);
  // No real supplier cost (e.g. an imported booking): n/a, never a profit of 0. Sent only with cost access.
  if (booking.fare.cost_unknown) rows.push(["Supplier cost", "n/a"], ["Profit", "n/a"]);
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

// Transfer reference, time sent, confirmation and paid from are hidden: not recorded yet.
function SupplierPaymentTab({ booking }: { booking: BookingDetail }) {
  const payment = booking.supplier_payment!;
  return (
    <FieldTable
      label="Supplier payment"
      rows={[
        ["Amount due", <span className="tabular-nums">{payment.amount_due ? formatMoney(payment.amount_due) : "—"}</span>],
        ["Hold deadline", <span className="tabular-nums">{formatDateTime(payment.hold_deadline)}</span>],
      ]}
    />
  );
}

const PASSENGER_TYPE: Record<BookingPassenger["type"], string> = { ADT: "Adult", CHD: "Child", INF: "Infant" };
const ID_TYPE: Record<BookingPassenger["id_type"], string> = { PSPT: "Passport", NATI: "National ID" };

function Cell({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return <td className={`h-table-row max-w-[14rem] px-2.5 ${muted ? "text-muted-foreground" : "text-foreground"}`}><span className="line-clamp-2 break-words">{children}</span></td>;
}

// Passengers tab (mockup booking-detail-passengers): passport and date of birth masked by the
// gateway; the full values only through the logged reveal, for viewers the gateway allows.
function Passengers({ booking }: { booking: BookingDetail }) {
  const [revealing, setRevealing] = useState<BookingPassenger | null>(null);
  const passengers = booking.passengers ?? [];
  const columns = ["Passenger name", "Type", "Document (masked)", "Date of birth (masked)", "Nationality", "Ticket number", ...(booking.can_reveal_identity ? ["Actions"] : [])];
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
              const name = [passenger.title, passenger.first_name, passenger.last_name].filter(Boolean).join(" ");
              const type = PASSENGER_TYPE[passenger.type] + (passenger.type === "INF" && passenger.infant_of_position != null ? ` (with passenger ${passenger.infant_of_position + 1})` : "");
              return (
                <tr key={passenger.position} className="border-b border-border last:border-b-0">
                  <Cell>{name}</Cell>
                  <Cell>{type}</Cell>
                  <Cell muted={!passenger.document_number_masked}>{ID_TYPE[passenger.id_type]} {passenger.document_number_masked ?? "—"}</Cell>
                  <Cell>{passenger.date_of_birth_masked}</Cell>
                  <Cell muted={!passenger.nationality}>{passenger.nationality ?? "—"}</Cell>
                  <Cell muted={!passenger.ticket_number}>{passenger.ticket_number ?? "—"}</Cell>
                  {booking.can_reveal_identity && (
                    <td className="h-table-row px-2.5">
                      <Button type="button" variant="outline" size="sm" aria-label={`Reveal (logged) ${name}`} onClick={() => setRevealing(passenger)}>
                        Reveal (logged)
                      </Button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-body text-muted-foreground">Passport and date of birth are masked. Reveal is logged.</p>
      {revealing && <RevealDialog bookingId={booking.booking_id} passenger={revealing} onClose={() => setRevealing(null)} />}
    </section>
  );
}

const REASON_MIN = 5;

function RevealDialog({ bookingId, passenger, onClose }: { bookingId: string; passenger: BookingPassenger; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const reveal = useMutation({ mutationFn: () => revealTraveler(bookingId, passenger.position, reason.trim()) });
  const values: RevealResponse | undefined = reveal.data;
  const name = [passenger.first_name, passenger.last_name].join(" ");
  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="flex max-h-[85vh] w-[calc(100%-2rem)] max-w-lg flex-col gap-3 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-section">Reveal identity details</DialogTitle>
          <DialogDescription className="text-body">{name}. The reveal is logged with your reason.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto">
          {values ? (
            <dl className="grid grid-cols-[minmax(8rem,10rem)_minmax(0,1fr)] text-body">
              {([["Date of birth", values.date_of_birth], ["Document number", values.document_number], ["Document expiry", values.document_expiry]] as const).map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="border-b border-border py-2 font-semibold text-foreground">{label}</dt>
                  <dd className="min-w-0 break-words border-b border-border py-2 tabular-nums text-foreground">{value ?? "—"}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reveal-reason" className="text-label font-medium text-muted-foreground">Reason</label>
              <Textarea id="reveal-reason" value={reason} maxLength={500} rows={3} onChange={event => setReason(event.target.value)} className="text-body" />
              {reveal.error && <p role="alert" className="text-body text-status-critical-text">{reveal.error instanceof GatewayError ? reveal.error.message : "Identity details can't be shown right now."}</p>}
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose}>{values ? "Done" : "Cancel"}</Button>
          {!values && (
            <Button type="button" disabled={reason.trim().length < REASON_MIN || reveal.isPending} onClick={() => reveal.mutate()}>
              {reveal.isPending ? "Revealing…" : "Reveal"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const AUDIT_ACTION: Record<string, string> = { hold_created: "Hold created", identity_revealed: "Identity revealed" };
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
