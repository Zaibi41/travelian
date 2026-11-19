import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { HelmetProvider } from "react-helmet-async";
import { LocaleProvider } from "@/contexts/LocaleContext";

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const flight = {
  flightId: "sooperfare-abc123",
  provider: "sooperfare",
  airline: "Airblue",
  airlineImage: "https://cdn.sooperfare.com/logos/pa.png",
  flightNumber: "PA-200",
  origin: "KHI",
  destination: "LHE",
  departureTime: "10:00",
  arrivalTime: "11:45",
  price: 36200,
  currency: "PKR",
  status: "scheduled",
  class: "economy",
  stops: 0,
};

let resolveSearch: (value: unknown) => void = () => undefined;
let pending: Promise<unknown> = Promise.resolve();
const newSearch = () => { pending = new Promise((resolve) => { resolveSearch = resolve; }); };
vi.mock("@/lib/travelian-api", () => ({
  searchFlights: vi.fn(() => pending),
  fetchFlightFares: vi.fn(async () => []),
  hydrateSooperFareOptions: vi.fn(async () => []),
}));
vi.mock("@/lib/group-ticketing", () => ({ fetchGroupTickets: vi.fn(async () => []), filterGroupTickets: () => [] }));

import PublicFlightsPage from "./PublicFlightsPage";

function renderAdmin() {
  return render(
    <HelmetProvider><LocaleProvider>
      <MemoryRouter initialEntries={["/admin/flights-search?from=KHI&to=LHE&depart=2030-11-20&adults=1"]}>
        <PublicFlightsPage bookingPath="/admin/booking" adminMode />
      </MemoryRouter>
    </LocaleProvider></HelmetProvider>,
  );
}

describe("admin legacy flight results", () => {
  // The airport fields lazy-load the large airports dataset on first render (AirportCombobox). Loaded here, once, so the
  // first test's 4 s wait measures the page, not ~3.5 s of loading that dataset (it overran under a full parallel run).
  beforeAll(async () => { await import("@/data/airports"); }, 30_000);
  beforeEach(() => { vi.clearAllMocks(); newSearch(); });

  it("has no 0–700 price range before results, then starts from the results", async () => {
    renderAdmin();
    expect(screen.queryByLabelText("Maximum price")).not.toBeInTheDocument();
    resolveSearch({ flights: [flight] });
    const max = await screen.findByLabelText("Maximum price", undefined, { timeout: 4000 });
    expect(max).toHaveValue("37000");
    expect(screen.getByLabelText("Minimum price")).toHaveValue("0");
  });

  it("links to checkout without a price, supplier ID or supplier logo", async () => {
    renderAdmin();
    resolveSearch({ flights: [flight] });
    await screen.findByLabelText("Maximum price", undefined, { timeout: 4000 });
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="/admin/booking"]'));
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      const query = new URL(link.href, "http://x").searchParams;
      for (const key of ["price", "baseFare", "taxes", "currency", "flightId", "airlineImage"]) expect(query.has(key)).toBe(false);
    }
    expect(document.body.innerHTML).not.toMatch(/sooperfare/i);
    within(document.body).getAllByText(/Airblue/);
  });
});
