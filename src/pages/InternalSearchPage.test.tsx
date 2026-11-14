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
    tickets: [{ id: "t1", sector: "LHE - DMM", departure_date: "2026-11-13", departure_time: "09:45", airline: "Airblue", logo_url: "/v1/logos/abc", selling_price: { amount_minor: 9_975_000, currency: "PKR" }, remaining: 9, baggage: "20 KG" }],
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

  it("shows the four product tabs; Flights opens the live search; Hotels and Umrah say not available yet", () => {
    renderAt("/admin/search");
    expect(within(screen.getByRole("navigation", { name: "Search products" })).getAllByRole("link").map(link => link.textContent))
      .toEqual(["Flights", "Group Ticketing", "Hotels", "Umrah"]);
    expect(screen.getByRole("button", { name: "Search flights" })).toBeDisabled();
    for (const tab of ["hotels", "umrah"]) {
      const { unmount } = renderAt(`/admin/search?tab=${tab}`);
      expect(screen.getAllByRole("status").slice(-1)[0]).toHaveTextContent(/search isn't available yet/);
      unmount();
    }
    // No cards without data: Available providers, Search expiry, Quotes pending.
    expect(screen.queryByText(/Available providers|Search expiry|Quotes pending/)).not.toBeInTheDocument();
  });

  it("Group Ticketing: real results, price shown only after the hold, a Hold seats action per row; no supplier", async () => {
    renderAt("/admin/search?tab=group-ticketing&from=LHE&to=DMM&date=2026-11-13&adults=2");
    const results = await screen.findByRole("region", { name: "Results" });
    await within(results).findByText("Airblue");
    expect(within(results).getAllByRole("columnheader").map(cell => cell.textContent)).toEqual(["Departure", "Airline", "Seats left", "Baggage", "Price per passenger", "Action"]);
    expect(within(results).getByText("13 Nov 2026 09:45")).toBeInTheDocument();
    expect(within(results).getByText("Shown after hold")).toBeInTheDocument();
    expect(results).toHaveTextContent("Group fares have no price in this list. The exact price appears after you hold the seats.");
    expect(within(results).queryByText(/Rs\s/)).not.toBeInTheDocument();
    expect(within(results).getByText("9")).toBeInTheDocument();
    expect(gateway.search).toHaveBeenCalledWith(expect.objectContaining({ from: "LHE", to: "DMM", date: "2026-11-13", adults: 2 }), expect.anything());
    expect(document.body.textContent).not.toMatch(/Book|Quote|Owned|Supplier|Children|Infants|dhillu|skypass/i);
    expect(within(results).getByRole("button", { name: /^Hold seats/ })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /LHE → DMM \(1\)/ })).toBeInTheDocument();
  });

  it("Hold seats opens the traveler details page with the fare, sector and adults from the search", async () => {
    renderAt("/admin/search?tab=group-ticketing&from=LHE&to=DMM&date=2026-11-13&adults=2");
    const results = await screen.findByRole("region", { name: "Results" });
    await within(results).findByText("Airblue");
    fireEvent.click(within(results).getByRole("button", { name: /^Hold seats/ }));
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
