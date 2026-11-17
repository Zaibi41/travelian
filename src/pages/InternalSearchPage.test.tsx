import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const role = { current: "staff" };
vi.mock("@/contexts/RoleContext", () => ({ useRole: () => ({ currentRole: role.current }) }));
vi.mock("@/contexts/AdminStore", () => ({ useAdmin: () => ({ hotels: [], packages: [], loadHotelContent: () => undefined }) }));
vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ t: (key: string) => key, formatPrice: (n: number) => String(n) }) }));
vi.mock("@/components/public/SearchTabs", () => ({ SearchTabs: () => <p>Old public search widget</p> }));
vi.mock("@/components/AdminHotelSearchPanel", () => ({ AdminHotelSearchPanel: () => null }));

const gateway = vi.hoisted(() => ({ inventory: vi.fn(), search: vi.fn() }));
vi.mock("@/lib/admin-search/group-ticketing", async importOriginal => ({
  ...(await importOriginal<object>()),
  fetchGroupInventory: gateway.inventory,
  searchGroupFares: gateway.search,
}));

import AdminSearchPage from "./AdminSearchPage";

// What the gateway sends staff (D23): selling price and a gateway logo path, nothing else.
const INVENTORY = {
  data: [{
    id: "g1", sector: "LAHORE - DAMMAM", airline: "Airblue", logo_url: "/v1/logos/abc",
    tickets: [
      { id: "t1", sector: "LHE - DMM", departure_date: "2026-11-13", departure_time: "09:45", airline: "Airblue", logo_url: "/v1/logos/abc", flight_number: "PA470",
        selling_price: { amount_minor: 9_975_000, currency: "PKR" }, remaining: 9, baggage: "20", hand_carry: "7", meal: "Yes", stock: "supplier", can_hold: true },
      { id: "t2", sector: "LHE - DMM", departure_date: "2026-11-13", departure_time: "21:10", airline: "Serene Air", remaining: 4, baggage: "0", hand_carry: "7", stock: "supplier",
        can_hold: false, hold_unavailable_reason: "Holding isn't available for this provider" },
    ],
  }],
};

/** Where the page navigated to (path and query). */
const location = { current: undefined as string | undefined };
function LocationProbe() {
  const here = useLocation();
  location.current = `${here.pathname}${here.search}`;
  return null;
}

const renderAt = (url: string) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[url]}><AdminSearchPage /><LocationProbe /></MemoryRouter>
    </QueryClientProvider>,
  );

describe("Search (internal roles)", () => {
  beforeEach(() => {
    role.current = "staff";
    gateway.inventory.mockResolvedValue(INVENTORY);
    gateway.search.mockResolvedValue(INVENTORY);
  });

  it("shows three product tabs (Umrah is hidden); Flights opens the live search; Hotels opens the hotel search", () => {
    renderAt("/admin/search");
    expect(within(screen.getByRole("navigation", { name: "Search products" })).getAllByRole("link").map(link => link.textContent))
      .toEqual(["Flights", "Group Ticketing", "Hotels"]);
    expect(screen.getByRole("button", { name: "Search flights" })).toBeDisabled();
    const hotels = renderAt("/admin/search?tab=hotels");
    expect(screen.getByRole("button", { name: "Search hotels" })).toBeInTheDocument();
    hotels.unmount();
    // An old Umrah link opens Flights; nothing about Umrah shows.
    const umrah = renderAt("/admin/search?tab=umrah");
    expect(screen.queryByText(/Umrah/)).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Search flights" }).length).toBeGreaterThan(0);
    umrah.unmount();
    // No cards without data: Available providers, Search expiry, Quotes pending.
    expect(screen.queryByText(/Available providers|Search expiry|Quotes pending/)).not.toBeInTheDocument();
  });

  it("Group Ticketing: listing price in Rs, logo, flight number, meal, the baggage rule; Hold seats off with a reason where the provider can't hold; no supplier", async () => {
    renderAt("/admin/search?tab=group-ticketing&from=LHE&to=DMM&date=2026-11-13&adults=2");
    const results = await screen.findByRole("region", { name: "Results" });
    await within(results).findByText("Airblue");
    expect(within(results).getAllByRole("columnheader").map(cell => cell.textContent)).toEqual(["Departure", "Airline", "Seats left", "Baggage", "Meal", "Refund", "Price per passenger", "Action"]);
    // Group fares are non-refundable and non-changeable: a notice above the results and "Non-refundable" on every row.
    expect(within(results).getByText("Group fares are non-refundable and non-changeable. Names and dates cannot be altered after booking.")).toBeInTheDocument();
    for (const row of within(results).getAllByRole("row").slice(1)) expect(row).toHaveTextContent("Non-refundable");
    const [first, second] = within(results).getAllByRole("row").slice(1);
    expect(first).toHaveTextContent("13 Nov 2026 09:45");
    expect(first).toHaveTextContent("PA470");
    expect(first).toHaveTextContent("7+20 kg");
    expect(first).toHaveTextContent("Meal");
    expect(first).toHaveTextContent("Rs 99,750");
    expect(within(first).getByRole("button", { name: /^Hold seats/ })).toBeEnabled();
    expect(second).toHaveTextContent("7 kg");
    expect(second).not.toHaveTextContent("0+7");
    expect(second).toHaveTextContent("Meal info not available");
    expect(second).toHaveTextContent("Price not available");
    expect(within(second).getByRole("button", { name: /^Hold seats/ })).toBeDisabled();
    expect(within(second).getByRole("button", { name: /^Hold seats/ })).toHaveAccessibleDescription("Holding isn't available for this provider");
    expect(gateway.search).toHaveBeenCalledWith(expect.objectContaining({ from: "LHE", to: "DMM", date: "2026-11-13", adults: 2 }), expect.anything());
    expect(document.body.textContent).not.toMatch(/Quote|Owned|Supplier|Children|Infants|dhillu|skypass/i);
    expect(screen.queryByRole("button", { name: /^(Book|Quote)/ })).not.toBeInTheDocument();   // (the fare notice says "after booking")
    expect(await screen.findByRole("button", { name: /LHE → DMM \(2\)/ })).toBeInTheDocument();
  });

  it("Hold seats opens the traveler details page with the fare, sector and adults from the search", async () => {
    renderAt("/admin/search?tab=group-ticketing&from=LHE&to=DMM&date=2026-11-13&adults=2");
    const results = await screen.findByRole("region", { name: "Results" });
    await within(results).findByText("Airblue");
    fireEvent.click(within(results).getAllByRole("button", { name: /^Hold seats/ })[0]);
    expect(location.current).toBeDefined();
    const url = new URL(location.current!, "http://x");
    expect(url.pathname).toBe("/admin/search/group-ticketing/hold");
    expect(Object.fromEntries(url.searchParams)).toEqual({ ticket: "t1", from: "LHE", to: "DMM", date: "2026-11-13", adults: "2" });
  });

  it("asks for a complete search before calling the gateway", () => {
    renderAt("/admin/search?tab=group-ticketing");
    expect(screen.getByRole("button", { name: "Search group fares" })).toBeDisabled();
    expect(gateway.search).not.toHaveBeenCalled();
  });

  it("agency roles keep the existing search", () => {
    role.current = "agency_owner";
    renderAt("/admin/search?tab=flights");
    expect(screen.getByText("Old public search widget")).toBeInTheDocument();
  });
});
