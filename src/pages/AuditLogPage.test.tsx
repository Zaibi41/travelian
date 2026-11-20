import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GatewayError } from "@/lib/gateway/client";
import { dateRange } from "@/lib/finance/date-range";

// Users & Access > Audit Log (finance actions, travelian#91). Gateway mocked; made-up data.
const api = vi.hoisted(() => ({ fetchAuditLog: vi.fn() }));
vi.mock("@/lib/finance/api", async (original) => ({ ...(await original<object>()), ...api }));

import AuditLogPage from "./AuditLogPage";
import { describeChange } from "@/lib/finance/api";

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const ENTRY = {
  id: 7, at: "2026-11-20T10:00:00Z", actor_user_id: "u-1", actor_role: "super_admin", action: "refund_paid", entity_type: "refund",
  entity_id: "r-1", booking_reference: "TRV-AB12CD", before: { status: "approved" }, after: { status: "paid", payout_reference: "IBFT-9" },
  reason: null,
};

function renderPage(url = "/admin/audit-log") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[url]}><AuditLogPage /></MemoryRouter></QueryClientProvider>);
}

beforeEach(() => { vi.clearAllMocks(); api.fetchAuditLog.mockResolvedValue({ entries: [ENTRY], total: 1 }); });

describe("AuditLogPage", () => {
  it("loads all dates by default and shows who, what and the change", async () => {
    renderPage();
    expect(await screen.findAllByText("Refund marked paid")).not.toHaveLength(0);
    expect(api.fetchAuditLog.mock.calls[0][0]).toEqual({ action: undefined, booking_reference: undefined, limit: 50, offset: 0 });
    expect(screen.getAllByText("status: approved → paid").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "TRV-AB12CD" })[0]).toHaveAttribute("href", "/admin/bookings/TRV-AB12CD");
  });

  it("sends the booking search and filters from the URL", async () => {
    renderPage("/admin/audit-log?date=today&action=refund_paid&booking=TRV-AB12CD");
    await waitFor(() => expect(api.fetchAuditLog).toHaveBeenCalled());
    expect(api.fetchAuditLog.mock.calls[0][0]).toMatchObject({ action: "refund_paid", booking_reference: "TRV-AB12CD", ...dateRange("today") });
    fireEvent.change(screen.getByLabelText("Booking reference"), { target: { value: "TRV-ZZ" } });
    fireEvent.submit(screen.getByRole("search"));
    await waitFor(() => expect(api.fetchAuditLog.mock.calls.at(-1)?.[0]).toMatchObject({ booking_reference: "TRV-ZZ" }));
  });

  it("empty, error and no-permission states", async () => {
    api.fetchAuditLog.mockResolvedValueOnce({ entries: [], total: 0 });
    const { unmount } = renderPage();
    expect(await screen.findByText("No finance actions yet.")).toBeInTheDocument();
    unmount();
    api.fetchAuditLog.mockRejectedValueOnce(new GatewayError("forbidden", "Finance access denied.", 403));
    renderPage();
    expect(await screen.findByText("Not available for your role")).toBeInTheDocument();
  });

  it("describes money changes in rupees", () => {
    expect(describeChange({ charges_total_minor: 0 }, { amount_minor: 45_770, charges_total_minor: 45_770 })).toEqual([
      "charges total: Rs 0 → Rs 457.7", "amount: Rs 457.7"]);
  });
});
