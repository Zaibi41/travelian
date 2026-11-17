import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchList = vi.fn();
vi.mock("@/lib/flight-operations/api", () => ({ fetchGroupDeparturesWithoutFinalPnr: (...args: unknown[]) => fetchList(...args) }));

import { GroupDeparturesPanel } from "./GroupDeparturesPanel";

const renderPanel = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter><GroupDeparturesPanel /></MemoryRouter>
  </QueryClientProvider>,
);

beforeEach(() => fetchList.mockReset());

describe("Group departures without final PNR", () => {
  it("lists the gateway's rows in its order (soonest first), each opening the booking's Tickets tab", async () => {
    fetchList.mockResolvedValue({ window_hours: 48, total: 2, items: [
      { booking_id: "TRV-GRP-000002", departure_at: "2026-11-16T18:30:00+05:00", route: "LHE → JED", airline_name: "Fly Jinnah", flight_number: "9P742", customer_or_agency: "Ali Raza" },
      { booking_id: "TRV-GRP-000001", departure_at: "2026-11-17T22:00:00+05:00", route: "ISB → DMM → ISB", airline_name: "AirSial", flight_number: "PF742" },
    ] });
    renderPanel();
    const section = screen.getByRole("region", { name: "Group departures without final PNR" });
    const rows = (await within(section).findAllByRole("row")).slice(1);
    expect(rows.map(row => within(row).getByRole("link").textContent)).toEqual(["TRV-GRP-000002", "TRV-GRP-000001"]);
    expect(within(rows[0]).getByRole("link")).toHaveAttribute("href", "/admin/bookings/TRV-GRP-000002/tickets");
    expect(rows[0]).toHaveTextContent("LHE → JED");
    expect(rows[0]).toHaveTextContent("Fly Jinnah 9P742");
    expect(section).toHaveTextContent("2 bookings");
    expect(section).toHaveTextContent("departing within 48 hours");
  });

  it("a real zero shows Fine", async () => {
    fetchList.mockResolvedValue({ window_hours: 48, total: 0, items: [] });
    renderPanel();
    expect(await screen.findByText("Fine")).toBeInTheDocument();
    expect(screen.getByText(/No paid group booking departs within 48 hours without a final PNR/)).toBeInTheDocument();
  });
});
