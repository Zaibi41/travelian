import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { HoldDraft } from "@/lib/admin-search/hold";
import HoldFlightPage from "./HoldFlightPage";

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });

// What the fare check hands over for staff without supplier permissions: no supplier fields.
export const STAFF_DRAFT: HoldDraft = {
  mode: "hold", searchId: "s1", confirmedAt: "2026-11-19T10:05:00", acceptPriceChange: false,
  request: { trip: "oneway", from: "LHE", to: "KHI", date: "2026-11-19", adults: 1, children: 0, infants: 1 },
  picks: [{
    journey: { direction: "outbound", origin: "LHE", destination: "KHI", flights: [] },
    flight: { id: "f1", airline_code: "Z8", airline_name: "South Air", flight_number: "Z8266", departure_local: "2026-11-19T00:25",
      arrival_local: "2026-11-19T02:35", duration_minutes: 130, stops: 0, stop_cities: [], fares: [] },
    fare: { id: "x1", name: "EB", baggage: "No checked baggage", selling_price: rs(13_597) },
  }],
  quote: {
    quote_id: "q1", expires_at: new Date(Date.now() + 9 * 60_000).toISOString(), selling_total: rs(15_316), new_total: rs(15_316),
    passengers: [{ type: "ADT", count: 1, selling_each: rs(13_597) }, { type: "INF", count: 1, selling_each: rs(1_719) }],
    price_changed: false, booking_enabled: true, new_price_per_adult: rs(13_597),
  },
};

// The same for a role the gateway sends supplier fields to.
export const ADMIN_DRAFT: HoldDraft = {
  ...STAFF_DRAFT,
  picks: [{ ...STAFF_DRAFT.picks[0], fare: { ...STAFF_DRAFT.picks[0].fare, supplier: "southair", supplier_cost: rs(13_330) } }],
  quote: { ...STAFF_DRAFT.quote, supplier_total: rs(15_015), margin: rs(301) },
};

export const renderHoldPage = (state: unknown, url = "/admin/search/flights/hold?mode=hold") =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <MemoryRouter initialEntries={[{ pathname: url.split("?")[0], search: url.includes("?") ? `?${url.split("?")[1]}` : "", state }]}>
        <Routes><Route path="/admin/search/flights/hold" element={<HoldFlightPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("Hold flight page: Selected fare", () => {
  it("shows the flight, fare, baggage, gateway prices, confirmed time and the countdown; no supplier fields for staff", () => {
    renderHoldPage(STAFF_DRAFT);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Hold flight");
    const summary = screen.getByRole("region", { name: "Selected fare" });
    for (const text of ["South Air", "Z8266", "00:25", "02:35", "LHE", "KHI", "02h 10m · Non-stop", "EB", "No checked baggage", "Rs 13,597", "Rs 15,316", "Fare confirmed at 10:05"]) {
      expect(summary).toHaveTextContent(text);
    }
    expect(within(summary).getByText(/^Valid for \d\d:\d\d$/)).toBeInTheDocument();
    expect(summary).toHaveTextContent("Travelers2");
    expect(summary).not.toHaveTextContent(/Admin only|Provider|Supplier cost|Margin|southair/i);
  });

  it("shows provider, supplier cost and margin only when the gateway sent them", () => {
    renderHoldPage(ADMIN_DRAFT);
    const summary = screen.getByRole("region", { name: "Selected fare" });
    expect(summary).toHaveTextContent("Admin only");
    expect(summary).toHaveTextContent("Provider: southair");
    expect(summary).toHaveTextContent("Supplier cost Rs 15,015 · Margin Rs 301");
  });

  it("Book opens the same page titled Book flight", () => {
    renderHoldPage(STAFF_DRAFT, "/admin/search/flights/hold?mode=book");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Book flight");
  });

  it("without a fare check (reload or direct link) says the fare must be checked again", () => {
    renderHoldPage(null);
    expect(screen.getByText("This fare check has ended")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Selected fare" })).not.toBeInTheDocument();
  });
});
