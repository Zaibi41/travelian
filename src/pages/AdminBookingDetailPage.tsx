import { Navigate, useParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardErrorNotice } from "@/components/admin/dashboard/DashboardStates";
import { TabLinks } from "@/components/admin/bookings/TabLinks";
import { NotAvailableTable } from "@/components/admin/bookings/NotAvailable";
import { SampleDataBadge, StatusChips } from "@/components/admin/bookings/BookingChips";
import { GatewayError } from "@/lib/gateway/client";
import {
  BOOKING_STATUS_LABEL, ISSUANCE_STATUS_LABEL, PAYMENT_STATUS_LABEL, PRODUCT_LABEL, formatDateTime, formatMoney, formatTimeLeft, isOpenHold,
} from "@/lib/admin-bookings/format";
import { DETAIL_TABS, bookingDetailPath, type DetailTabSlug } from "@/lib/admin-bookings/tabs";
import { useBookingDetail } from "@/lib/admin-bookings/use-bookings";
import type { BookingDetail } from "@/lib/admin-bookings/types";

// Tabs the gateway doesn't record yet: the mockup's columns with a not-available row
// (docs/backend-todo.md, Booking detail). No "Edit booking" (decided 2026-11-09).
const SHELL_TABS: Partial<Record<DetailTabSlug, { columns: string[]; what: string }>> = {
  itinerary: { columns: ["Segment", "From", "To", "Departs", "Arrives", "Airline / flight", "Cabin", "Baggage"], what: "itinerary segments" },
  passengers: { columns: ["Passenger name", "Type", "Document (masked)", "Date of birth (masked)", "Nationality", "Ticket number"], what: "passengers" },
  payments: { columns: ["Payment", "Method", "Amount (Rs)", "Received at", "Verified by", "Receipt"], what: "customer or agency payments" },
  // Supplier response is left out: supplier data (D23) and not recorded.
  tickets: { columns: ["Passenger", "Ticket number", "Issue time", "Status"], what: "ticket numbers" },
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
        <Skeleton className="h-64 w-full rounded-lg" />
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
          {booking.sample && <SampleDataBadge />}
        </div>
        <StatusChips statuses={booking.statuses} direction="row" />
      </div>
      <TabLinks label="Booking" tabs={visibleTabs.map(entry => ({ to: bookingDetailPath(booking.booking_id, entry.slug), label: entry.label }))} />
      {detail.error && <DashboardErrorNotice message={errorMessage(detail.error)} />}
      {tab === "overview" && <Overview booking={booking} />}
      {tab === "fare" && <Fare booking={booking} />}
      {tab === "supplier-payment" && booking.supplier_payment && <SupplierPaymentTab booking={booking} />}
      {shell && <NotAvailableTable columns={shell.columns} message={`Not available yet. The gateway doesn't record ${shell.what} for bookings yet.`} />}
    </div>
  );
}

function FieldTable({ rows, label }: { rows: [string, React.ReactNode][]; label: string }) {
  return (
    <section aria-label={label} className="rounded-lg border border-border bg-card px-card py-3.5 shadow-card">
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
function Fare({ booking }: { booking: BookingDetail }) {
  const rows: [string, string, boolean?][] = [["Billable price", formatMoney(booking.fare.billable_price), true]];
  if (booking.fare.supplier_cost) rows.push(["Supplier cost", formatMoney(booking.fare.supplier_cost)]);
  if (booking.fare.margin) rows.push(["Margin", formatMoney(booking.fare.margin)]);
  return (
    <section aria-label="Fare" className="overflow-x-auto rounded-lg border border-border bg-card px-card py-3.5 shadow-card">
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
