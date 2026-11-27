import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  EMPTY_HOTEL_SEARCH, NO_AGE, cancellationText, guestsLabel, hotelMoney, hotelRows, parseHotelSearch, roomsRequest, stayProblem,
  writeHotelSearch, type HotelSearchView,
} from "@/lib/admin-search/hotels";

const gateway = vi.hoisted(() => ({ search: vi.fn(), suggest: vi.fn() }));
vi.mock("@/lib/admin-search/hotels", async importOriginal => ({
  ...(await importOriginal<object>()),
  searchHotels: gateway.search,
  suggestDestinations: gateway.suggest,
}));

import { HotelsSearch } from "./HotelsSearch";

const rate = (id: string, total: number, cancellation: "free_until" | "non_refundable" | "charges_apply", extra = {}) => ({
  id, room_type: "Standard Double room", board: "Room only", nights: 2, cancellation,
  total: { amount_minor: total, currency: "USD" }, per_night: { amount_minor: total / 2, currency: "USD" },
  ...(cancellation === "free_until" ? { free_cancellation_until: "2026-12-16T00:00:00" } : {}), ...extra,
});

// What the gateway sends staff without supplier names (D23): no source, no providers, no supplier cost.
const STAFF_VIEW: HotelSearchView = {
  search_id: "s1", expires_at: "2099-01-01T10:15:00Z", status: "complete", destination: "Dubai",
  hotels: [
    { id: "h1", name: "Samaya Hotel", star_rating: 1, city: "Dubai", rates: [rate("r1", 3200, "non_refundable")] },
    { id: "h2", name: "LUX - Opulent Island Suite Burj Khalifa View With A Very Long Name That Must Not Break The Table", city: "Dubai",
      rates: [rate("r2", 9600, "free_until"), rate("r3", 12000, "free_until", { board: "Breakfast" })] },
    { id: "h3", name: "Grand Four", star_rating: 4, city: "Dubai", rates: [rate("r4", 60000, "charges_apply")] },
  ],
};

const location = { current: "" };
function LocationProbe() {
  const here = useLocation();
  location.current = here.search;
  return null;
}

const renderAt = (url: string) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[url]}><HotelsSearch /><LocationProbe /></MemoryRouter>
    </QueryClientProvider>,
  );

const SEARCH_URL = "/admin/bookings/new?tab=hotels&dest=Dubai&dk=region&did=6053839&in=2099-01-10&out=2099-01-12";

describe("hotel search state", () => {
  it("round-trips through the URL and drops invalid values", () => {
    const search = { ...EMPTY_HOTEL_SEARCH, destination: "Dubai", destinationKind: "region" as const, destinationId: 7,
      checkIn: "2099-01-10", checkOut: "2099-01-12", rooms: 2, adults: 3, childAges: [4], stars: "4" as const, cancellation: "free" as const };
    const params = writeHotelSearch(new URLSearchParams("tab=hotels"), search);
    expect(params.get("tab")).toBe("hotels");
    expect(parseHotelSearch(params)).toEqual(search);
    expect(parseHotelSearch(new URLSearchParams("rooms=99&adults=0&ages=4,40&dk=x&did=1&stars=9&in=tomorrow"))).toEqual(
      { ...EMPTY_HOTEL_SEARCH, childAges: [4] });
  });

  it("spreads adults over rooms, children with the first room", () => {
    expect(roomsRequest({ ...EMPTY_HOTEL_SEARCH, rooms: 2, adults: 3, childAges: [5] })).toEqual([
      { adults: 2, children_ages: [5] }, { adults: 1, children_ages: [] },
    ]);
    expect(guestsLabel({ rooms: 2, adults: 3, childAges: [5] })).toBe("4 guests, 2 rooms");
  });

  it("explains what is missing before searching", () => {
    const base = { ...EMPTY_HOTEL_SEARCH, destination: "Dubai", checkIn: "2099-01-10", checkOut: "2099-01-12" };
    expect(stayProblem(base)).toBeNull();
    expect(stayProblem({ ...base, destination: "D" })).toBe("Enter a destination.");
    expect(stayProblem({ ...base, checkOut: "2099-01-10" })).toBe("Check-out must be after check-in.");
    expect(stayProblem({ ...base, checkOut: "2099-02-20" })).toBe("A stay can be at most 30 nights.");
    expect(stayProblem({ ...base, childAges: [NO_AGE] })).toBe("Choose each child's age in Guests and rooms.");
  });

  it("filters keep each hotel's cheapest matching rate", () => {
    const free = hotelRows(STAFF_VIEW.hotels, { ...EMPTY_HOTEL_SEARCH, cancellation: "free" });
    expect(free.map(row => row.rate.id)).toEqual(["r2"]);
    expect(hotelRows(STAFF_VIEW.hotels, { ...EMPTY_HOTEL_SEARCH, stars: "4" }).map(row => row.hotel.id)).toEqual(["h3"]);
    expect(hotelRows(STAFF_VIEW.hotels, { ...EMPTY_HOTEL_SEARCH, price: "over_500" }).map(row => row.hotel.id)).toEqual([]);
    expect(hotelRows(STAFF_VIEW.hotels, { ...EMPTY_HOTEL_SEARCH, price: "250_500" }).map(row => row.hotel.id)).toEqual(["h3"]);
  });

  it("formats money and cancellation", () => {
    expect(hotelMoney({ amount_minor: 9600, currency: "USD" })).toBe("USD 96.00");
    expect(hotelMoney({ amount_minor: 1_250_000, currency: "PKR" })).toBe("Rs 12,500");
    expect(cancellationText(rate("x", 1, "free_until") as never)).toBe("Free cancellation until 16 Dec 2026, 00:00 UTC");
    expect(cancellationText(rate("x", 1, "non_refundable") as never)).toBe("Non-refundable");
    expect(cancellationText(rate("x", 1, "charges_apply") as never)).toBe("Cancellation charges apply");
  });
});

