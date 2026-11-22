import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FlightSearchView } from "@/lib/admin-search/flights";
import { filterFlights, DEFAULT_FILTERS, parseFlightSearch, writeFlightSearch, isCompleteFlightSearch, baggageOptions, priceBands } from "@/lib/admin-search/flights";

const gateway = vi.hoisted(() => ({ search: vi.fn() }));
vi.mock("@/lib/admin-search/flights", async importOriginal => ({ ...(await importOriginal<object>()), searchFlights: gateway.search }));

import { FlightsSearch } from "./FlightsSearch";

// jsdom has no ResizeObserver; the Radix popover needs one.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;
// Radix Select scrolls and checks pointer capture; jsdom has neither.
Element.prototype.scrollIntoView ??= function scrollIntoView() {};
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => {};

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const fare = (id: string, price: number, refund = "Refundable") => ({ id, name: id.toUpperCase(), meal: "Snacks", refund, time_limit: "1 hours for domestic", selling_price: rs(price), booking_mode: "hold" as const });

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
    // One status line replaces the provider and expiry cards and the yellow banner.
    expect(screen.getByLabelText("Search status")).toHaveTextContent(/Fares valid until \d\d:\d\d \(\d\d:\d\d left\) · Prices are revalidated before booking/);
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    expect(screen.queryByText(/Search prices are indicative|Search expiry|Available providers/)).not.toBeInTheDocument();
  });

  it("shows no provider count or names to staff; admins get 'Providers responding' in the status line from the gateway", async () => {
    const { unmount } = renderAt("/admin/search?tab=flights&from=KHI&to=MUX&date=2026-11-27");
    await screen.findByRole("region", { name: "Results" });
    expect(screen.queryByText(/Providers responding|southair|supplier/i)).not.toBeInTheDocument();
    unmount();
    gateway.search.mockResolvedValue({ ...STAFF, providers: [{ name: "southair", status: "responded" }] });
    renderAt("/admin/search?tab=flights&from=KHI&to=MUX&date=2026-11-27");
    expect(await screen.findByLabelText("Search status")).toHaveTextContent(/^Providers responding 1 of 1 · Fares valid until/);
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
    fireEvent.click(screen.getByRole("button", { name: "Travelers: 1 adult" }));
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
        { id: "x1", name: "EB", baggage: "No checked baggage", selling_price: rs(13_997), booking_mode: "hold" },
        { id: "x2", name: "EV", baggage: "20KG", selling_price: rs(15_671), booking_mode: "hold" },
        { id: "x3", name: "EP", baggage: "30KG", selling_price: rs(17_344), booking_mode: "hold" },
      ],
    }],
  }],
};

