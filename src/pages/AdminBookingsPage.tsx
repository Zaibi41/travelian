import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusKpiCard } from "@/components/admin/StatusKpiCard";
import { DashboardErrorNotice, CardGridSkeleton } from "@/components/admin/dashboard/DashboardStates";
import { LabeledSelect } from "@/components/admin/bookings/LabeledSelect";
import { TabLinks } from "@/components/admin/bookings/TabLinks";
import { NotAvailableNotice } from "@/components/admin/bookings/NotAvailable";
import { PaidChip, SampleDataBadge, StatusChips } from "@/components/admin/bookings/BookingChips";
import { GatewayError } from "@/lib/gateway/client";
import { bookingReportPeriods } from "@/lib/booking-report-period";
import { formatCount } from "@/lib/admin-dashboard/format";
import { severityForCount } from "@/lib/admin-dashboard/severity";
import {
  BOOKING_STATUS_OPTIONS, ISSUANCE_STATUS_OPTIONS, PAGE_SIZE, PAYMENT_STATUS_OPTIONS,
  parseBookingsFilters, serializeBookingsFilters, type BookingsFilters,
} from "@/lib/admin-bookings/query-params";
import {
  BOOKING_STATUS_LABEL, ISSUANCE_STATUS_LABEL, PAYMENT_STATUS_LABEL, formatDateTime, formatMoney, formatTimeLeft, isOpenHold,
} from "@/lib/admin-bookings/format";
import { BOOKINGS_TABS, bookingDetailPath, bookingsTabPath, type BookingsTab } from "@/lib/admin-bookings/tabs";
import { useBookings } from "@/lib/admin-bookings/use-bookings";
import type { BookingCard, BookingList, BookingPeriod } from "@/lib/admin-bookings/types";

const ANY = "any";

function errorMessage(error: unknown) {
  return error instanceof GatewayError ? error.message : "Bookings couldn't be loaded. They will load when the service responds.";
}

// Tabs whose data the gateway doesn't record yet (docs/backend-todo.md, Bookings).
const NOT_AVAILABLE: Record<string, { title: string; body: string }> = {
  "group-ticketing": {
    title: "Group Ticketing bookings aren't available yet",
    body: "The gateway doesn't record departure, seats, manifest status, name-list deadline or supplier for group bookings yet. Group bookings are listed under All Bookings.",
  },
  hotels: {
    title: "Hotel bookings aren't available yet",
    body: "The gateway doesn't record hotel, rooms, dates, voucher or cancellation date for hotel bookings yet. Hotel bookings are listed under All Bookings.",
  },
  umrah: {
    title: "Umrah bookings aren't available yet",
    body: "The gateway doesn't record package, travelers, visa status, installments or service status for Umrah bookings yet. Umrah bookings are listed under All Bookings.",
  },
  "inquiries-requests": {
    title: "Inquiries & Requests aren't available yet",
    body: "The gateway doesn't have inquiries or customer requests yet.",
  },
  quotations: {
    title: "Quotations aren't available yet",
    body: "The gateway doesn't have quotations yet.",
  },
};

// Bookings (spec 7, mockups bookings-*). Data: travelian-api-gateway only.
// The gateway leaves supplier names out for viewers without permission (D23);
// the Supplier / source column and filter only show when it sends them.
// Hidden until the backend records them: Unknown Issuance, Unassigned, Issued today,
// Supplier status, Branch, Created by, Issued by, Ticket number, Source type,
// Airline, Route, Travel date, Trip type, TTL, and the Assign, Add note,
// Request issuance, Hold payment and Create manual booking actions.
export default function AdminBookingsPage({ tab = "" }: { tab?: string }) {
  const current: BookingsTab = BOOKINGS_TABS.find(entry => entry.slug === tab) ?? BOOKINGS_TABS[0];
  const unavailable = NOT_AVAILABLE[current.slug];
  return (
    <div className="flex min-w-0 flex-col gap-section-gap">
      <h1 className="font-display text-page-title font-bold text-foreground">Bookings</h1>
      <TabLinks label="Bookings" tabs={BOOKINGS_TABS.map(entry => ({ to: bookingsTabPath(entry), label: entry.label }))} />
      {unavailable ? (
        <NotAvailableNotice title={unavailable.title}>{unavailable.body}</NotAvailableNotice>
      ) : (
        <BookingsRegister tab={current} />
      )}
    </div>
  );
}