describe("Search > Hotels", () => {
  beforeEach(() => {
    gateway.search.mockReset().mockResolvedValue(STAFF_VIEW);
    gateway.suggest.mockReset().mockResolvedValue({ destinations: [] });
  });

  it("has the mockup's fields and no cards, actions or source without the data", async () => {
    renderAt(SEARCH_URL);
    for (const label of ["Destination", "Check-in", "Check-out", "Guests and rooms", "Star rating", "Price", "Cancellation terms"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByRole("button").map(button => button.textContent)).toEqual(expect.arrayContaining(["Makkah", "Al Madinah", "Dubai", "Istanbul"]));
    const results = await screen.findByRole("region", { name: "Results" });
    await within(results).findByText("Samaya Hotel");
    expect(within(results).getAllByRole("columnheader").map(cell => cell.textContent))
      .toEqual(["Hotel", "Room type", "Board", "Rate", "Cancellation", "Rate valid until"]);
    expect(within(results).queryByText(/Providers connected/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^(Book|Hold|Quote)$/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Available providers|Search expiry|Quotes pending/)).not.toBeInTheDocument();
    expect(within(results).getByText("USD 32.00")).toBeInTheDocument();
    expect(within(results).getByText("1 star · Dubai")).toBeInTheDocument();
    expect(gateway.search).toHaveBeenCalledWith(expect.objectContaining({ destination: "Dubai", destinationId: 6053839 }), expect.anything());
  });

  it("shows Source and providers when the gateway sends them (admins)", async () => {
    gateway.search.mockResolvedValue({
      ...STAFF_VIEW, providers: [{ name: "RateHawk", status: "responded" }],
      hotels: STAFF_VIEW.hotels.map(hotel => ({ ...hotel, source: "RateHawk" })),
    });
    renderAt(SEARCH_URL);
    const results = await screen.findByRole("region", { name: "Results" });
    await within(results).findByText("Samaya Hotel");
    expect(within(results).getAllByRole("columnheader").map(cell => cell.textContent)).toContain("Source");
    expect(within(results).getByText(/Providers connected 1 \(admin only\)/)).toBeInTheDocument();
  });

  it("a filter narrows the list without searching again and is kept in the URL", async () => {
    renderAt(`${SEARCH_URL}&cancel=free`);
    const results = await screen.findByRole("region", { name: "Results" });
    await within(results).findByText(/1 of 3 hotels in Dubai/);
    expect(within(results).queryByText("Samaya Hotel")).not.toBeInTheDocument();
    expect(gateway.search).toHaveBeenCalledTimes(1);
  });

  it("a popular destination fills Destination; searching writes the search to the URL", () => {
    renderAt("/admin/bookings/new?tab=hotels&in=2099-01-10&out=2099-01-12");
    fireEvent.click(screen.getByRole("button", { name: "Dubai" }));
    expect(screen.getByRole("combobox", { name: "Destination" })).toHaveValue("Dubai");
    fireEvent.click(screen.getByRole("button", { name: "Search hotels" }));
    expect(new URLSearchParams(location.current).get("dest")).toBe("Dubai");
  });

  it("says what is missing instead of searching", () => {
    renderAt("/admin/bookings/new?tab=hotels");
    fireEvent.click(screen.getByRole("button", { name: "Search hotels" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a destination.");
    expect(gateway.search).not.toHaveBeenCalled();
  });

  it("no hotels and supplier failure have their own messages", async () => {
    gateway.search.mockResolvedValue({ ...STAFF_VIEW, hotels: [] });
    const empty = renderAt(SEARCH_URL);
    expect(await screen.findByText(/No hotels found in Dubai for these dates/)).toBeInTheDocument();
    empty.unmount();
    gateway.search.mockResolvedValue({ ...STAFF_VIEW, status: "unavailable", hotels: [] });
    renderAt(SEARCH_URL);
    expect(await screen.findByText(/Hotel search isn't available right now/)).toBeInTheDocument();
  });
});
