import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BookingList, BookingListItem } from "@/lib/admin-bookings/types";
import { GatewayError } from "@/lib/gateway/client";

const role = { current: "super_admin" };
vi.mock("@/contexts/RoleContext", () => ({ useRole: () => ({ currentRole: role.current }) }));

const list = { current: {} as Record<string, unknown>, product: undefined as string | undefined };
vi.mock("@/lib/admin-bookings/use-bookings", () => ({
  useBookings: (product: string | undefined) => {
    list.product = product;
    return list.current;
  },
}));


import AdminBookingsPage from "./AdminBookingsPage";
import { LegacyRequestsRoute } from "./AdminBookingsRoutes";

const ok = <T,>(data: T) => ({ data, error: null, isPending: false });
const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });

function row(id: string, overrides: Partial<BookingListItem> = {}): BookingListItem {
  return {
    booking_id: id, pnr: `PNR${id}`, product: "flight", customer_or_agency: "Karachi Travels",
    statuses: { booking: "held", payment: "unpaid", issuance: "not_issued" }, amount: rs(12_500),
    created_at: "2026-11-05T07:00:00Z", expires_at: "2026-11-05T09:00:00Z", sample: false, ...overrides,
  };
}

// Plain staff: the gateway leaves supplier names out entirely (D23).
const STAFF_LIST: BookingList = {
  source: "gateway_bookings", contains_sample_data: true, sample_label: "Sample data",
  cards: { all_bookings: 18, confirmed: 3, on_hold: 2, cancelled: 4, unpaid: 0, expiring_soon: 1, expiring_window_hours: 2 },
  filter_options: { agencies: [{ value: "ag-1", label: "Karachi Travels" }] },
  total: 2, limit: 50, offset: 0,
  items: [row("1"), row("2", { sample: true, customer_or_agency: "A Very Long Agency Name That Should Truncate Instead Of Breaking The Table Layout" })],
};
const ADMIN_LIST: BookingList = {
  ...STAFF_LIST,
  filter_options: { ...STAFF_LIST.filter_options, providers: [{ value: "airsial", label: "AirSial" }] },
  items: STAFF_LIST.items.map(item => ({ ...item, provider: "AirSial" })),
};

const renderPage = (tab = "", url = "/admin/bookings") =>
  render(<MemoryRouter initialEntries={[url]}><AdminBookingsPage tab={tab} /></MemoryRouter>);

