import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
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
const QUOTE = {
  quote_id: "q1", expires_at: new Date(Date.now() + 600_000).toISOString(), selling_total: rs(934),
  passengers: [{ type: "ADT", count: 2, selling_each: rs(467) }], price_changed: false, booking_enabled: false,
};

const renderAt = (url: string) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[url]}><FlightsBooking /></MemoryRouter>
    </QueryClientProvider>,
  );

describe("fare selection and reprice", () => {
  beforeEach(() => {
    gateway.search.mockReset().mockResolvedValue(ONE_WAY);
    gateway.reprice.mockReset().mockResolvedValue(QUOTE);
  });

  it("revalidates the selected fare and shows the total to confirm", async () => {
    renderAt("/admin/search?tab=flights&from=KHI&to=MUX&date=2026-11-27&adults=2");
    fireEvent.click(await screen.findByRole("button", { name: "Revalidate PA-1 Y" }));
    const panel = screen.getByRole("region", { name: "Selected fare" });
    await waitFor(() => expect(gateway.reprice).toHaveBeenCalledWith("s1", ["fare-out"]));
    expect(await within(panel).findAllByText("Rs 934")).toHaveLength(2);  // adults line and total
    expect(within(panel).getByText("2 Adults × Rs 467")).toBeInTheDocument();
    expect(within(panel).getByText("Total to confirm")).toBeInTheDocument();
    expect(within(panel).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("flags a price change and shows the gateway's reason when it refuses", async () => {
    gateway.reprice.mockResolvedValueOnce({ ...QUOTE, price_changed: true });
    const { unmount } = renderAt("/admin/search?tab=flights&from=KHI&to=MUX&date=2026-11-27");
    fireEvent.click(await screen.findByRole("button", { name: "Revalidate PA-1 Y" }));
    expect(await screen.findByText(/The price changed since the search/)).toBeInTheDocument();
    unmount();
    gateway.reprice.mockRejectedValueOnce(new GatewayError("unavailable", "This fare is no longer available. Search again and choose another fare."));
    renderAt("/admin/search?tab=flights&from=KHI&to=MUX&date=2026-11-27");
    fireEvent.click(await screen.findByRole("button", { name: "Revalidate PA-1 Y" }));
    expect(await screen.findByText("This fare is no longer available. Search again and choose another fare.")).toBeInTheDocument();
  });

  it("round trip needs an outbound and a return fare, sent in that order", async () => {
    gateway.search.mockResolvedValue(ROUND);
    renderAt("/admin/search?tab=flights&trip=roundtrip&from=KHI&to=MUX&date=2026-11-27&return=2026-11-30");
    fireEvent.click(await screen.findByRole("button", { name: "Revalidate PA-2 Y" }));  // return first
    expect(gateway.reprice).not.toHaveBeenCalled();
    expect(screen.getByRole("region", { name: "Selected fare" })).toHaveTextContent("Outbound: choose a fare");
    fireEvent.click(screen.getByRole("button", { name: "Revalidate PA-1 Y" }));
    await waitFor(() => expect(gateway.reprice).toHaveBeenCalledWith("s1", ["fare-out", "fare-ret"]));
  });
});

describe("fare row actions (mockup)", () => {
  beforeEach(() => {
    gateway.search.mockReset().mockResolvedValue(ONE_WAY);
    gateway.reprice.mockReset().mockResolvedValue(QUOTE);
  });

  it("shows Book, Hold, Quote and Fare rules disabled with the reason; Revalidate works", async () => {
    renderAt("/admin/search?tab=flights&from=KHI&to=MUX&date=2026-11-27");
    for (const [name, reason] of [["Book", "Booking isn't available yet"], ["Hold", "Booking isn't available yet"], ["Quote", "Quotes aren't available yet"], ["Fare rules", "Not available yet"]]) {
      const control = await screen.findByRole("button", { name: `${name} PA-1 Y` });
      expect(control).toBeDisabled();
      expect(control).toHaveAccessibleDescription(reason);
    }
    expect(screen.queryByRole("button", { name: /^Select/ })).not.toBeInTheDocument();
    // The reasons are visible text on the card, not only tooltips.
    const card = screen.getByRole("article", { name: /PA-1/ });
    expect(card).toHaveTextContent("Book and Hold: Booking isn't available yet · Quote: Quotes aren't available yet · Fare rules: Not available yet");
    const revalidate = screen.getByRole("button", { name: "Revalidate PA-1 Y" });
    expect(revalidate).toBeEnabled();
    fireEvent.click(revalidate);
    await waitFor(() => expect(gateway.reprice).toHaveBeenCalledWith("s1", ["fare-out"]));
    expect(revalidate).toHaveAttribute("aria-pressed", "true");
  });

  it("can't revalidate a fare with no price", async () => {
    gateway.search.mockResolvedValue({ ...ONE_WAY, journeys: [{ ...ONE_WAY.journeys[0], flights: [{ ...flight("1", "fare-out", 0), fares: [{ id: "fare-out", name: "Y" }] }] }] });
    renderAt("/admin/search?tab=flights&from=KHI&to=MUX&date=2026-11-27");
    expect(await screen.findByRole("button", { name: "Revalidate PA-1 Y" })).toBeDisabled();
  });
});
