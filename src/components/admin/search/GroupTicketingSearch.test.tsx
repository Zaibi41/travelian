import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Search > Group Ticketing results: the Source line under each row only when the gateway sent
// group_source (supplier access). Gateway calls mocked with made-up values.
const gateway = vi.hoisted(() => ({ inventory: vi.fn(), search: vi.fn() }));
vi.mock("@/lib/admin-search/group-ticketing", async importOriginal => ({
  ...(await importOriginal<object>()), fetchGroupInventory: gateway.inventory, searchGroupFares: gateway.search,
}));

import { GroupTicketingSearch } from "./GroupTicketingSearch";

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const SOURCE = { provider: "dhillu_sahi", provider_name: "Dhillu & Sahi", supplier_pnr: "41SDS4", supplier_group_id: "3056", supplier_ticket_id: "10817" };
const ticket = (overrides: Record<string, unknown> = {}) => ({
  id: "t1", sector: "LHE - DMM", departure_date: "2026-11-20", departure_time: "21:10", airline: "Fly Jinnah With A Very Long Airline Name", remaining: 4,
  baggage: "20", hand_carry: "7", meal: "Yes", selling_price: { amount_minor: 8_000_000, currency: "PKR" }, stock: "supplier", can_hold: true, ...overrides,
});
const view = (overrides: Record<string, unknown> = {}) => ({ data: [{ id: "g1", sector: "LHE - DMM", tickets: [ticket(overrides)] }] });

const renderAt = (query = "from=LHE&to=DMM&date=2026-11-20&adults=1") =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[`/admin/search?tab=group-ticketing&${query}`]}><GroupTicketingSearch /></MemoryRouter>
    </QueryClientProvider>,
  );

describe("Group Ticketing results: Source line", () => {
  beforeEach(() => {
    gateway.inventory.mockReset().mockResolvedValue({ data: [] });
    gateway.search.mockReset();
  });

  it("supplier access: 'Source: Dhillu & Sahi · PNR 41SDS4 · Group 3056' under the row", async () => {
    gateway.search.mockResolvedValue(view({ group_source: SOURCE }));
    renderAt();
    const results = await screen.findByRole("region", { name: "Results" });
    const line = await within(results).findByText("Source: Dhillu & Sahi · PNR 41SDS4 · Group 3056");
    expect(line).toHaveClass("truncate");
    expect(line.closest("td")).toHaveAttribute("colspan", "8");
  });

  it("no supplier access (group_source not sent): no Source line and no supplier name", async () => {
    gateway.search.mockResolvedValue(view());
    renderAt();
    const results = await screen.findByRole("region", { name: "Results" });
    await within(results).findByRole("button", { name: /Hold seats/ });
    expect(results).not.toHaveTextContent(/Source|Dhillu|41SDS4|3056/);
  });
});


describe("Group Ticketing search with any one field, and return tickets", () => {
  beforeEach(() => {
    gateway.inventory.mockReset().mockResolvedValue({ data: [] });
    gateway.search.mockReset().mockResolvedValue(view());
  });

  it.each([["from=LHE", { from: "LHE" }], ["to=DMM", { to: "DMM" }], ["date=2026-11-20", { date: "2026-11-20" }],
    ["from=LHE&to=DMM&date=2026-11-20", { from: "LHE", to: "DMM", date: "2026-11-20" }]])("searches with %s", async (query, sent) => {
    renderAt(query);
    await screen.findByRole("region", { name: "Results" });
    expect(gateway.search).toHaveBeenCalledWith(expect.objectContaining(sent), expect.anything());
  });

  it("with nothing filled there is no search and the button is off", () => {
    renderAt("adults=1");
    expect(gateway.search).not.toHaveBeenCalled();
    expect(screen.queryByRole("region", { name: "Results" })).not.toBeInTheDocument();
  });

  it("a return ticket shows both flights: outbound, then return, with times, airports and flight numbers", async () => {
    gateway.search.mockResolvedValue(view({ sector: "ISB - JED", departure_time: "06:40", flight_number: "9P700", legs: [
      { direction: "outbound", flight_number: "9P700", origin: "ISB", destination: "JED", departure_date: "2026-11-20", departure_time: "06:40", arrival_time: "10:05", baggage: "20", hand_carry: "10" },
      { direction: "return", flight_number: "9P701", origin: "JED", destination: "ISB", departure_date: "2026-12-21", departure_time: "11:05", arrival_time: "18:05", baggage: "30", hand_carry: "10" },
    ] }));
    renderAt("to=JED");
    const results = await screen.findByRole("region", { name: "Results" });
    const row = within(results).getAllByRole("row")[1];
    expect(row).toHaveTextContent("20 Nov 2026 06:40–10:05");
    expect(row).toHaveTextContent("ISB - JED · 9P700");
    expect(row).toHaveTextContent("Return 21 Dec 2026 11:05–18:05");
    expect(row).toHaveTextContent("JED - ISB · 9P701");
    expect(row).toHaveTextContent("Return 10+30 kg");
    expect(within(row).getByRole("button", { name: /Hold seats/ })).toBeEnabled();
  });
});

describe("Group Ticketing results: airline logo", () => {
  beforeEach(() => {
    gateway.inventory.mockReset().mockResolvedValue({ data: [] });
    gateway.search.mockReset();
  });

  it("uses Travelian's own logo file before the gateway's logo", async () => {
    gateway.search.mockResolvedValue(view({ airline: "South Air", flight_number: "Z8266", logo_url: "/v1/logos/z8" }));
    renderAt();
    const results = await screen.findByRole("region", { name: "Results" });
    expect(await within(results).findByRole("img", { name: "South Air logo" })).toHaveAttribute("src", "/airline-logos/south-air.png");
  });

  it("an airline with no logo file and no gateway logo shows its IATA code, not an empty box", async () => {
    gateway.search.mockResolvedValue(view({ airline: "Unknown Air", flight_number: "QQ 1200" }));
    renderAt();
    const results = await screen.findByRole("region", { name: "Results" });
    expect(await within(results).findByRole("img", { name: "Unknown Air logo" })).toHaveTextContent(/^QQ$/);
  });
});