function BookingsRegister({ tab }: { tab: BookingsTab }) {
  const [params, setParams] = useSearchParams();
  const filters = parseBookingsFilters(params);
  const bookings = useBookings(tab.product, filters);
  const setFilters = (next: BookingsFilters) => setParams(serializeBookingsFilters(next), { replace: true });
  const change = (patch: Partial<BookingsFilters>) => setFilters({ ...filters, ...patch, page: patch.page ?? 1 });
  const data = bookings.data;
  const flights = tab.product === "flight";

  return (
    <>
      {bookings.error && !data ? (
        <DashboardErrorNotice message={errorMessage(bookings.error)} />
      ) : (
        <>
          {data ? <Cards cards={data.cards} flights={flights} filters={filters} /> : <CardGridSkeleton count={flights ? 2 : 6} className="grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" />}
          <Filters filters={filters} data={data} flights={flights} onChange={change} />
          {bookings.error && <DashboardErrorNotice message={errorMessage(bookings.error)} />}
          <BookingsTable data={data} loading={bookings.isPending} flights={flights} filters={filters} onPage={page => change({ page })} />
        </>
      )}
    </>
  );
}

function Cards({ cards, flights, filters }: { cards: BookingList["cards"]; flights: boolean; filters: BookingsFilters }) {
  const count = (value: number) => formatCount(value);
  // Clicking a card lists the rows it counts; clicking the selected card (or All Bookings) clears it.
  const href = (card?: BookingCard) => {
    const next = serializeBookingsFilters({ ...filters, card: card === filters.card ? undefined : card, page: 1 }).toString();
    return next ? `?${next}` : "?";
  };
  const card = (name: BookingCard, label: string, value: number, severity?: "action") => (
    <StatusKpiCard
      label={label}
      value={count(value)}
      severity={severity ? severityForCount(value, severity) : undefined}
      to={href(name)}
      selected={filters.card === name}
    />
  );
  if (flights) {
    // Issued today is hidden: no issue time is recorded yet.
    return (
      <div className="grid grid-cols-1 gap-card-gap sm:grid-cols-2">
        {cards.hold_deadlines != null && card("hold_deadlines", "Hold deadlines", cards.hold_deadlines, "action")}
        {cards.awaiting_issuance != null && card("awaiting_issuance", "Awaiting issuance", cards.awaiting_issuance, "action")}
      </div>
    );
  }
  // Unknown Issuance and Unassigned are hidden: not recorded yet.
  return (
    <div className="grid grid-cols-1 gap-card-gap sm:grid-cols-2 xl:grid-cols-4">
      <StatusKpiCard label="All Bookings" value={count(cards.all_bookings)} to={href(undefined)} selected={!filters.card} />
      {card("confirmed", "Confirmed", cards.confirmed)}
      {card("on_hold", "On Hold", cards.on_hold, "action")}
      {card("cancelled", "Cancelled", cards.cancelled)}
      {card("unpaid", "Unpaid", cards.unpaid, "action")}
      {card("expiring_soon", `Expiring within ${cards.expiring_window_hours} ${cards.expiring_window_hours === 1 ? "hour" : "hours"}`, cards.expiring_soon, "action")}
    </div>
  );
}

interface FiltersProps {
  filters: BookingsFilters;
  data?: BookingList;
  flights: boolean;
  onChange: (patch: Partial<BookingsFilters>) => void;
}

