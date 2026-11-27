import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GatewayError } from "@/lib/gateway/client";

const gateway = vi.hoisted(() => ({ search: vi.fn(), reprice: vi.fn() }));
vi.mock("@/lib/admin-search/flights", async importOriginal => ({
  ...(await importOriginal<object>()), searchFlights: gateway.search, repriceFlights: gateway.reprice,
}));

import { FlightsBooking } from "./FlightsBooking";

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const flight = (id: string, fareId: string, price: number) => ({
  id, airline_code: "PA", airline_name: "Airblue", flight_number: `PA-${id}`, departure_local: "2026-11-27T08:00",
  arrival_local: "2026-11-27T10:00", duration_minutes: 120, stops: 0, stop_cities: [],
  fares: [{ id: fareId, name: "Y", selling_price: rs(price) }],
});
const ONE_WAY = {
  search_id: "s1", expires_at: new Date(Date.now() + 600_000).toISOString(), status: "complete",
  journeys: [{ direction: "outbound", origin: "KHI", destination: "MUX", flights: [flight("1", "fare-out", 467)] }],
};
const ROUND = { ...ONE_WAY, journeys: [...ONE_WAY.journeys, { direction: "return", origin: "MUX", destination: "KHI", flights: [flight("2", "fare-ret", 400)] }] };
const requestFlight = (id: string, fareId: string, price: number) => {
  const item = flight(id, fareId, price);
  return { ...item, fares: item.fares.map(fare => ({ ...fare, booking_mode: "request" })) };
};
const MULTI = { ...ONE_WAY, journeys: [
  { direction: "outbound", leg: 1, origin: "KHI", destination: "LHE", flights: [requestFlight("1", "fare-1", 467)] },
  { direction: "outbound", leg: 2, origin: "LHE", destination: "DXB", flights: [requestFlight("2", "fare-2", 600)] },
  { direction: "outbound", leg: 3, origin: "DXB", destination: "KHI", flights: [] },
] };
const QUOTE = {
  quote_id: "q1", expires_at: new Date(Date.now() + 600_000).toISOString(), selling_total: rs(934), new_total: rs(934), old_total: rs(934),
  passengers: [{ type: "ADT", count: 2, selling_each: rs(467) }], price_changed: false, booking_enabled: false,
};

const holdPage = { state: null as unknown, search: "" };
function HoldPageProbe() {
  const location = useLocation();
  holdPage.state = location.state;
  holdPage.search = location.search;
  return <h1>Hold page</h1>;
}