describe("admin Flights search, live Southair shape", () => {
  it("shows times, duration, stops and per-fare baggage; missing meal says No Meal, missing refund a dash", async () => {
    gateway.search.mockReset().mockResolvedValue(LIVE_UAT);
    renderAt("/admin/search?tab=flights&from=LHE&to=KHI&date=2026-11-19");
    const results = await screen.findByRole("region", { name: "Results" });
    expect(results).toHaveTextContent("00:25");
    expect(results).toHaveTextContent("02:35");
    expect(results).toHaveTextContent("02h 10m");
    expect(results).toHaveTextContent("Non-stop");
    fireEvent.click(within(results).getByRole("button", { name: "Show 1 more fares" }));
    const rows = within(results).getAllByRole("row").slice(1);
    // #36: the short form with the full words for screen readers (Southair sends no hand carry: none is assumed).
    expect(rows.map(row => within(row).getAllByRole("cell")[2].textContent)).toEqual([
      "No checked bagNo checked bag; hand carry: check with airline", "20 kg checked20 kg checked; hand carry: check with airline",
      "30 kg checked30 kg checked; hand carry: check with airline"]);
    for (const row of rows) {
      const cells = within(row).getAllByRole("cell").map(cell => cell.textContent);
      expect([cells[1], cells[3]]).toEqual(["No Meal", "—Not available"]);  // meal says No Meal; refund a dash (screen readers hear "Not available"); no Hold left (#78)
      expect(row).not.toHaveTextContent(/info not available|Not available yet|Hold time not available/);
    }
    expect(results).not.toHaveTextContent("Baggage info not available");
    // #75: Travelian's own South Air logo, same tile as the website (not the bare code)
    expect(within(results).getAllByRole("img", { name: "South Air logo" })[0]).toHaveAttribute("src", "/airline-logos/south-air.png");
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
    expect(within(results).getAllByRole("row").slice(1).map(row => within(row).getAllByRole("cell")[4].textContent)).toEqual(["—Not available", "—Not available", "—Not available"]);
    expect(screen.getAllByRole("group", { name: "Price range" })[0]).toBeDisabled();
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

  it("two lines: trip type, Travelers and Cabin above; From, To, dates and Search flights in the field row; Return only for Round-trip", async () => {
    renderAt(url);
    const row = document.querySelector(".admin-search-row")!;
    expect([...row.children].map(child => child.getAttribute("data-size"))).toEqual(["route", "date", "submit"]);
    const line1 = screen.getByRole("radiogroup", { name: "Trip type" }).parentElement!;
    expect(line1).not.toBe(row);
    expect(within(line1).getByRole("button", { name: "Travelers: 1 adult" })).toBeInTheDocument();
    expect(within(line1).getByRole("combobox", { name: "Cabin Class" })).toHaveTextContent("Economy");
    expect(screen.queryByRole("combobox", { name: "Trip" })).not.toBeInTheDocument();
    const multi = screen.getByRole("radio", { name: "Multi-city" });
    expect(multi).toBeDisabled();
    expect(multi).toHaveAccessibleDescription("Multi-city isn't available from the current flight provider.");
    expect(screen.queryByLabelText("Return date")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Round-trip" }));
    expect(screen.getByLabelText("Return date")).toBeEnabled();
    expect([...row.children].map(child => child.getAttribute("data-size"))).toEqual(["route", "date", "date", "submit"]);
    fireEvent.click(screen.getByRole("button", { name: "Travelers: 1 adult" }));
    fireEvent.click(screen.getByRole("button", { name: "More children" }));
    expect(screen.getByRole("button", { name: "Travelers: 1 adult, 1 child" })).toBeInTheDocument();
  });

  it("no Provider field, provider counts or provider names for staff; Quotes pending never shown", async () => {
    renderAt(url);
    const results = await screen.findByRole("region", { name: "Results" });
    expect(screen.queryByRole("combobox", { name: "Provider" })).not.toBeInTheDocument();
    expect(results).not.toHaveTextContent(/Providers responding|southair|Provider/);
    expect(screen.getByLabelText("Search status")).not.toHaveTextContent(/Providers/);
    expect(screen.queryByRole("group", { name: "Provider" })).not.toBeInTheDocument();
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
    expect(screen.getByLabelText("Search status")).toHaveTextContent("Providers responding 1 of 1");
    expect(screen.getAllByRole("group", { name: "Provider" }).length).toBeGreaterThan(0);
    expect(within(results).getAllByRole("columnheader", { name: "Provider" }).length).toBeGreaterThan(0);
    expect(within(results).getAllByText("southair").length).toBeGreaterThan(0);
  });

  it("#78: no Hold left column or time limit text, with or without provider names", async () => {
    renderAt(url);
    const results = await screen.findByRole("region", { name: "Results" });
    expect(within(results).queryByRole("columnheader", { name: /Hold left|Provider/ })).not.toBeInTheDocument();
    expect(within(results).getAllByRole("columnheader").map(header => header.textContent)).toEqual(
      expect.arrayContaining(["Fare", "Meal", "Baggage", "Refund", "Price"]));
    expect(results).not.toHaveTextContent(/Hold left|1 hours for domestic/);
  });

  it("status line: fares valid until (from expires_at); Sort by with the public site's options plus arrival", async () => {
    const expires = new Date(Date.now() + 9 * 60_000);
    gateway.search.mockResolvedValue({ ...STAFF, expires_at: expires.toISOString() });
    renderAt(url);
    const results = await screen.findByRole("region", { name: "Results" });
    const hhmm = `${String(expires.getHours()).padStart(2, "0")}:${String(expires.getMinutes()).padStart(2, "0")}`;
    expect(screen.getByLabelText("Search status")).toHaveTextContent(`Fares valid until ${hhmm}`);
    const sort = within(results).getByRole("combobox", { name: "Sort by" });
    expect(sort).toHaveTextContent("Price, low to high");
    fireEvent.keyDown(sort, { key: "ArrowDown" });
    expect((await screen.findAllByRole("option")).map(option => option.textContent)).toEqual([
      "Price, low to high", "Price, high to low", "Shortest duration", "Longest duration", "Departure, early to late", "Arrival, early to late"]);
    fireEvent.click(screen.getByRole("option", { name: "Price, high to low" }));
    expect(within(results).getAllByRole("article").map(card => card.getAttribute("aria-label"))).toEqual([
      "Synthetic Aviation With A Very Long Airline Name MM112", "Synthetic Aviation MM114"]);
  });

  it("filters in a rail: all seven, chips for active ones, removing a chip and Clear all", async () => {
    const withSupplier = structuredClone(STAFF);
    withSupplier.providers = [{ name: "southair", status: "responded" }];
    gateway.search.mockResolvedValue(withSupplier);
    renderAt(url);
    const results = await screen.findByRole("region", { name: "Results" });
    const rail = screen.getByRole("complementary", { name: "Filters" });
    const desktop = rail.querySelector(".xl\\:block") as HTMLElement;
    expect(within(desktop).getAllByRole("group").map(group => group.getAttribute("aria-label")))
      .toEqual(["Airline", "Stops", "Departure time", "Baggage", "Refundable", "Price range", "Provider"]);
    expect(screen.queryByRole("group", { name: "Active filters" })).not.toBeInTheDocument();
    fireEvent.click(within(within(desktop).getByRole("group", { name: "Stops" })).getByRole("radio", { name: "Non-stop" }));
    fireEvent.click(within(within(desktop).getByRole("group", { name: "Departure time" })).getByRole("radio", { name: "Night (21–05)" }));
    const chips = screen.getByRole("group", { name: "Active filters" });
    expect(within(chips).getAllByRole("button").map(button => button.textContent)).toEqual(["Stops: Non-stop", "Departure time: Night (21–05)", "Clear all"]);
    expect(within(results).getAllByRole("article")).toHaveLength(1);
    fireEvent.click(within(chips).getByRole("button", { name: "Remove filter Stops: Non-stop" }));
    expect(within(screen.getByRole("group", { name: "Active filters" })).getAllByRole("button")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(screen.queryByRole("group", { name: "Active filters" })).not.toBeInTheDocument();
    expect(within(results).getAllByRole("article")).toHaveLength(2);
  });

  it("filters: Baggage and Price range from the results; Refundable enabled only with refund data", async () => {
    const noRefund = structuredClone(STAFF);
    noRefund.journeys[0].flights.forEach(f => f.fares.forEach(fare => { delete fare.refund; }));
    gateway.search.mockResolvedValue(noRefund);
    const { unmount } = renderAt(url);
    await screen.findByRole("region", { name: "Results" });
    expect(screen.getAllByRole("group", { name: "Baggage" })[0]).toBeEnabled();
    expect(screen.getAllByRole("group", { name: "Price range" })[0]).toBeEnabled();
    const refund = screen.getAllByRole("group", { name: "Refundable" })[0];
    expect(refund).toBeDisabled();  // visible, off, with a tooltip instead of helper text
    expect(refund).toHaveAttribute("title", "Not provided by suppliers yet");
    expect(refund).toHaveAccessibleDescription("Not provided by suppliers yet");
    unmount();
    gateway.search.mockResolvedValue(STAFF);
    renderAt(url);
    await screen.findByRole("region", { name: "Results" });
    expect(screen.getAllByRole("group", { name: "Refundable" })[0]).toBeEnabled();
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
  it("baggage options are the results' baggage in the short form, lightest first; 'check with airline' only when some fare lacks it (#36)", () => {
    // Older gateway text (before #36) is read the same way as the new short form.
    expect(baggageOptions(flights).map(o => o.label)).toEqual(["No checked bag", "20 kg checked", "30 kg checked"]);
    const missing = structuredClone(flights);
    delete missing[0].fares[0].baggage;
    expect(baggageOptions(missing).map(o => o.value)).toContain("Baggage: check with airline");
    expect(filterFlights(flights, { ...DEFAULT_FILTERS, baggage: "20 kg checked" })[0].fares.map(f => f.name)).toEqual(["EV"]);
    expect(filterFlights(missing, { ...DEFAULT_FILTERS, baggage: "Baggage: check with airline" })[0].fares.map(f => f.name)).toEqual(["EB"]);
    const sent = structuredClone(flights);
    Object.assign(sent[0].fares[1], { baggage: "7+20 kg", baggage_detail: "7 kg hand carry + 20 kg checked" });
    Object.assign(sent[0].fares[0], { baggage: "7 kg", baggage_detail: "7 kg hand carry only, no checked bag" });
    expect(baggageOptions(sent).map(o => o.label)).toEqual(["7 kg (hand carry only)", "7+20 kg", "30 kg checked"]);
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

describe("Search > Flights small fixes (item 3)", () => {
  beforeEach(() => gateway.search.mockReset());
  const empty = (extra: Partial<FlightSearchView> = {}) => ({ ...STAFF, journeys: [{ ...STAFF.journeys[0], flights: [] }], ...extra });

  it("a) zero flights without filters names the route and date", async () => {
    gateway.search.mockResolvedValue(empty());
    renderAt("/admin/search?tab=flights&from=KHI&to=MUX&date=2026-11-24");
    expect(await screen.findByText("No flights found for KHI to MUX on 24 Nov 2026. Try another date.")).toBeInTheDocument();
    expect(screen.queryByText("No flights match these filters.")).not.toBeInTheDocument();
  });

  it("a) the date message also covers a reply with no journeys", async () => {
    gateway.search.mockResolvedValue({ ...STAFF, journeys: [] });
    renderAt("/admin/search?tab=flights&from=KHI&to=MUX&date=2026-11-24");
    expect(await screen.findByText("No flights found for KHI to MUX on 24 Nov 2026. Try another date.")).toBeInTheDocument();
  });

  it("a) a provider failure keeps the partial-failure notice instead of the empty message", async () => {
    gateway.search.mockResolvedValue(empty({ notice: "Some results may be missing." }));
    renderAt("/admin/search?tab=flights&from=KHI&to=MUX&date=2026-11-24");
    expect(await screen.findByText("Some results may be missing.")).toBeInTheDocument();
    expect(screen.queryByText(/No flights found/)).not.toBeInTheDocument();
  });

  it("a) a failed provider without a notice still shows the general notice, not the empty message", async () => {
    gateway.search.mockResolvedValue(empty({ providers: [{ name: "southair", status: "failed" }] }));
    renderAt("/admin/search?tab=flights&from=KHI&to=MUX&date=2026-11-24");
    expect(await screen.findByText("Some results may be missing.")).toBeInTheDocument();
    expect(screen.queryByText(/No flights found/)).not.toBeInTheDocument();
  });

  it("b) dates show day first with the year; times in 24-hour form; the fields show the same", async () => {
    gateway.search.mockResolvedValue(STAFF);
    renderAt("/admin/search?tab=flights&from=KHI&to=MUX&date=2026-11-27&trip=roundtrip&return=2026-12-03");
    const results = await screen.findByRole("region", { name: "Results" });
    expect(within(results).getAllByText(/27 Nov 2026 · KHI/).length).toBeGreaterThan(0);
    expect(within(results).getAllByText("23:00").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Departure date")).toHaveValue("27 Nov 2026");
    expect(screen.getByLabelText("Return date")).toHaveValue("3 Dec 2026");
    expect(gateway.search).toHaveBeenCalledWith(expect.objectContaining({ date: "2026-11-27", returnDate: "2026-12-03" }), expect.anything());
  });

  it("b) a typed day-first date is kept as ISO for the request", async () => {
    gateway.search.mockResolvedValue(STAFF);
    renderAt("/admin/search?tab=flights&from=KHI&to=MUX");
    const field = screen.getByLabelText("Departure date");
    fireEvent.change(field, { target: { value: "5/1/2027" } });
    fireEvent.blur(field);
    expect(field).toHaveValue("5 Jan 2027");
    fireEvent.click(screen.getByRole("button", { name: "Search flights" }));
    expect(await screen.findByRole("region", { name: "Results" })).toBeInTheDocument();
    expect(gateway.search).toHaveBeenCalledWith(expect.objectContaining({ date: "2027-01-05" }), expect.anything());
  });

  it("c) a running countdown sits in the status line; once over it says the fares expired, in red text", async () => {
    gateway.search.mockResolvedValue(STAFF);
    const { unmount } = renderAt("/admin/search?tab=flights&from=KHI&to=MUX&date=2026-11-27");
    const timer = await screen.findByRole("timer");
    expect(timer).toHaveTextContent(/\(\d\d:\d\d left\)/);
    expect(timer).not.toHaveTextContent("Needs action");
    unmount();
    gateway.search.mockResolvedValue({ ...STAFF, expires_at: new Date(Date.now() - 1000).toISOString() });
    renderAt("/admin/search?tab=flights&from=KHI&to=MUX&date=2026-11-28");
    const expired = await screen.findByRole("timer");
    expect(expired).toHaveTextContent("Fares expired, search again");
    expect(expired.className).toMatch(/text-status-critical-text/);
  });
});