function Filters({ filters, data, flights, onChange }: FiltersProps) {
  const [search, setSearch] = useState(filters.q ?? "");
  useEffect(() => setSearch(filters.q ?? ""), [filters.q]);
  const providers = data?.filter_options.providers;
  const sourceSelect = providers && providers.length > 0 && (
    <LabeledSelect
      id="bookings-filter-source"
      label={flights ? "Source" : "Supplier or source"}
      value={filters.provider ?? ANY}
      options={[{ value: ANY, label: "All" }, ...providers]}
      onChange={value => onChange({ provider: value === ANY ? undefined : value })}
    />
  );

  if (flights) {
    // Airline, Route, Trip type and TTL are hidden until the backend records them.
    return sourceSelect ? (
      <section aria-label="Filters" className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-card px-card py-3.5 shadow-card sm:grid-cols-2 lg:grid-cols-5">
        {sourceSelect}
      </section>
    ) : null;
  }

  const anyOption = { value: ANY, label: "Any" };
  const agencies = data?.filter_options.agencies ?? [];
  return (
    <section aria-label="Filters" className="flex flex-col gap-3 rounded-lg border border-border bg-card px-card py-3.5 shadow-card">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <form
          role="search"
          className="flex min-w-0 flex-col gap-1"
          onSubmit={event => {
            event.preventDefault();
            onChange({ q: search.trim() || undefined });
          }}
        >
          <label htmlFor="bookings-search" className="text-label font-medium text-muted-foreground">Search</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="bookings-search"
              value={search}
              maxLength={64}
              onChange={event => setSearch(event.target.value)}
              onBlur={() => (search.trim() || undefined) !== filters.q && onChange({ q: search.trim() || undefined })}
              placeholder="Booking ID or PNR"
              className="h-control rounded-sm pl-8 text-body"
            />
          </div>
        </form>
        <LabeledSelect
          id="bookings-filter-date"
          label="Date range"
          value={filters.period}
          options={bookingReportPeriods.map(option => ({ value: option.value, label: option.label }))}
          onChange={value => onChange({ period: value as BookingPeriod })}
        />
        {/* Travel date isn't recorded yet, so Created date is the only date type. */}
        <LabeledSelect id="bookings-filter-date-type" label="Date type" value="created" options={[{ value: "created", label: "Created date" }]} onChange={() => undefined} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <LabeledSelect
          id="bookings-filter-booking-status"
          label="Booking status"
          value={filters.bookingStatus ?? ANY}
          options={[anyOption, ...BOOKING_STATUS_OPTIONS.map(value => ({ value, label: BOOKING_STATUS_LABEL[value] }))]}
          onChange={value => onChange({ bookingStatus: value === ANY ? undefined : (value as BookingsFilters["bookingStatus"]) })}
        />
        <LabeledSelect
          id="bookings-filter-payment-status"
          label="Payment status"
          value={filters.paymentStatus ?? ANY}
          options={[anyOption, ...PAYMENT_STATUS_OPTIONS.map(value => ({ value, label: PAYMENT_STATUS_LABEL[value] }))]}
          onChange={value => onChange({ paymentStatus: value === ANY ? undefined : (value as BookingsFilters["paymentStatus"]) })}
        />
        <LabeledSelect
          id="bookings-filter-issuance-status"
          label="Issuance status"
          value={filters.issuanceStatus ?? ANY}
          options={[anyOption, ...ISSUANCE_STATUS_OPTIONS.map(value => ({ value, label: ISSUANCE_STATUS_LABEL[value] }))]}
          onChange={value => onChange({ issuanceStatus: value === ANY ? undefined : (value as BookingsFilters["issuanceStatus"]) })}
        />
        {sourceSelect}
        <LabeledSelect
          id="bookings-filter-agency"
          label="Agency"
          value={filters.agency ?? ANY}
          options={[{ value: ANY, label: "All" }, ...agencies]}
          onChange={value => onChange({ agency: value === ANY ? undefined : value })}
        />
      </div>
    </section>
  );
}

interface TableProps {
  data?: BookingList;
  loading: boolean;
  flights: boolean;
  filters: BookingsFilters;
  onPage: (page: number) => void;
}

const TH = "h-table-header px-2.5 font-semibold text-foreground";
const TD = "px-2.5 py-2 align-top";