const renderAt = (url: string) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/admin/search" element={<FlightsBooking />} />
          <Route path="/admin/search/flights/hold" element={<HoldPageProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("fare row actions (mockup; #80, #81)", () => {
  beforeEach(() => {
    gateway.search.mockReset().mockResolvedValue(ONE_WAY);
    gateway.reprice.mockReset().mockResolvedValue(QUOTE);
  });

  it("has Book and Share; no Hold, Revalidate, Quote or Fare rules on a fare (#112)", async () => {
    renderAt("/admin/search?tab=flights&from=KHI&to=MUX&date=2026-11-27");
    expect(await screen.findByRole("button", { name: "Book PA-1 Y" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: /^Hold/ })).not.toBeInTheDocument();
    const share = screen.getByRole("link", { name: "Share PA-1 Y on WhatsApp" });
    expect(share).toHaveAttribute("target", "_blank");
    expect(share.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(decodeURIComponent(share.getAttribute("href")!.split("text=")[1])).toContain("Price: Rs 467");
    expect(screen.queryByRole("button", { name: /^(Revalidate|Quote|Fare rules|Select)/ })).not.toBeInTheDocument();
    const card = screen.getByRole("article", { name: /PA-1/ });
    expect(card).not.toHaveTextContent(/Revalidate|Quotes aren't available|Fare rules/);
    expect(card).not.toHaveTextContent("Booking isn't available yet");
    expect(gateway.reprice).not.toHaveBeenCalled();
  });

  it("the Price column shows the gateway's price with no \"per adult\" text", async () => {
    renderAt("/admin/search?tab=flights&from=KHI&to=MUX&date=2026-11-27&adults=2");
    const card = await screen.findByRole("article", { name: /PA-1/ });
    const row = within(card).getAllByRole("row")[1];
    expect(within(row).getByText("Rs 467")).toBeInTheDocument();
    expect(card).not.toHaveTextContent(/per adult/i);
  });

  it("restricted airline (request fare): Request to book stays, no Book (the gateway can't book it); Share works", async () => {
    gateway.search.mockResolvedValue({ ...ONE_WAY, journeys: [{ ...ONE_WAY.journeys[0], flights: [{ ...flight("1", "fare-out", 467), fares: [{ id: "fare-out", name: "Y", selling_price: rs(467), booking_mode: "request" }] }] }] });
    renderAt("/admin/search?tab=flights&from=KHI&to=MUX&date=2026-11-27");
    expect(await screen.findByRole("button", { name: "Request to book PA-1 Y" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Book PA-1 Y" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Share PA-1 Y on WhatsApp" })).toBeInTheDocument();
  });

  it("can't book a fare with no price (Share still opens, without a price)", async () => {
    gateway.search.mockResolvedValue({ ...ONE_WAY, journeys: [{ ...ONE_WAY.journeys[0], flights: [{ ...flight("1", "fare-out", 0), fares: [{ id: "fare-out", name: "Y" }] }] }] });
    renderAt("/admin/search?tab=flights&from=KHI&to=MUX&date=2026-11-27");
    expect(await screen.findByRole("button", { name: "Book PA-1 Y" })).toBeDisabled();
    expect(decodeURIComponent(screen.getByRole("link", { name: "Share PA-1 Y on WhatsApp" }).getAttribute("href")!)).not.toContain("Price:");
  });

  it("round trip: the Selected fare panel asks for the other direction until both are chosen", async () => {
    gateway.search.mockResolvedValue(ROUND);
    renderAt("/admin/search?tab=flights&trip=roundtrip&from=KHI&to=MUX&date=2026-11-27&return=2026-11-30");
    fireEvent.click(await screen.findByRole("button", { name: "Book PA-2 Y" }));  // return first
    expect(gateway.reprice).not.toHaveBeenCalled();
    expect(screen.getByRole("region", { name: "Selected fare" })).toHaveTextContent("Outbound: choose a fare");
  });
});

describe("fare check on Book (mockup flights-fare-check)", () => {
  const url = "/admin/search?tab=flights&from=KHI&to=MUX&date=2026-11-27&adults=2";
  beforeEach(() => {
    gateway.search.mockReset().mockResolvedValue(ONE_WAY);
    gateway.reprice.mockReset().mockResolvedValue(QUOTE);
    holdPage.state = null;
    holdPage.search = "";
  });

  it("price unchanged: opens the booking page straight away, with the gateway's quote and no dialog", async () => {
    renderAt(url);
    fireEvent.click(await screen.findByRole("button", { name: "Book PA-1 Y" }));
    expect(await screen.findByRole("heading", { name: "Hold page" })).toBeInTheDocument();
    expect(gateway.reprice).toHaveBeenCalledWith("s1", ["fare-out"], expect.objectContaining({ signal: expect.anything() }));
    const draft = holdPage.state as { mode: string; quote: unknown; acceptPriceChange: boolean; picks: { fare: { id: string } }[] };
    expect(holdPage.search).toBe("?mode=book");
    expect(draft.quote).toEqual(QUOTE);
    expect(draft.acceptPriceChange).toBe(false);
    expect(draft.picks.map(pick => pick.fare.id)).toEqual(["fare-out"]);
  });

  it("checking shows Cancel; Cancel closes without opening the page", async () => {
    gateway.reprice.mockImplementation(() => new Promise(() => {}));
    renderAt(url);
    fireEvent.click(await screen.findByRole("button", { name: "Book PA-1 Y" }));
    const dialog = await screen.findByRole("dialog", { name: "Checking the latest fare…" });
    expect(dialog).toHaveTextContent("This takes a few seconds. Nothing is booked yet.");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.queryByRole("heading", { name: "Hold page" })).not.toBeInTheDocument();
  });

  it("price changed: shows the gateway's old and new price per adult, the difference and the new total; continues only on click", async () => {
    gateway.reprice.mockResolvedValue({
      ...QUOTE, price_changed: true, old_total: rs(934), new_total: rs(1_020), selling_total: rs(1_020),
      old_price_per_adult: rs(467), new_price_per_adult: rs(510), price_difference_per_adult: rs(43),
      passengers: [{ type: "ADT", count: 2, selling_each: rs(510) }],
    });
    renderAt(url);
    fireEvent.click(await screen.findByRole("button", { name: "Book PA-1 Y" }));
    const dialog = await screen.findByRole("dialog", { name: "The fare price has changed" });
    expect(dialog).toHaveTextContent("Tell the customer before continuing. Nothing has been booked.");
    expect(dialog).toHaveTextContent("Price shown in search (per adult)Rs 467");
    expect(dialog).toHaveTextContent("Price now (per adult)Rs 510Up Rs 43");
    expect(dialog).toHaveTextContent("New total for 2 travelersRs 1,020");
    expect(screen.queryByRole("heading", { name: "Hold page" })).not.toBeInTheDocument();  // never on its own
    fireEvent.click(within(dialog).getByRole("button", { name: "Continue at new price" }));
    expect(await screen.findByRole("heading", { name: "Hold page" })).toBeInTheDocument();
    expect(holdPage.search).toBe("?mode=book");
    expect((holdPage.state as { acceptPriceChange: boolean }).acceptPriceChange).toBe(true);
  });

  it("a lower price shows Down with its amount", async () => {
    gateway.reprice.mockResolvedValue({ ...QUOTE, price_changed: true, old_price_per_adult: rs(467), new_price_per_adult: rs(450), price_difference_per_adult: rs(-17) });
    renderAt(url);
    fireEvent.click(await screen.findByRole("button", { name: "Book PA-1 Y" }));
    expect(await screen.findByRole("dialog", { name: "The fare price has changed" })).toHaveTextContent("Down Rs 17");
  });

  it("Back to results closes the price-changed dialog without opening the page", async () => {
    gateway.reprice.mockResolvedValue({ ...QUOTE, price_changed: true });
    renderAt(url);
    fireEvent.click(await screen.findByRole("button", { name: "Book PA-1 Y" }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Back to results" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.queryByRole("heading", { name: "Hold page" })).not.toBeInTheDocument();
  });

  it.each([
    ["fare_gone", 409, "This fare is no longer available. Search again and choose another fare.", "This fare is no longer available", "Search again"],
    ["search_expired", 404, "This search has expired. Search again.", "This fare is no longer available", "Search again"],
    ["not_confirmed", 502, "The flight supplier couldn't reprice this fare. Try again.", "We couldn't confirm this fare", "Try again"],
    ["no_selling_price", 409, "No selling price is configured for flights. Nothing was booked.", "We couldn't confirm this fare", "Try again"],
    ["adults_only", 422, "Child and infant fares can't be confirmed for this fare yet. Search for adults only.", "Child and infant fares can't be confirmed yet", "Edit search"],
  ])("%s shows its state with the gateway's message", async (code, status, message, title, action) => {
    gateway.reprice.mockRejectedValue(new GatewayError(status === 404 ? "not_found" : "unavailable", message, status, code));
    renderAt(url);
    fireEvent.click(await screen.findByRole("button", { name: "Book PA-1 Y" }));
    const dialog = await screen.findByRole("dialog", { name: title });
    expect(dialog).toHaveTextContent(message);
    expect(within(dialog).getByRole("button", { name: action })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Back to results" })).toBeInTheDocument();
  });

  it("Try again repeats the fare check", async () => {
    gateway.reprice.mockRejectedValueOnce(new GatewayError("unavailable", "The flight supplier couldn't reprice this fare. Try again.", 502, "not_confirmed"));
    renderAt(url);
    fireEvent.click(await screen.findByRole("button", { name: "Book PA-1 Y" }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "Hold page" })).toBeInTheDocument();
    expect(gateway.reprice).toHaveBeenCalledTimes(2);
  });

  it("multi-city: one heading per flight, Request to book waits for a fare on every flight, in order", async () => {
    gateway.search.mockResolvedValue({ ...MULTI, journeys: MULTI.journeys.slice(0, 2) });
    renderAt("/admin/search?tab=flights&trip=multicity&from=KHI&to=LHE&date=2026-11-27&leg=LHE,DXB,2026-11-30");
    expect(await screen.findByRole("heading", { name: "Flight 1 · KHI → LHE" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Flight 2 · LHE → DXB" })).toBeInTheDocument();
    expect(gateway.search).toHaveBeenCalledWith(expect.objectContaining({ trip: "multicity", moreLegs: [{ from: "LHE", to: "DXB", date: "2026-11-30" }] }), expect.anything());
    expect(screen.queryByRole("button", { name: /^Book / })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Request to book PA-2 Y" }));
    expect(gateway.reprice).not.toHaveBeenCalled();
    const panel = screen.getByRole("region", { name: "Selected fare" });
    expect(within(panel).getByText("Flight 1:").parentElement).toHaveTextContent("choose a fare");
    fireEvent.click(screen.getByRole("button", { name: "Request to book PA-1 Y" }));
    await waitFor(() => expect(gateway.reprice).toHaveBeenCalledWith("s1", ["fare-1", "fare-2"], expect.anything()));
    expect(await screen.findByRole("heading", { name: "Hold page" })).toBeInTheDocument();
    expect(holdPage.search).toBe("?mode=request");
  });

  it("multi-city: a flight with no results says so for its own route and date", async () => {
    gateway.search.mockResolvedValue(MULTI);
    renderAt("/admin/search?tab=flights&trip=multicity&from=KHI&to=LHE&date=2026-11-27&leg=LHE,DXB,2026-11-30&leg=DXB,KHI,2026-12-05");
    expect(await screen.findByText("No flights found for DXB to KHI on 5 Dec 2026. Try another date.")).toBeInTheDocument();
  });

  it("round trip: Book waits for a fare in each direction", async () => {
    gateway.search.mockResolvedValue(ROUND);
    renderAt("/admin/search?tab=flights&trip=roundtrip&from=KHI&to=MUX&date=2026-11-27&return=2026-11-30");
    fireEvent.click(await screen.findByRole("button", { name: "Book PA-1 Y" }));
    expect(gateway.reprice).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Book PA-2 Y" }));
    await waitFor(() => expect(gateway.reprice).toHaveBeenCalledWith("s1", ["fare-out", "fare-ret"], expect.anything()));
  });
});
