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

const renderAt = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={["/admin/search?tab=group-ticketing&from=LHE&to=DMM&date=2026-11-20&adults=1"]}><GroupTicketingSearch /></MemoryRouter>
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
    expect(line.closest("td")).toHaveAttribute("colspan", "7");
  });

  it("no supplier access (group_source not sent): no Source line and no supplier name", async () => {
    gateway.search.mockResolvedValue(view());
    renderAt();
    const results = await screen.findByRole("region", { name: "Results" });
    await within(results).findByRole("button", { name: /Hold seats/ });
    expect(results).not.toHaveTextContent(/Source|Dhillu|41SDS4|3056/);
  });
});
