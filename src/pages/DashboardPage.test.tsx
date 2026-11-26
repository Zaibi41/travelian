import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DashboardSummary } from "@/lib/admin-dashboard/types";
import { GatewayError } from "@/lib/gateway/client";

const role = { current: "super_admin" };
vi.mock("@/contexts/RoleContext", () => ({
  useRole: () => ({ currentRole: role.current, currentUser: { name: "QA", email: "" } }),
}));

// #13: the final PNR tracker reads its own list from the gateway.
const tracker = vi.fn();
vi.mock("@/lib/flight-operations/api", () => ({ fetchGroupBookingsAwaitingFinalPnr: (...args: unknown[]) => tracker(...args) }));

// gateway#87: Recent activity reads its own list from the gateway.
const activity = vi.fn();
vi.mock("@/lib/admin-dashboard/api", () => ({ fetchRecentActivity: (...args: unknown[]) => activity(...args) }));

const dashboard = { current: {} as Record<string, unknown> };
vi.mock("@/lib/admin-dashboard/use-dashboard", () => ({ useDashboard: () => dashboard.current }));

import DashboardPage from "./DashboardPage";

// jsdom has no ResizeObserver; recharts' ResponsiveContainer needs one.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const ok = <T,>(data: T) => ({ data, error: null, isPending: false });
const failed = (error: unknown) => ({ data: undefined, error, isPending: false });
const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" as const });

function summary(counts: [number, number, number, number?], business: Partial<DashboardSummary["business"]> = {}): DashboardSummary {
  return {
    source: "gateway_bookings",
    contains_sample_data: false,
    generated_at: "2026-11-05T07:00:00Z",
    needs_action: { pending_issuance: counts[0], payment_pending: counts[1], expiring_holds: counts[2], expiring_window_hours: 2, unknown_issuance: counts[3] ?? 0 },
    business: { total_bookings: 42, held: 5, paid: 31, issued_tickets: 30, total_sales: [rs(1_284_500)], gross_profit: [rs(96_400)], ...business },
  };
}

function setData(overrides: Record<string, unknown> = {}) {
  dashboard.current = {
    summary: ok(summary([2, 0, 1])),
    report: ok({ granularity: "day", timezone: "Asia/Karachi", buckets: [{ start: "2026-11-05", bookings: 4, issued: 3 }] }),
    attention: ok({ total: 1, items: [{ booking_id: "b1", type: "hold_expiring", reference: "GROUP-LHE-JED-ZAMZAM-TOWERS-35PAX-REF-0001" }] }),
    filterOptions: ok({ products: [{ value: "flight", label: "Flights" }], providers: [] }),
    ...overrides,
  };
}

const renderPage = (url = "/admin") => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={[url]}><DashboardPage /></MemoryRouter>
  </QueryClientProvider>,
);

