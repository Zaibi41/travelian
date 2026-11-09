import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FlightSearchView } from "@/lib/admin-search/flights";
import { filterFlights, DEFAULT_FILTERS, parseFlightSearch, writeFlightSearch, isCompleteFlightSearch } from "@/lib/admin-search/flights";

const gateway = vi.hoisted(() => ({ search: vi.fn() }));
vi.mock("@/lib/admin-search/flights", async importOriginal => ({ ...(await importOriginal<object>()), searchFlights: gateway.search }));

import { FlightsSearch } from "./FlightsSearch";

// jsdom has no ResizeObserver; the Radix popover needs one.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const fare = (id: string, price: number, refund = "Refundable") => ({ id, name: id.toUpperCase(), meal: "Snacks", refund, time_limit: "1 hours for domestic", selling_price: rs(price) });

// What the gateway sends staff (D23): opaque IDs and selling prices only.
const STAFF: FlightSearchView = {
  search_id: "s1", expires_at: new Date(Date.now() + 10 * 60_000).toISOString(), status: "complete",
  journeys: [{
    direction: "outbound", origin: "KHI", destination: "MUX",
    flights: [
      { id: "f1", airline_code: "MM", airline_name: "Synthetic Aviation With A Very Long Airline Name", flight_number: "MM112", departure_local: "2026-11-27T23:00", arrival_local: "2026-11-28T00:00", duration_minutes: 60, stops: 0, stop_cities: [], fares: [fare("eb", 467), fare("ep", 520, "Non-refundable"), fare("ex", 600), fare("ez", 700)] },
      { id: "f2", airline_code: "MM", airline_name: "Synthetic Aviation", flight_number: "MM114", departure_local: "2026-11-27T08:00", arrival_local: "2026-11-27T10:30", duration_minutes: 150, stops: 1, stop_cities: ["LHE"], fares: [fare("y", 306)] },
    ],
  }],
};

const renderAt = (url: string) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[url]}><FlightsSearch /></MemoryRouter>
    </QueryClientProvider>,
  );

describe("admin Flights search", () => {
  beforeEach(() => gateway.search.mockReset().mockResolvedValue(STAFF));

  it("searches from the URL and shows flight cards with fare rows, cheapest first", async () => {
    renderAt("/admin/search?tab=flights&from=KHI&to=MUX&date=2026-11-27");
    const results = await screen.findByRole("region", { name: "Results" });
    expect(gateway.search).toHaveBeenCalledWith(expect.objectContaining({ from: "KHI", to: "MUX", date: "2026-11-27", adults: 1, trip: "oneway" }), expect.anything());
    const cards = within(results).getAllByRole("article");
    expect(cards[0]).toHaveTextContent("MM114");  // Rs 306 is cheapest
    expect(cards[0]).toHaveTextContent("1 stop via LHE");
    expect(within(cards[1]).getByText("Rs 467")).toBeInTheDocument();
    expect(within(cards[1]).getAllByRole("row")).toHaveLength(4);  // header + 3 fares, then "Show 1 more fares"
    fireEvent.click(within(cards[1]).getByRole("button", { name: "Show 1 more fares" }));
    expect(within(cards[1]).getAllByRole("row")).toHaveLength(5);
    expect(screen.getByRole("note")).toHaveTextContent("Search prices are indicative.");
    expect(screen.getByRole("group", { name: /Search expiry/ })).toBeInTheDocument();
  });

  it("shows no supplier or provider card to staff; admins get the provider card from the gateway", async () => {
    const { unmount } = renderAt("/admin/search?tab=flights&from=KHI&to=MUX&date=2026-11-27");
    await screen.findByRole("region", { name: "Results" });
    expect(screen.queryByText(/Available providers|southair|supplier/i)).not.toBeInTheDocument();
    unmount();
    gateway.search.mockResolvedValue({ ...STAFF, providers: [{ name: "southair", status: "responded" }] });
    renderAt("/admin/search?tab=flights&from=KHI&to=MUX&date=2026-11-27");
    expect(await screen.findByRole("group", { name: /Available providers: 1 of 1/ })).toBeInTheDocument();
  });

  it("shows the general notice when the provider fails (D24)", async () => {
    gateway.search.mockResolvedValue({ ...STAFF, status: "unavailable", notice: "Some results may be missing.", journeys: [] });
    renderAt("/admin/search?tab=flights&from=KHI&to=MUX&date=2026-11-27");
    expect(await screen.findByRole("alert")).toHaveTextContent("Some results may be missing.");
  });

  it("waits for a complete search; travelers keep their minimums", () => {
    renderAt("/admin/search?tab=flights");
    expect(screen.getByRole("button", { name: "Search flights" })).toBeDisabled();
    expect(gateway.search).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "1 Traveler" }));
    expect(screen.getByRole("button", { name: "Fewer adults" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Fewer infants" })).toBeDisabled();
  });
});

describe("flight search helpers", () => {
  it("keeps the search in the URL and validates it", () => {
    const search = parseFlightSearch(new URLSearchParams("trip=roundtrip&from=khi&to=MUX&date=2026-11-27&return=2026-11-30&adults=2&infants=1"));
    expect(search).toEqual({ trip: "roundtrip", from: "KHI", to: "MUX", date: "2026-11-27", returnDate: "2026-11-30", adults: 2, children: 0, infants: 1 });
    expect(writeFlightSearch(new URLSearchParams("tab=flights"), search).toString()).toBe("tab=flights&trip=roundtrip&from=KHI&to=MUX&date=2026-11-27&return=2026-11-30&adults=2&infants=1");
    expect(isCompleteFlightSearch(search)).toBe(true);
    expect(isCompleteFlightSearch({ ...search, returnDate: "2026-11-01" })).toBe(false);
    expect(isCompleteFlightSearch({ ...search, infants: 3 })).toBe(false);
  });
  it("filters by stops, time and refund, dropping flights with no fares left", () => {
    const flights = STAFF.journeys[0].flights;
    expect(filterFlights(flights, { ...DEFAULT_FILTERS, stops: "nonstop" }).map(f => f.id)).toEqual(["f1"]);
    expect(filterFlights(flights, { ...DEFAULT_FILTERS, time: "morning" }).map(f => f.id)).toEqual(["f2"]);
    const refundable = filterFlights(flights, { ...DEFAULT_FILTERS, refund: "non_refundable" });
    expect(refundable.map(f => [f.id, f.fares.map(x => x.id)])).toEqual([["f1", ["ep"]]]);
  });
});