function BookingsTable({ data, loading, flights, filters, onPage }: TableProps) {
  if (loading && !data) {
    return (
      <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card px-card py-3.5 shadow-card" aria-busy="true" aria-label="Loading bookings">
        {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-table-row rounded-sm" />)}
      </div>
    );
  }
  if (!data) return null;
  // Sent only to viewers who may see supplier names (D23); hidden when none are recorded.
  const showSource = Boolean(data.filter_options.providers?.length);
  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <section aria-label="Bookings" className="flex min-w-0 flex-col gap-2.5 rounded-lg border border-border bg-card px-card py-3.5 shadow-card">
      {data.items.length === 0 ? (
        <p className="py-2 text-body text-muted-foreground">No bookings match these filters.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-table">
            <thead>
              <tr className="bg-muted text-left">
                <th scope="col" className={TH}>PNR</th>
                {!flights && <th scope="col" className={TH}>Customer or agency</th>}
                {showSource && <th scope="col" className={TH}>{flights ? "Source" : "Supplier / source"}</th>}
                <th scope="col" className={TH}>Statuses</th>
                {!flights && <th scope="col" className={TH}>Amount</th>}
                {!flights && <th scope="col" className={TH}>Created at</th>}
                {!flights && <th scope="col" className={TH}>Expiry at</th>}
                {flights && <th scope="col" className={TH}>Time left</th>}
                <th scope="col" className={TH}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map(item => (
                <tr key={item.booking_id} className="border-b border-border last:border-b-0">
                  <td className={`${TD} max-w-[12rem]`}>
                    <span className="block truncate font-semibold text-foreground" title={item.pnr ?? undefined}>{item.pnr ?? "—"}</span>
                    {!flights && <span className="block truncate text-label text-muted-foreground" title={item.booking_id}>{item.booking_id}</span>}
                    {item.sample && <SampleDataBadge className="mt-1" label={item.data_label} />}
                  </td>
                  {!flights && (
                    <td className={`${TD} max-w-[14rem]`}>
                      <span className="block truncate text-foreground" title={item.customer_or_agency ?? undefined}>{item.customer_or_agency ?? "—"}</span>
                    </td>
                  )}
                  {showSource && (
                    <td className={`${TD} max-w-[12rem]`}>
                      <span className="block truncate text-foreground" title={item.provider ?? undefined}>{item.provider ?? "—"}</span>
                    </td>
                  )}
                  <td className={TD}><StatusChips statuses={item.statuses} /></td>
                  {!flights && (
                    <td className={`${TD} whitespace-nowrap`}>
                      <span className="block font-semibold tabular-nums text-foreground">{formatMoney(item.amount)}</span>
                      <PaidChip status={item.statuses.payment} />
                    </td>
                  )}
                  {!flights && <td className={`${TD} whitespace-nowrap tabular-nums text-foreground`}>{formatDateTime(item.created_at)}</td>}
                  {!flights && <td className={`${TD} whitespace-nowrap tabular-nums text-foreground`}>{formatDateTime(item.expires_at)}</td>}
                  {flights && <td className={`${TD} whitespace-nowrap tabular-nums text-foreground`}>{isOpenHold(item.statuses.booking) ? formatTimeLeft(item.expires_at) : "—"}</td>}
                  <td className={TD}>
                    <Button asChild variant="outline" size="sm" className="h-8 text-body">
                      <Link to={bookingDetailPath(item.booking_id)} aria-label={`${flights ? "Open" : "View"} booking ${item.pnr ?? item.booking_id}`}>
                        {flights ? "Open" : "View"}
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-end gap-2 text-body text-muted-foreground">
          <Button variant="outline" size="sm" className="h-8" disabled={filters.page <= 1} onClick={() => onPage(filters.page - 1)}>Previous</Button>
          <span className="tabular-nums">Page {filters.page} of {pages}</span>
          <Button variant="outline" size="sm" className="h-8" disabled={filters.page >= pages} onClick={() => onPage(filters.page + 1)}>Next</Button>
        </nav>
      )}
    </section>
  );
}