describe("DashboardPage", () => {
  beforeEach(() => {
    setData();
    role.current = "super_admin";
    tracker.mockReset();
    tracker.mockResolvedValue({ window_hours: 48, total: 0, departs_soon: 0, items: [] });
    activity.mockReset();
    activity.mockResolvedValue({ items: [] });
  });

  it("gateway#87: Recent activity lists the latest events, each opening the booking's Audit tab; not for agencies", async () => {
    activity.mockResolvedValue({ items: [
      { at: "2026-11-26T06:00:00Z", action: "payment_recorded", label: "Payment recorded", booking_id: "TRV-K0AE0A", product: "flight",
        actor_user_id: "0901a7ce-ef7d-4af6-8ca4-31fd1252137a", actor_role: "super_admin" },
      { at: "2026-11-26T05:00:00Z", action: "hold_expired", label: "Hold expired", booking_id: "TRV-GRP-LONGREFERENCE-0001", product: "group" },
    ] });
    const { unmount } = renderPage();
    const panel = await screen.findByRole("region", { name: "Recent activity" });
    const rows = await within(panel).findAllByRole("listitem");
    expect(rows.map(row => within(row).getByRole("link").getAttribute("href"))).toEqual(
      ["/admin/bookings/TRV-K0AE0A/audit", "/admin/bookings/TRV-GRP-LONGREFERENCE-0001/audit"]);
    expect(rows[0]).toHaveTextContent("Payment recorded");
    expect(rows[0]).toHaveTextContent("Super Admin · 0901a7ce");
    expect(rows[1]).toHaveTextContent("System");
    expect(activity).toHaveBeenCalledWith(8, expect.anything());
    unmount();
    role.current = "agency_owner";
    activity.mockClear();
    renderPage();
    expect(screen.queryByRole("region", { name: "Recent activity" })).not.toBeInTheDocument();
    expect(activity).not.toHaveBeenCalled();
  });

  it("gateway#87: Recent activity is hidden when the gateway doesn't offer it, and says when there is none", async () => {
    activity.mockRejectedValue(new GatewayError("not_found", "Not found.", 404));
    const { unmount } = renderPage();
    await vi.waitFor(() => expect(screen.queryByRole("region", { name: "Recent activity" })).not.toBeInTheDocument());
    expect(activity).toHaveBeenCalled();
    unmount();
    activity.mockResolvedValue({ items: [] });
    renderPage();
    expect(await screen.findByText("No booking activity yet.")).toBeInTheDocument();
  });

  it("shows the group final PNR tracker to the back office, not to agencies (#13)", async () => {
    renderPage();
    expect(await screen.findByRole("region", { name: "Group bookings awaiting final PNR" })).toBeInTheDocument();
    expect(tracker).toHaveBeenCalled();
  });

  it("agency roles get no final PNR tracker (#13)", () => {
    role.current = "agency_owner";
    tracker.mockClear();
    renderPage();
    expect(screen.queryByRole("region", { name: "Group bookings awaiting final PNR" })).not.toBeInTheDocument();
    expect(tracker).not.toHaveBeenCalled();
  });

  it("shows needs-action cards with status text, green Fine at zero, and matching links", () => {
    renderPage();
    expect(screen.getByRole("link", { name: /Pending issuance: 2, Needs action/ })).toHaveAttribute("href", "/admin/bookings/flights?card=awaiting_issuance");
    const payment = screen.getByRole("link", { name: /Payment pending: 0, Fine/ });
    expect(within(payment).getByText("Fine")).toBeInTheDocument();
    expect(payment).toHaveAttribute("href", "/admin/bookings/flights?card=payment_pending");
    expect(screen.getByRole("link", { name: /Expiring holds: 1, Needs action\. Within 2 hours/ })).toHaveAttribute("href", "/admin/bookings/flights?card=expiring_soon");
    // gateway#85: a real zero is the green Fine stripe.
    expect(screen.getByRole("link", { name: /Unknown issuance: 0, Fine/ })).toHaveAttribute("href", "/admin/bookings/flights?card=unknown_issuance");
  });

  it("gateway#85: unknown issuance above zero is Critical and opens the filtered Flights list", () => {
    setData({ summary: ok(summary([0, 0, 0, 3])) });
    renderPage();
    expect(screen.getByRole("link", { name: /Unknown issuance: 3, Critical/ })).toHaveAttribute("href", "/admin/bookings/flights?card=unknown_issuance");
  });

  it("keeps the provider filter on the Pending issuance list", () => {
    renderPage("/admin?provider=airsial");
    expect(screen.getByRole("link", { name: /Pending issuance/ })).toHaveAttribute("href", "/admin/bookings/flights?card=awaiting_issuance&provider=airsial");
  });

  it("shows Business results as neutral cards with Rs amounts", () => {
    renderPage();
    const section = screen.getByRole("region", { name: "Business results" });
    expect(within(section).getByRole("group", { name: "Total sales: Rs 1,284,500" })).toHaveTextContent("Rs 1,284,500");
    expect(within(section).getByRole("group", { name: "Gross profit: Rs 96,400" })).toBeInTheDocument();
    expect(within(section).queryByText(/Needs action|Fine|Critical/)).not.toBeInTheDocument();
    expect(screen.queryByText(/PKR/)).not.toBeInTheDocument();
  });

  it("every Business tile shows Flights and Group separately when the gateway sends the split (Product All)", () => {
    setData({ summary: ok(summary([2, 0, 1], {
      total_bookings: 12, held: 3, paid: 8, issued_tickets: 6, total_sales: [rs(500_000), { amount_minor: 40_000, currency: "SAR" }], gross_profit: [rs(60_000)],
      by_product: [
        { product: "flight", label: "Flights", total_bookings: 9, held: 2, paid: 6, issued_tickets: 5, total_sales: [rs(350_000)], gross_profit: [rs(40_000)] },
        { product: "group", label: "Group", total_bookings: 3, held: 1, paid: 2, issued_tickets: 1,
          total_sales: [rs(150_000), { amount_minor: 40_000, currency: "SAR" }], gross_profit: [rs(20_000)] },
      ],
    })) });
    renderPage();
    const section = screen.getByRole("region", { name: "Business results" });
    expect(within(section).getByRole("group", { name: "Total bookings: 12 (Flights 9, Group 3)" })).toBeInTheDocument();
    expect(within(section).getByRole("group", { name: "Held: 3 (Flights 2, Group 1)" })).toBeInTheDocument();
    expect(within(section).getByRole("group", { name: "Paid: 8 (Flights 6, Group 2)" })).toBeInTheDocument();
    expect(within(section).getByRole("group", { name: "Issued tickets: 6 (Flights 5, Group 1)" })).toBeInTheDocument();
    expect(within(section).getByRole("group", { name: "Total sales: Rs 500,000 · SAR 400 (Flights Rs 350,000, Group Rs 150,000 · SAR 400)" })).toBeInTheDocument();
    expect(within(section).getByRole("group", { name: "Gross profit: Rs 60,000 (Flights Rs 40,000, Group Rs 20,000)" })).toBeInTheDocument();
  });

  it("no split when a product is picked, and no profit lines without margin access", () => {
    setData({ summary: ok(summary([0, 0, 0], { gross_profit: undefined, by_product: undefined })) });
    renderPage("/admin?product=group");
    const section = screen.getByRole("region", { name: "Business results" });
    expect(within(section).getByRole("group", { name: "Total bookings: 42" })).toBeInTheDocument();
    expect(within(section).queryByText("Flights")).not.toBeInTheDocument();
    expect(within(section).queryByRole("group", { name: /Gross profit/ })).not.toBeInTheDocument();
  });

  it("the Product filter offers All, Flights and Group and keeps the choice in the URL", () => {
    setData({ filterOptions: ok({ products: [{ value: "flight", label: "Flights" }, { value: "group", label: "Group" }] }) });
    renderPage("/admin?product=group");
    expect(screen.getByRole("combobox", { name: "Product: Group" })).toBeInTheDocument();
  });

  it("shows the Provider / source filter only when the gateway sends providers (D23)", () => {
    setData({ filterOptions: ok({ products: [{ value: "flight", label: "Flights" }] }) });
    const { unmount } = renderPage();
    expect(screen.queryByRole("combobox", { name: /Provider \/ source/ })).not.toBeInTheDocument();
    unmount();
    setData({ filterOptions: ok({ products: [], providers: [{ value: "airsial", label: "AirSial" }] }) });
    renderPage();
    expect(screen.getByRole("combobox", { name: /Provider \/ source/ })).toBeInTheDocument();
  });

  it("hides figures the gateway omits instead of showing 0", () => {
    setData({ summary: ok(summary([0, 0, 0], { total_sales: undefined, gross_profit: undefined })) });
    renderPage();
    expect(screen.queryByText("Total sales")).not.toBeInTheDocument();
    expect(screen.queryByText("Gross profit")).not.toBeInTheDocument();
  });

  it("sums money per currency and shows n/a, never 0, for profit the gateway can't compute", () => {
    setData({ summary: ok(summary([0, 0, 0], { total_sales: [rs(1_284_500), { currency: "SAR", amount_minor: 40_000 }],
      gross_profit: [{ currency: "PKR" }, { currency: "SAR", amount_minor: 10_000 }] })) });
    renderPage();
    expect(screen.getByText("Rs 1,284,500 · SAR 400")).toBeInTheDocument();
    expect(screen.getByText("Rs n/a · SAR 100")).toBeInTheDocument();
  });

  it("a single currency with unknown profit reads n/a", () => {
    setData({ summary: ok(summary([0, 0, 0], { gross_profit: [{ currency: "PKR" }] })) });
    renderPage();
    expect(screen.getByText("Gross profit").closest("div")?.parentElement).toHaveTextContent("n/a");
    expect(screen.queryByText("Rs 0")).not.toBeInTheDocument();
  });

  it("hides elements with no data source and labels not in the mockup", () => {
    renderPage();
    // Unknown issuance (gateway#85) and Recent activity (gateway#87) are shown now.
    for (const hidden of [/Money and balances/i, /Low airline balance/i, /Business today/i, /Local preview/i, /Showing \d/]) {
      expect(screen.queryByText(hidden)).not.toBeInTheDocument();
    }
    for (const filter of [/^Branch/, /^Channel/, /^Agency/]) {
      expect(screen.queryByRole("combobox", { name: filter })).not.toBeInTheDocument();
    }
    expect(screen.queryByRole("columnheader", { name: "Owner" })).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Date: All" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Product: All" })).toBeInTheDocument();
    // No provider recorded (empty list): the filter is hidden, like any control without data.
    expect(screen.queryByRole("combobox", { name: /Provider \/ source/ })).not.toBeInTheDocument();
    expect(screen.getByText("Follows all filters")).toBeInTheDocument();
    expect(screen.getByText("Follows date filter")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /refresh|reload/i })).not.toBeInTheDocument();
  });

  it("shows the attention queue with text labels, long references truncated, and View all to the placeholder", () => {
    renderPage();
    const queue = screen.getByRole("region", { name: "Attention Queue" });
    expect(within(queue).getByText("Hold expiring")).toBeInTheDocument();
    const reference = within(queue).getByRole("link", { name: "GROUP-LHE-JED-ZAMZAM-TOWERS-35PAX-REF-0001" });
    expect(reference).toHaveClass("truncate");
    expect(within(queue).getByText("No deadline")).toBeInTheDocument();
    expect(within(queue).getByRole("link", { name: "View all" })).toHaveAttribute("href", "/admin/attention-queue");
  });

  it("shows one clear message when the gateway isn't configured", () => {
    const error = new GatewayError("not_configured", "The dashboard service address isn't set. Add VITE_TRAVELIAN_GATEWAY_BASE_URL to this environment.");
    setData({ summary: failed(error), report: failed(error), attention: failed(error) });
    renderPage();
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getByRole("alert")).toHaveTextContent("VITE_TRAVELIAN_GATEWAY_BASE_URL");
  });

  it("says when imported bookings are included, and only then", () => {
    renderPage();
    expect(screen.queryByText("Includes imported bookings")).not.toBeInTheDocument();
    setData({ summary: ok({ ...summary([0, 0, 0]), contains_sample_data: true }) });
    renderPage();
    expect(screen.getByText("Includes imported bookings")).toBeInTheDocument();
  });

  it("shows one message when the booking source is unavailable everywhere", () => {
    const error = new GatewayError("unavailable", "Dashboard booking data isn't available yet. The gateway's booking source isn't configured or can't be read.");
    setData({ summary: failed(error), report: failed(error), attention: failed(error) });
    renderPage();
    expect(screen.getAllByRole("alert")).toHaveLength(1);
  });
});
