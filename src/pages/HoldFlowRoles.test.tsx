// Supplier fields in the Flights hold flow, by role. The gateway decides what each role receives
// (D23); these pages must show exactly that and never derive or keep supplier data otherwise.
import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { canAccessAdminPath } from "@/lib/admin-navigation";
import type { HoldDraft } from "@/lib/admin-search/hold";
import { STAFF_DRAFT, rs } from "@/test/hold-fixtures";

const gateway = vi.hoisted(() => ({ search: vi.fn(), reprice: vi.fn() }));
vi.mock("@/lib/admin-search/flights", async importOriginal => ({
  ...(await importOriginal<object>()), searchFlights: gateway.search, repriceFlights: gateway.reprice,
}));
const detail = vi.hoisted(() => ({ current: { data: undefined, isPending: false } as Record<string, unknown> }));
vi.mock("@/lib/admin-bookings/use-bookings", () => ({ useBookingDetail: () => detail.current }));

import { FlightsBooking } from "@/components/admin/search/FlightsBooking";
import HoldFlightPage from "./HoldFlightPage";
import HoldResultPage from "./HoldResultPage";

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const SUPPLIER_TEXT = /southair|Provider|Supplier cost|Margin|Admin only/i;
const fare = STAFF_DRAFT.picks[0].fare;

// What the gateway sends each role (fare rows from search; the quote from reprice).
const VIEWS: Record<string, { supplier?: string; supplier_cost?: ReturnType<typeof rs>; supplier_total?: ReturnType<typeof rs>; margin?: ReturnType<typeof rs> }> = {
  "staff, no permissions": {},
  "staff, supplier names": { supplier: "southair" },
  "staff, cost and margin": { supplier_cost: rs(13_330), supplier_total: rs(15_015), margin: rs(301) },
  "super admin": { supplier: "southair", supplier_cost: rs(13_330), supplier_total: rs(15_015), margin: rs(301) },
};

function draftFor(view: (typeof VIEWS)[string]): HoldDraft {
  const { supplier, supplier_cost, supplier_total, margin } = view;
  return {
    ...STAFF_DRAFT,
    picks: [{ ...STAFF_DRAFT.picks[0], fare: { ...fare, ...(supplier ? { supplier } : {}), ...(supplier_cost ? { supplier_cost } : {}) } }],
    quote: { ...STAFF_DRAFT.quote, ...(supplier_total ? { supplier_total } : {}), ...(margin ? { margin } : {}) },
  };
}

const renderAt = (element: React.ReactNode, path: string, state: unknown, search = "?mode=hold") =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[{ pathname: path, search, state }]}>
        <Routes><Route path={path} element={element} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("supplier fields in the hold flow follow what the gateway sends", () => {
  it.each(Object.entries(VIEWS))("hold page for %s", (_role, view) => {
    renderAt(<HoldFlightPage />, "/admin/search/flights/hold", draftFor(view));
    const summary = screen.getByRole("complementary", { name: "Selected fare" });
    expect(Boolean(within(summary).queryByText(/Provider: southair/))).toBe(Boolean(view.supplier));
    expect(summary.textContent?.includes("Supplier cost Rs 15,015")).toBe(Boolean(view.supplier_total));
    expect(summary.textContent?.includes("Margin Rs 301")).toBe(Boolean(view.margin));
    if (!view.supplier && !view.supplier_total) expect(summary).not.toHaveTextContent(SUPPLIER_TEXT);
    // The form itself never shows supplier data, whatever the role.
    expect(screen.getByRole("region", { name: "Customer" })).not.toHaveTextContent(SUPPLIER_TEXT);
    for (const card of ["Adult 1", "Infant 1"]) expect(screen.getByRole("region", { name: card })).not.toHaveTextContent(SUPPLIER_TEXT);
  });

  it.each(Object.entries(VIEWS))("price-changed dialog for %s shows no supplier fields", async (_role, view) => {
    gateway.search.mockResolvedValue({
      search_id: "s1", expires_at: new Date(Date.now() + 600_000).toISOString(), status: "complete",
      journeys: [{ direction: "outbound", origin: "LHE", destination: "KHI", flights: [{ ...STAFF_DRAFT.picks[0].flight, fares: [{ ...fare, ...view }] }] }],
    });
    gateway.reprice.mockResolvedValue({ ...STAFF_DRAFT.quote, price_changed: true, old_price_per_adult: rs(13_597), new_price_per_adult: rs(13_700),
      price_difference_per_adult: rs(103), ...(view.supplier_total ? { supplier_total: view.supplier_total, margin: view.margin } : {}) });
    renderAt(<FlightsBooking />, "/admin/bookings/new", null, "?tab=flights&from=LHE&to=KHI&date=2026-11-19");
    fireEvent.click(await screen.findByRole("button", { name: "Book Z8266 EB" }));
    const dialog = await screen.findByRole("dialog", { name: "The fare price has changed" });
    expect(dialog).not.toHaveTextContent(SUPPLIER_TEXT);
  });

  it("hold result shows no supplier fields for any role", () => {
    detail.current = { data: { booking_id: "TRV-PE49ZP", passengers: [], customer: null }, isPending: false };
    renderAt(<HoldResultPage />, "/admin/search/flights/hold/result", {
      kind: "held", mode: "hold", hold: { booking_id: "TRV-PE49ZP", pnr: "CAEDEC", selling_total: rs(15_316), label: "UAT test data", warnings: [] },
    });
    expect(document.body).not.toHaveTextContent(SUPPLIER_TEXT);
  });

  it("agency and customer roles can't open the hold pages (the gateway also refuses their holds)", () => {
    for (const role of ["agency_owner", "agency_staff", "customer"] as const) {
      expect(canAccessAdminPath(role, "/admin/search/flights/hold")).toBe(false);
      expect(canAccessAdminPath(role, "/admin/search/flights/hold/result")).toBe(false);
    }
  });
});
