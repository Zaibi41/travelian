import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FlightSearchView } from "@/lib/admin-search/flights";
import { filterFlights, DEFAULT_FILTERS, parseFlightSearch, writeFlightSearch, isCompleteFlightSearch, baggageOptions, priceBands, NO_BAGGAGE_INFO } from "@/lib/admin-search/flights";

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
    expect(within(cards[1]).getAllByRole("row")).toHaveLength(3);  // header + 2 fares, then "Show 2 more fares"
    fireEvent.click(within(cards[1]).getByRole("button", { name: "Show 2 more fares" }));
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

  it("shows 'not available yet', never 'Some results may be missing', when nothing came back", async () => {
    // Even if an older gateway still sends the notice with no results.
    gateway.search.mockResolvedValue({ ...STAFF, status: "unavailable", notice: "Some results may be missing.", journeys: [] });
    renderAt("/admin/search?tab=flights&from=KHI&to=MUX&date=2026-11-27");
    expect(await screen.findByText("Flight search isn't available yet")).toBeInTheDocument();
    expect(screen.queryByText(/Some results may be missing/)).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Results" })).not.toBeInTheDocument();
  });

  it("shows the general notice with the results when some providers failed (D24)", async () => {
    gateway.search.mockResolvedValue({ ...STAFF, notice: "Some results may be missing." });
    renderAt("/admin/search?tab=flights&from=KHI&to=MUX&date=2026-11-27");
    const results = await screen.findByRole("region", { name: "Results" });
    expect(results).toHaveTextContent("Some results may be missing.");
    expect(results).toHaveTextContent("MM112");
    expect(screen.queryByText("Flight search isn't available yet")).not.toBeInTheDocument();
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

// Sanitized gateway response for a real Southair UAT search, LHE-KHI 19 Nov 2026, as staff
// with a 5% markup: opaque IDs only, no supplier fields.
const LIVE_UAT: FlightSearchView = {
  search_id: "s-live", expires_at: new Date(Date.now() + 10 * 60_000).toISOString(), status: "complete",
  journeys: [{
    direction: "outbound", origin: "LHE", destination: "KHI",
    flights: [{
      id: "f-live", airline_code: "Z8", airline_name: "South Air", flight_number: "Z8266",
      departure_local: "2026-11-19T00:25", arrival_local: "2026-11-19T02:35", duration_minutes: 130, stops: 0, stop_cities: [],
      fares: [
        { id: "x1", name: "EB", baggage: "No checked baggage", selling_price: rs(13_997) },
        { id: "x2", name: "EV", baggage: "20KG", selling_price: rs(15_671) },
        { id: "x3", name: "EP", baggage: "30KG", selling_price: rs(17_344) },
      ],
    }],
  }],
};

describe("admin Flights search, live Southair shape", () => {
  it("shows times, duration, stops and per-fare baggage; meal, refund and hold time say not available", async () => {
    gateway.search.mockReset().mockResolvedValue(LIVE_UAT);
    renderAt("/admin/search?tab=flights&from=LHE&to=KHI&date=2026-11-19");
    const results = await screen.findByRole("region", { name: "Results" });
    expect(results).toHaveTextContent("00:25");
    expect(results).toHaveTextContent("02:35");
    expect(results).toHaveTextContent("02h 10m");
    expect(results).toHaveTextContent("Non-stop");
    fireEvent.click(within(results).getByRole("button", { name: "Show 1 more fares" }));
    const rows = within(results).getAllByRole("row").slice(1);
    expect(rows.map(row => within(row).getAllByRole("cell")[2].textContent)).toEqual(["No checked baggage", "20KG", "30KG"]);
    for (const row of rows) {
      expect(row).toHaveTextContent("Meal info not available");
      expect(row).toHaveTextContent("Not available yet");  // refund
      expect(row).toHaveTextContent("Hold time not available");
    }
    expect(results).not.toHaveTextContent("Baggage info not available");
    expect(document.body.innerHTML).not.toMatch(/southair/i);
    expect(document.body.innerHTML).not.toMatch(/Nill Baggage|HIGHLIGHT|\bACC\b|\bHASH\b|\bNLD\b|feature_code|Validity/);
  });

  it("says the price is not available when the gateway sends no selling price (no markup)", async () => {
    const noMarkup = structuredClone(LIVE_UAT);
    noMarkup.journeys[0].flights[0].fares.forEach(fare => { delete fare.selling_price; });
    gateway.search.mockReset().mockResolvedValue(noMarkup);
    renderAt("/admin/search?tab=flights&from=LHE&to=KHI&date=2026-11-19");
    const results = await screen.findByRole("region", { name: "Results" });
    fireEvent.click(within(results).getByRole("button", { name: "Show 1 more fares" }));
    expect(within(results).getAllByText("Price not available")).toHaveLength(3);
    expect(screen.getByRole("combobox", { name: "Price range" })).toBeDisabled();
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

describe("mockup elements (Search > Flights)", () => {
  beforeEach(() => gateway.search.mockReset().mockResolvedValue(STAFF));
  const url = "/admin/search?tab=flights&from=KHI&to=MUX&date=2026-11-27";

  it("search bar: Multi-city disabled with a reason, Cabin Class Economy, Return date disabled until Round-trip", async () => {
    renderAt(url);
    const multi = screen.getByRole("radio", { name: "Multi-city" });
    expect(multi).toBeDisabled();
    expect(multi).toHaveAccessibleDescription("Multi-city isn't available from the current flight provider.");
    expect(screen.getByRole("combobox", { name: "Cabin Class" })).toHaveTextContent("Economy");
    const returnDate = screen.getByLabelText("Return date");
    expect(returnDate).toBeDisabled();
    expect(returnDate).toHaveAccessibleDescription("Choose Round-trip to add a return date.");
    fireEvent.click(screen.getByRole("radio", { name: "Round-trip" }));
    expect(screen.getByLabelText("Return date")).toBeEnabled();
  });

  it("no Provider field, provider counts or provider names for staff; Quotes pending never shown", async () => {
    renderAt(url);
    const results = await screen.findByRole("region", { name: "Results" });
    expect(screen.queryByRole("combobox", { name: "Provider" })).not.toBeInTheDocument();
    expect(results).not.toHaveTextContent(/Providers responding|southair|Provider/);
    expect(screen.queryByText(/Quotes pending/)).not.toBeInTheDocument();
  });

  it("admin: Provider field, providers responding and provider per fare row come from the gateway", async () => {
    const withSupplier = structuredClone(STAFF);
    withSupplier.providers = [{ name: "southair", status: "responded" }];
    withSupplier.journeys[0].flights.forEach(f => f.fares.forEach(fare => { fare.supplier = "southair"; }));
    gateway.search.mockResolvedValue(withSupplier);
    renderAt(url);
    const results = await screen.findByRole("region", { name: "Results" });
    expect(screen.getByRole("combobox", { name: "Provider" })).toHaveTextContent("All providers");
    expect(results).toHaveTextContent("Providers responding 1 of 1");
    expect(within(results).getAllByRole("columnheader", { name: "Hold left · Provider" }).length).toBeGreaterThan(0);
    expect(within(results).getAllByText("southair").length).toBeGreaterThan(0);
  });

  it("results header: fare valid until (from expires_at) and Sort by", async () => {
    const expires = new Date(2026, 10, 27, 14, 5);
    gateway.search.mockResolvedValue({ ...STAFF, expires_at: expires.toISOString() });
    renderAt(url);
    const results = await screen.findByRole("region", { name: "Results" });
    expect(results).toHaveTextContent("Fare valid until 14:05");
    expect(within(results).getByRole("combobox", { name: "Sort by" })).toHaveTextContent("Price, low to high");
  });

  it("filters: Baggage and Price range from the results; Refundable enabled only with refund data", async () => {
    const noRefund = structuredClone(STAFF);
    noRefund.journeys[0].flights.forEach(f => f.fares.forEach(fare => { delete fare.refund; }));
    gateway.search.mockResolvedValue(noRefund);
    const { unmount } = renderAt(url);
    await screen.findByRole("region", { name: "Results" });
    expect(screen.getByRole("combobox", { name: "Baggage" })).toBeEnabled();
    expect(screen.getByRole("combobox", { name: "Price range" })).toBeEnabled();
    const refund = screen.getByRole("combobox", { name: "Refundable" });
    expect(refund).toBeDisabled();
    expect(refund).toHaveAccessibleDescription("Not available yet");
    unmount();
    gateway.search.mockResolvedValue(STAFF);
    renderAt(url);
    await screen.findByRole("region", { name: "Results" });
    expect(screen.getByRole("combobox", { name: "Refundable" })).toBeEnabled();
  });

  it("card: neutral logo placeholder (no image), Flight details dialog with real fields, refund badge only with data", async () => {
    renderAt(url);
    const results = await screen.findByRole("region", { name: "Results" });
    expect(results.querySelectorAll("img")).toHaveLength(0);
    const card = within(results).getAllByRole("article")[1];
    expect(within(card).getByText("Refundable")).toBeInTheDocument();
    expect(within(card).getByText("Non-refundable")).toBeInTheDocument();
    fireEvent.click(within(card).getByRole("button", { name: "Flight details" }));
    const dialog = await screen.findByRole("dialog", { name: "Flight details" });
    expect(dialog).toHaveTextContent("MM112");
    expect(dialog).toHaveTextContent("KHI");
    expect(dialog).toHaveTextContent("01h 00m");
    expect(dialog).toHaveTextContent("Non-stop");
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("never shows a 'Staff fare' tag (the gateway sends no fare type)", async () => {
    renderAt(url);
    const results = await screen.findByRole("region", { name: "Results" });
    expect(results).not.toHaveTextContent("Staff fare");
  });
});

describe("filter helpers (real data only)", () => {
  const flights = LIVE_UAT.journeys[0].flights;
  it("baggage options are the values in the results, plus 'not available' only when some fare lacks it", () => {
    expect(baggageOptions(flights).map(o => o.label)).toEqual(["20KG", "30KG", "No checked baggage"]);
    const missing = structuredClone(flights);
    delete missing[0].fares[0].baggage;
    expect(baggageOptions(missing).map(o => o.value)).toContain(NO_BAGGAGE_INFO);
    expect(filterFlights(flights, { ...DEFAULT_FILTERS, baggage: "20KG" })[0].fares.map(f => f.name)).toEqual(["EV"]);
    expect(filterFlights(missing, { ...DEFAULT_FILTERS, baggage: NO_BAGGAGE_INFO })[0].fares.map(f => f.name)).toEqual(["EB"]);
  });

  it("price bands span the real selling prices and filter fares", () => {
    const bands = priceBands(flights);  // Rs 13,997 / 15,671 / 17,344
    expect(bands.map(b => b.label)).toEqual(["Rs 13,000 – Rs 15,000", "Rs 15,000 – Rs 17,000", "Rs 17,000 – Rs 18,000"]);
    expect(filterFlights(flights, { ...DEFAULT_FILTERS, price: bands[0].value })[0].fares.map(f => f.name)).toEqual(["EB"]);
    const noPrices = structuredClone(flights);
    noPrices[0].fares.forEach(fare => { delete fare.selling_price; });
    expect(priceBands(noPrices)).toEqual([]);
  });

  it("provider filter keeps only fares from that provider", () => {
    const tagged = structuredClone(flights);
    tagged[0].fares[0].supplier = "southair";
    expect(filterFlights(tagged, { ...DEFAULT_FILTERS, provider: "southair" })[0].fares.map(f => f.name)).toEqual(["EB"]);
  });
});
