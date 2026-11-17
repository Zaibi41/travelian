import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The old /content/bookings and /content/booking-requests API is unauthenticated and returns supplier names and
// supplierCost to anyone. Agency and customer roles must never request it: their browsers get no such data.
const role = { current: "agency_owner" };
vi.mock("@/contexts/RoleContext", () => ({
  useRole: () => ({ currentRole: role.current, currentUser: { email: "owner@agency.example", agencyId: "ag-1" } }),
}));

import { FlightBookingsRoute, LegacyRequestsRoute } from "./AdminBookingsRoutes";

const LEAKED = { items: [{ id: "BK-ag-1", type: "flight", provider: "skypass", pricing: { total: 100, supplierCost: 90, currency: "PKR" } }] };

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/admin/requests" element={<LegacyRequestsRoute />} />
        <Route path="/admin/flight-bookings" element={<FlightBookingsRoute />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("agency and customer roles never load the old /content bookings data", () => {
  const fetchSpy = vi.fn(async (_input: RequestInfo | URL) => new Response(JSON.stringify(LEAKED), { status: 200 }));
  beforeEach(() => vi.stubGlobal("fetch", fetchSpy));
  afterEach(() => {
    vi.unstubAllGlobals();
    fetchSpy.mockClear();
  });

  for (const current of ["agency_owner", "agency_staff", "customer"]) {
    for (const [url, title] of [["/admin/requests", "Bookings"], ["/admin/flight-bookings?tab=all", "Flight Operations"],
      ["/admin/flight-bookings?tab=issued", "Invoices"], ["/admin/flight-bookings?tab=refund", "Refunds"]]) {
      it(`${current} at ${url}: placeholder, no /content request, no supplier or cost`, async () => {
        role.current = current;
        renderAt(url);
        expect(await screen.findByRole("heading", { name: title })).toBeInTheDocument();
        expect(fetchSpy.mock.calls.map(([input]) => String(input)).filter(u => u.includes("/content/"))).toEqual([]);
        const text = document.body.textContent ?? "";
        expect(text).not.toMatch(/supplier/i);
        expect(text).not.toMatch(/skypass/i);
      });
    }
  }
});