describe("Bookings register", () => {
  beforeEach(() => {
    role.current = "super_admin";
    list.current = ok(ADMIN_LIST);
  });

  it("shows the six sub-menus as page links (Umrah hidden), All Bookings active", () => {
    renderPage();
    const tabs = screen.getByRole("navigation", { name: "Bookings" });
    expect(within(tabs).getAllByRole("link").map(link => [link.textContent, link.getAttribute("href")])).toEqual([
      ["All Bookings", "/admin/bookings"], ["Flights", "/admin/bookings/flights"], ["Group Ticketing", "/admin/bookings/group-ticketing"],
      ["Hotels", "/admin/bookings/hotels"], ["Inquiries & Requests", "/admin/bookings/inquiries-requests"],
      ["Quotations", "/admin/bookings/quotations"],
    ]);
    expect(within(tabs).getByRole("link", { name: "All Bookings" })).toHaveAttribute("aria-current", "page");
  });

  it("shows the cards with data and hides those without (Unknown Issuance, Unassigned)", () => {
    renderPage();
    expect(screen.getByRole("link", { name: "All Bookings: 18" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /On Hold: 2, Needs action/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Unpaid: 0, Fine/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Expiring within 2 hours: 1, Needs action/ })).toBeInTheDocument();
    expect(screen.queryByText(/Unknown Issuance|Unassigned/)).not.toBeInTheDocument();
  });

  it("cards filter the list: each links to its card filter, keeping the other filters", () => {
    renderPage("", "/admin/bookings?payment_status=unpaid&card=on_hold");
    expect(screen.getByRole("link", { name: /^Unpaid:/ })).toHaveAttribute("href", "/admin/bookings?payment_status=unpaid&card=unpaid");
    const selected = screen.getByRole("link", { name: /^On Hold:/ });
    expect(selected).toHaveAttribute("aria-current", "true");
    expect(selected).toHaveAttribute("href", "/admin/bookings?payment_status=unpaid");  // clicking again clears it
    expect(screen.getByRole("link", { name: /^All Bookings:/ })).toHaveAttribute("href", "/admin/bookings?payment_status=unpaid");
  });

  it("shows only filters and columns with data, no Create manual booking, Assign or Add note", () => {
    renderPage();
    for (const label of ["Search", "Date range", "Date type", "Booking status", "Payment status", "Issuance status", "Supplier or source", "Agency"]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    for (const hidden of [/Supplier status/, /Branch/, /Created by/, /Issued by/, /Ticket number/, /Create manual booking/, /^Assign$/, /Add note/]) {
      expect(screen.queryByText(hidden)).not.toBeInTheDocument();
    }
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("columnheader").map(cell => cell.textContent)).toEqual([
      "PNR", "Customer or agency", "Supplier / source", "Statuses", "Amount", "Created at", "Expiry at", "Actions",
    ]);
    expect(within(table).getAllByText("Rs 12,500")).toHaveLength(2);
    expect(within(table).getAllByRole("link", { name: /View booking/ })[0]).toHaveAttribute("href", "/admin/bookings/1");
    // The PNR is a link to the same booking page as View.
    expect(within(table).getByRole("link", { name: "PNR1" })).toHaveAttribute("href", "/admin/bookings/1");
  });

  it("labels sample rows and truncates long agency names", () => {
    renderPage();
    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0]).queryByText("Sample data")).not.toBeInTheDocument();
    expect(within(rows[1]).getByText("Sample data")).toBeInTheDocument();
    expect(within(rows[1]).getByTitle(/A Very Long Agency Name/)).toHaveClass("truncate");
  });

  it("staff without supplier visibility get no Supplier / source column, filter or names", () => {
    list.current = ok(STAFF_LIST);
    renderPage();
    expect(screen.queryByLabelText("Supplier or source")).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: /Supplier/ })).not.toBeInTheDocument();
    expect(screen.queryByText("AirSial")).not.toBeInTheDocument();
  });

  it("hides Supplier / source when no provider is recorded, even for admins", () => {
    list.current = ok({ ...ADMIN_LIST, filter_options: { ...ADMIN_LIST.filter_options, providers: [] } });
    renderPage();
    expect(screen.queryByLabelText("Supplier or source")).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: /Supplier/ })).not.toBeInTheDocument();
  });

  it("Flights tab: its own cards, Source only when sent, time left and Open", () => {
    renderPage("flights", "/admin/bookings/flights");
    expect(list.product).toBe("flight");
    list.current = ok({ ...ADMIN_LIST, cards: { ...ADMIN_LIST.cards, hold_deadlines: 2, awaiting_issuance: 0, payment_pending: 3 } });
    renderPage("flights", "/admin/bookings/flights");
    expect(screen.getByRole("link", { name: /Hold deadlines: 2, Needs action/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Awaiting issuance: 0, Fine/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Payment pending: 3, Needs action/ })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Expiring within 2 hours: 1, Needs action/ }).at(-1)).toHaveAttribute("href", "/admin/bookings/flights?card=expiring_soon");
    expect(screen.queryByText("Issued today")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Source")).toBeInTheDocument();
    expect(screen.queryByText(/Request issuance|Hold payment|Airline|Route|Trip type|TTL/)).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Open booking/ })[0]).toHaveAttribute("href", "/admin/bookings/1");
  });

  it("Flights tab: a dashboard link opens with its card picked", () => {
    list.current = ok({ ...ADMIN_LIST, cards: { ...ADMIN_LIST.cards, hold_deadlines: 2, awaiting_issuance: 0, payment_pending: 3 } });
    renderPage("flights", "/admin/bookings/flights?card=payment_pending");
    const picked = screen.getByRole("link", { name: /^Payment pending:/ });
    expect(picked).toHaveAttribute("aria-current", "true");
    expect(picked).toHaveAttribute("href", "/admin/bookings/flights");  // clicking again clears it
  });

  it("Group Ticketing tab lists group bookings in the Flights layout", () => {
    list.current = ok({ ...ADMIN_LIST, cards: { ...ADMIN_LIST.cards, hold_deadlines: 1 } });
    renderPage("group-ticketing", "/admin/bookings/group-ticketing");
    expect(list.product).toBe("group");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Hold deadlines:/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Awaiting issuance:/ })).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Time left" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Amount" })).not.toBeInTheDocument();
  });

  it("tabs without recorded data say so instead of showing empty tables", () => {
    for (const tab of ["hotels", "inquiries-requests", "quotations"]) {
      const { unmount } = renderPage(tab, `/admin/bookings/${tab}`);
      expect(screen.getByRole("status")).toHaveTextContent(/aren't available yet/);
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      unmount();
    }
  });

  it("shows gateway errors and an empty result clearly", () => {
    list.current = { data: undefined, error: new GatewayError("forbidden", "Your role can't view this data. A super admin can grant access."), isPending: false };
    const { unmount } = renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent("Your role can't view this data.");
    unmount();
    list.current = ok({ ...STAFF_LIST, items: [], total: 0 });
    renderPage();
    expect(screen.getByText("No bookings match these filters.")).toBeInTheDocument();
  });

  it("pages only when there is more than one page", () => {
    list.current = ok({ ...STAFF_LIST, total: 120 });
    renderPage("", "/admin/bookings?page=2");
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
  });
});

function Where() {
  const location = useLocation();
  return <p>at {location.pathname}</p>;
}

describe("old /admin/requests bookings screen", () => {
  const renderRequests = () =>
    render(
      <MemoryRouter initialEntries={["/admin/requests"]}>
        <Routes>
          <Route path="/admin/requests" element={<LegacyRequestsRoute />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );

  it("sends internal roles to the new Bookings register", () => {
    renderRequests();
    expect(screen.getByText("at /admin/bookings")).toBeInTheDocument();
  });

  it("shows agency roles the menu placeholder, not the old screen", () => {
    role.current = "agency_owner";
    renderRequests();
    expect(screen.getByRole("heading", { name: "Bookings" })).toBeInTheDocument();
  });
});
