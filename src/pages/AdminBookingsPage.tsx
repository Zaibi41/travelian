import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { SEARCH_FIELD } from "@/components/admin/ui/search-form";
import { ProductTabLinks } from "@/components/admin/ui/ProductTabLinks";
import { Pagination } from "@/components/admin/ui/pagination";
import { AirlineLogo } from "@/components/admin/ui/AirlineLogo";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { FileText, Hotel, LayoutList, MessageSquare, Plane, Search, Users, type LucideIcon } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusKpiCard } from "@/components/admin/StatusKpiCard";
import { DashboardErrorNotice, CardGridSkeleton } from "@/components/admin/dashboard/DashboardStates";
import { LabeledSelect } from "@/components/admin/ui/LabeledSelect";
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
import { CopyPnr } from "@/components/CopyPnr";
import { useIsMobile } from "@/hooks/use-mobile";

const ANY = "any";

function errorMessage(error: unknown) {
  return error instanceof GatewayError ? error.message : "Bookings couldn't be loaded. They will load when the service responds.";
}

// Tabs whose data the gateway doesn't record yet (docs/backend-todo.md, Bookings).
const NOT_AVAILABLE: Record<string, { title: string; body: string }> = {
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
/** `showTitle` is false inside the Bookings menu page, whose own title is "Bookings". */
export default function AdminBookingsPage({ tab = "", showTitle = true }: { tab?: string; showTitle?: boolean }) {
  const current: BookingsTab = BOOKINGS_TABS.find(entry => entry.slug === tab) ?? BOOKINGS_TABS[0];
  const unavailable = NOT_AVAILABLE[current.slug];
  return (
    <div className="flex min-w-0 flex-col gap-section-gap">
      {showTitle && <h1 className="font-display text-page-title font-bold text-foreground">Bookings</h1>}
      <ProductTabLinks label="Bookings"
        tabs={BOOKINGS_TABS.filter(entry => !entry.hidden).map(entry => ({ to: bookingsTabPath(entry), label: entry.label, icon: TAB_ICONS[entry.slug] }))} />
      {unavailable ? (
        <NotAvailableNotice title={unavailable.title}>{unavailable.body}</NotAvailableNotice>
      ) : (
        <BookingsRegister tab={current} />
      )}
    </div>
  );
}

const TAB_ICONS: Record<string, LucideIcon> = {
  "": LayoutList, flights: Plane, "group-ticketing": Users, hotels: Hotel, "inquiries-requests": MessageSquare, quotations: FileText,
};

function BookingsRegister({ tab }: { tab: BookingsTab }) {
  const [params, setParams] = useSearchParams();
  const filters = parseBookingsFilters(params);
  const bookings = useBookings(tab.product, filters);
  const setFilters = (next: BookingsFilters) => setParams(serializeBookingsFilters(next), { replace: true });
  const change = (patch: Partial<BookingsFilters>) => setFilters({ ...filters, ...patch, page: patch.page ?? 1 });
  const data = bookings.data;
  // Group Ticketing uses the Flights layout; its departure, seats, manifest and name-list columns
  // wait for the gateway (docs/backend-todo.md, Bookings).
  const flights = tab.product === "flight" || tab.product === "group";
  // Older alerts and links open /admin/bookings?search=REF. When that search finds exactly one booking with that
  // reference, open its detail page instead of the list (#54). A search typed on this page uses ?q= and stays a list.
  const legacy = params.get("q") ? undefined : params.get("search")?.trim().toUpperCase();
  const only = legacy && data && !bookings.isPlaceholderData && data.items.length === 1 ? data.items[0] : undefined;
  if (only && only.booking_id.toUpperCase() === legacy) return <Navigate to={bookingDetailPath(only.booking_id)} replace />;

  return (
    <>
      {bookings.error && !data ? (
        <DashboardErrorNotice message={errorMessage(bookings.error)} />
      ) : (
        <>
          {data ? <Cards cards={data.cards} flights={flights} filters={filters} /> : <CardGridSkeleton count={flights ? 4 : 6} className={flights ? "grid-cols-2 sm:grid-cols-2 xl:grid-cols-4" : "grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"} />}
          <Filters filters={filters} data={data} flights={flights} onChange={change} />
          {bookings.error && <DashboardErrorNotice message={errorMessage(bookings.error)} />}
          <BookingsTable data={data} loading={bookings.isPending} flights={flights} filters={filters} onPage={page => change({ page })}
            onClearSearch={() => change({ q: undefined })} />
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
  const card = (name: BookingCard, label: string, value: number, severity?: "action" | "critical") => (
    <StatusKpiCard
      label={label}
      value={count(value)}
      severity={severity ? severityForCount(value, severity) : undefined}
      to={href(name)}
      selected={filters.card === name}
    />
  );
  const expiringLabel = `Expiring within ${cards.expiring_window_hours} ${cards.expiring_window_hours === 1 ? "hour" : "hours"}`;
  if (flights) {
    // Issued today is hidden: no issue time is recorded yet. Payment pending and
    // Expiring are added (not in the mockup) so each dashboard needs-action card
    // opens here with its card picked and the same count (docs/mockups/README.md).
    return (
      <div className="grid grid-cols-2 gap-card-gap xl:grid-cols-4">
        {cards.hold_deadlines != null && card("hold_deadlines", "Hold deadlines", cards.hold_deadlines, "action")}
        {cards.awaiting_issuance != null && card("awaiting_issuance", "Awaiting issuance", cards.awaiting_issuance, "action")}
        {cards.payment_pending != null && card("payment_pending", "Payment pending", cards.payment_pending, "action")}
        {card("expiring_soon", expiringLabel, cards.expiring_soon, "action")}
        {/* Paid by the customer, no ticket: Paid, issuance pending + Paid, not ticketed (approved 19 Nov 2026). */}
        {cards.paid_not_issued != null && card("paid_not_issued", "Paid, not ticketed", cards.paid_not_issued, "critical")}
        {/* gateway#85: issuing timed out, a ticket may or may not exist; the dashboard card opens this. */}
        {cards.unknown_issuance != null && card("unknown_issuance", "Unknown issuance", cards.unknown_issuance, "critical")}
      </div>
    );
  }
  // Unassigned is hidden: not recorded yet. Unknown issuance is on the Flights tab (issuance is flights only).
  return (
    <div className="grid grid-cols-2 gap-card-gap lg:grid-cols-3 xl:grid-cols-6">
      <StatusKpiCard label="All Bookings" value={count(cards.all_bookings)} to={href(undefined)} selected={!filters.card} />
      {card("confirmed", "Confirmed", cards.confirmed)}
      {card("on_hold", "On Hold", cards.on_hold, "action")}
      {card("cancelled", "Cancelled", cards.cancelled)}
      {card("unpaid", "Unpaid", cards.unpaid, "action")}
      {card("expiring_soon", expiringLabel, cards.expiring_soon, "action")}
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
    <LabeledSelect triggerClassName={SEARCH_FIELD}
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
      <section aria-label="Filters" className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-card px-card py-3.5 shadow-card sm:grid-cols-2 lg:grid-cols-5">
        {sourceSelect}
      </section>
    ) : null;
  }

  const anyOption = { value: ANY, label: "Any" };
  const agencies = data?.filter_options.agencies ?? [];
  return (
    <section aria-label="Filters" className="flex flex-col gap-3 rounded-xl border border-border bg-card px-card py-3.5 shadow-card">
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
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="bookings-search"
              value={search}
              maxLength={64}
              onChange={event => setSearch(event.target.value)}
              onBlur={() => (search.trim() || undefined) !== filters.q && onChange({ q: search.trim() || undefined })}
              placeholder="Booking ID or PNR"
              className={cn(SEARCH_FIELD, "pl-9")}
            />
          </div>
        </form>
        <LabeledSelect triggerClassName={SEARCH_FIELD}
          id="bookings-filter-date"
          label="Date range"
          value={filters.period}
          options={bookingReportPeriods.map(option => ({ value: option.value, label: option.label }))}
          onChange={value => onChange({ period: value as BookingPeriod })}
        />
        {/* Travel date isn't recorded yet, so Created date is the only date type. */}
        <LabeledSelect triggerClassName={SEARCH_FIELD} id="bookings-filter-date-type" label="Date type" value="created" options={[{ value: "created", label: "Created date" }]} onChange={() => undefined} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <LabeledSelect triggerClassName={SEARCH_FIELD}
          id="bookings-filter-booking-status"
          label="Booking status"
          value={filters.bookingStatus ?? ANY}
          options={[anyOption, ...BOOKING_STATUS_OPTIONS.map(value => ({ value, label: BOOKING_STATUS_LABEL[value] }))]}
          onChange={value => onChange({ bookingStatus: value === ANY ? undefined : (value as BookingsFilters["bookingStatus"]) })}
        />
        <LabeledSelect triggerClassName={SEARCH_FIELD}
          id="bookings-filter-payment-status"
          label="Payment status"
          value={filters.paymentStatus ?? ANY}
          options={[anyOption, ...PAYMENT_STATUS_OPTIONS.map(value => ({ value, label: PAYMENT_STATUS_LABEL[value] }))]}
          onChange={value => onChange({ paymentStatus: value === ANY ? undefined : (value as BookingsFilters["paymentStatus"]) })}
        />
        <LabeledSelect triggerClassName={SEARCH_FIELD}
          id="bookings-filter-issuance-status"
          label="Issuance status"
          value={filters.issuanceStatus ?? ANY}
          options={[anyOption, ...ISSUANCE_STATUS_OPTIONS.map(value => ({ value, label: ISSUANCE_STATUS_LABEL[value] }))]}
          onChange={value => onChange({ issuanceStatus: value === ANY ? undefined : (value as BookingsFilters["issuanceStatus"]) })}
        />
        {sourceSelect}
        <LabeledSelect triggerClassName={SEARCH_FIELD}
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
  onClearSearch: () => void;
}

const TH = "h-table-header px-2.5 font-semibold text-foreground";
const TD = "px-2.5 py-2 align-top";

function BookingsTable({ data, loading, flights, filters, onPage, onClearSearch }: TableProps) {
  // Under 768px the wide table hides statuses, amount and the action off-screen; a phone gets one card per booking instead.
  const isMobile = useIsMobile();
  if (loading && !data) {
    return (
      <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-card px-card py-3.5 shadow-card" aria-busy="true" aria-label="Loading bookings">
        {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-table-row rounded-sm" />)}
      </div>
    );
  }
  if (!data) return null;
  // Sent only to viewers who may see supplier names (D23); hidden when none are recorded.
  const showSource = Boolean(data.filter_options.providers?.length);
  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <section aria-label="Bookings" className="flex min-w-0 flex-col gap-2.5 rounded-xl border border-border bg-card px-card py-3.5 shadow-card">
      {data.items.length === 0 ? (
        filters.q ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2">
            <p className="min-w-0 break-words text-body text-muted-foreground">No bookings match <span className="font-semibold text-foreground">{filters.q}</span>.</p>
            <Button variant="outline" size="sm" onClick={onClearSearch}>Clear search</Button>
          </div>
        ) : (
          <p className="py-2 text-body text-muted-foreground">No bookings match these filters.</p>
        )
      ) : isMobile ? (
        <BookingCardList items={data.items} flights={flights} showSource={showSource} />
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
                  <td className={`${TD} max-w-[16rem]`}>
                    <span className="flex min-w-0 items-start gap-2">
                    {/* #75: the shared airline logo (own file -> code badge), as on the website and in Search. */}
                    {(item.airline_code || item.airline_name) && (
                      <AirlineLogo airline={item.airline_name ?? item.airline_code ?? ""} flightNumber={item.flight_number ?? undefined}
                        code={item.airline_code} className="mt-0.5 h-8 w-8 shrink-0 rounded-lg" />
                    )}
                    <span className="flex min-w-0 flex-col">
                    <span className="flex min-w-0 items-center gap-1">
                    <Link to={bookingDetailPath(item.booking_id)} title={item.pnr ?? item.booking_id}
                      className="block min-w-0 truncate rounded-sm font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1">
                      {item.pnr ?? item.booking_id}
                    </Link>
                    <CopyPnr pnr={item.pnr} />
                    </span>
                    {(item.airline_name || item.flight_number) && (
                      <span className="block truncate text-label text-muted-foreground" title={[item.airline_name, item.flight_number].filter(Boolean).join(" · ")}>
                        {[item.airline_name, item.flight_number].filter(Boolean).join(" · ")}
                      </span>
                    )}
                    {!flights && <span className="block truncate text-label text-muted-foreground" title={item.booking_id}>{item.booking_id}</span>}
                    {item.sample && <SampleDataBadge className="mt-1" label={item.data_label} />}
                    </span>
                    </span>
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
                  <td className={TD}><StatusChips statuses={item.statuses} direction="row" /></td>
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
                    <Button asChild variant="outline" size="sm">
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
      <Pagination page={filters.page} pages={pages} onPage={onPage} />
    </section>
  );
}

/** Phone layout of the bookings list: the same fields and the same View / Open link as a table row. */
function BookingCardList({ items, flights, showSource }: { items: BookingList["items"]; flights: boolean; showSource: boolean }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map(item => {
        const airline = [item.airline_name, item.flight_number].filter(Boolean).join(" · ");
        return (
          <li key={item.booking_id} className="flex min-w-0 flex-col gap-2 rounded-lg border border-border p-3 text-table">
            <div className="flex min-w-0 items-start gap-2">
              {(item.airline_code || item.airline_name) && (
                <AirlineLogo airline={item.airline_name ?? item.airline_code ?? ""} flightNumber={item.flight_number ?? undefined}
                  code={item.airline_code} className="mt-0.5 h-8 w-8 shrink-0 rounded-lg" />
              )}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex min-w-0 items-center gap-1">
                  <Link to={bookingDetailPath(item.booking_id)} title={item.pnr ?? item.booking_id}
                    className="block min-w-0 truncate rounded-sm font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1">
                    {item.pnr ?? item.booking_id}
                  </Link>
                  <CopyPnr pnr={item.pnr} />
                </span>
                {airline && <span className="block truncate text-label text-muted-foreground" title={airline}>{airline}</span>}
                {!flights && <span className="block truncate text-label text-muted-foreground" title={item.booking_id}>{item.booking_id}</span>}
                {item.sample && <SampleDataBadge className="mt-1" label={item.data_label} />}
              </span>
            </div>
            {!flights && <span className="block truncate text-foreground" title={item.customer_or_agency ?? undefined}>{item.customer_or_agency ?? "—"}</span>}
            {showSource && (
              <span className="flex min-w-0 gap-1.5"><span className="shrink-0 text-muted-foreground">{flights ? "Source" : "Supplier / source"}</span>
                <span className="min-w-0 truncate text-foreground" title={item.provider ?? undefined}>{item.provider ?? "—"}</span></span>
            )}
            <StatusChips statuses={item.statuses} direction="row" />
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
              {flights ? (
                <div className="flex min-w-0 flex-col"><dt className="text-label text-muted-foreground">Time left</dt>
                  <dd className="tabular-nums text-foreground">{isOpenHold(item.statuses.booking) ? formatTimeLeft(item.expires_at) : "—"}</dd></div>
              ) : (
                <>
                  <div className="flex min-w-0 flex-col"><dt className="text-label text-muted-foreground">Created at</dt><dd className="tabular-nums text-foreground">{formatDateTime(item.created_at)}</dd></div>
                  <div className="flex min-w-0 flex-col"><dt className="text-label text-muted-foreground">Expiry at</dt><dd className="tabular-nums text-foreground">{formatDateTime(item.expires_at)}</dd></div>
                </>
              )}
            </dl>
            <div className="flex items-center justify-between gap-3">
              {!flights ? (
                <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <span className="font-semibold tabular-nums text-foreground">{formatMoney(item.amount)}</span>
                  <PaidChip status={item.statuses.payment} />
                </span>
              ) : <span />}
              <Button asChild variant="outline" size="sm">
                <Link to={bookingDetailPath(item.booking_id)} aria-label={`${flights ? "Open" : "View"} booking ${item.pnr ?? item.booking_id}`}>
                  {flights ? "Open" : "View"}
                </Link>
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
