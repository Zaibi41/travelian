import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GatewayError } from "@/lib/gateway/client";

const fetchList = vi.fn();
vi.mock("@/lib/flight-operations/api", () => ({ fetchGroupBookingsAwaitingFinalPnr: (...args: unknown[]) => fetchList(...args) }));

import { GroupFinalPnrTracker } from "./GroupFinalPnrTracker";

const renderTracker = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter><GroupFinalPnrTracker /></MemoryRouter>
  </QueryClientProvider>,
);

beforeEach(() => { fetchList.mockReset(); });

describe("Group bookings awaiting final PNR (#13)", () => {
  it("lists every booking in the gateway's order, due ones marked, each opening the Tickets tab", async () => {
    fetchList.mockResolvedValue({ window_hours: 48, total: 3, departs_soon: 1, items: [
      { booking_id: "TRV-GRP-000002", departure_at: "2026-11-23T18:30:00+05:00", departs_soon: true, route: "LHE → JED", airline_name: "Fly Jinnah", flight_number: "9P742", customer_or_agency: "Ali Raza" },
      { booking_id: "TRV-GRP-000010", departure_at: "2026-12-20T03:25:00+05:00", departs_soon: false, route: "LHE → MCT → JED", airline_name: "SalamAir", flight_number: "OV522" },
      { booking_id: "TRV-GRP-000009", departs_soon: false },
    ] });
    renderTracker();
    const section = screen.getByRole("region", { name: "Group bookings awaiting final PNR" });
    const rows = (await within(section).findAllByRole("row")).slice(1);
    expect(rows.map(row => within(row).getByRole("link").textContent)).toEqual(["TRV-GRP-000002", "TRV-GRP-000010", "TRV-GRP-000009"]);
    expect(within(rows[0]).getByRole("link")).toHaveAttribute("href", "/admin/bookings/TRV-GRP-000002/tickets");
    expect(rows[0]).toHaveTextContent("Due now");
    expect(rows[1]).toHaveTextContent("Awaiting");
    expect(rows[1]).toHaveTextContent("SalamAir OV522");
    expect(rows[2]).toHaveTextContent("Not recorded");
    expect(section).toHaveTextContent("3 bookings");
    expect(section).toHaveTextContent("1 due within 48 hours");
  });

  it("a real zero shows Fine", async () => {
    fetchList.mockResolvedValue({ window_hours: 48, total: 0, departs_soon: 0, items: [] });
    renderTracker();
    expect(await screen.findByText("Fine")).toBeInTheDocument();
    expect(screen.getByText("No paid group booking is waiting for its final PNR.")).toBeInTheDocument();
  });

  it("is hidden when the gateway has no such list yet or the role may not see it", { timeout: 15_000 }, async () => {
    for (const kind of ["not_found", "forbidden"] as const) {
      fetchList.mockImplementation(async () => { throw new GatewayError(kind, "No.", kind === "forbidden" ? 403 : 404); });
      const { container, unmount } = renderTracker();
      await vi.waitFor(() => expect(fetchList).toHaveBeenCalled());
      await vi.waitFor(() => expect(container).toBeEmptyDOMElement(), { timeout: 4000 }); // after its one retry
      unmount();
      fetchList.mockReset();
    }
  });

  it("shows any other error in place", { timeout: 10_000 }, async () => {
    fetchList.mockRejectedValue(new GatewayError("unavailable", "Booking data is not available.", 503));
    renderTracker();
    expect(await screen.findByRole("alert", {}, { timeout: 4000 })).toHaveTextContent("Booking data is not available.");
  });
});
