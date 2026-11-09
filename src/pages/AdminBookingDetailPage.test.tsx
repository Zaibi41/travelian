import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BookingDetail } from "@/lib/admin-bookings/types";
import { GatewayError } from "@/lib/gateway/client";

const detail = { current: {} as Record<string, unknown> };
vi.mock("@/lib/admin-bookings/use-bookings", () => ({ useBookingDetail: () => detail.current }));

import AdminBookingDetailPage from "./AdminBookingDetailPage";

const ok = <T,>(data: T) => ({ data, error: null, isPending: false });
const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });

// Plain staff: no provider, supplier cost, margin or supplier_payment in the response (D23).
const STAFF_VIEW: BookingDetail = {
  source: "gateway_bookings", sample: false, booking_id: "TRV-1", pnr: "AB12CD", product: "flight",
  customer_or_agency: "Karachi Travels", statuses: { booking: "held", payment: "unpaid", issuance: "not_issued" },
  amount: rs(12_500), deadline: "2099-11-05T09:00:00Z", created_at: "2026-11-05T07:00:00Z",
  fare: { billable_price: rs(12_500) },
  sections_not_available: ["itinerary", "passengers", "payments", "tickets", "servicing", "audit"],
};
const ADMIN_VIEW: BookingDetail = {
  ...STAFF_VIEW, provider: "AirSial",
  fare: { billable_price: rs(12_500), supplier_cost: rs(11_000), margin: rs(1_500) },
  supplier_payment: { amount_due: rs(11_000), hold_deadline: "2099-11-05T09:00:00Z" },
};

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/admin/bookings/:bookingId" element={<AdminBookingDetailPage />} />
        <Route path="/admin/bookings/:bookingId/:tab" element={<AdminBookingDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );

const tabLabels = () => within(screen.getByRole("navigation", { name: "Booking" })).getAllByRole("link").map(link => link.textContent);

describe("Booking detail", () => {
  beforeEach(() => {
    detail.current = ok(ADMIN_VIEW);
  });

  it("is a page with nine tabs for admins, statuses in the header, and no Edit booking", () => {
    renderAt("/admin/bookings/TRV-1");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Booking AB12CD");
    expect(tabLabels()).toEqual(["Overview", "Itinerary", "Passengers", "Fare", "Payments", "Supplier payment", "Tickets", "Servicing", "Audit"]);
    expect(screen.getByRole("link", { name: "Fare" })).toHaveAttribute("href", "/admin/bookings/TRV-1/fare");
    expect(screen.queryByText(/Edit booking/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("Overview shows recorded fields and hides Owner and Supplier status", () => {
    renderAt("/admin/bookings/TRV-1");
    const overview = screen.getByRole("region", { name: "Overview" });
    expect(within(overview).getByText("Rs 12,500")).toBeInTheDocument();
    expect(within(overview).getByText("Karachi Travels")).toBeInTheDocument();
    expect(within(overview).getByText(/left\)$/)).toBeInTheDocument();
    expect(within(overview).queryByText(/Owner|Supplier status|Assign/)).not.toBeInTheDocument();
  });

  it("shows time left only while the hold is open", () => {
    detail.current = ok({ ...ADMIN_VIEW, statuses: { booking: "ticket_issued", payment: "paid", issuance: "issued" } });
    renderAt("/admin/bookings/TRV-1");
    expect(screen.queryByText(/left\)$/)).not.toBeInTheDocument();
  });

  it("Fare shows supplier cost and margin only when the gateway sends them", () => {
    const { unmount } = renderAt("/admin/bookings/TRV-1/fare");
    const fare = screen.getByRole("region", { name: "Fare" });
    expect(within(fare).getAllByRole("row").map(row => row.textContent)).toEqual([
      "ItemAmount", "Billable priceRs 12,500", "Supplier costRs 11,000", "MarginRs 1,500",
    ]);
    unmount();
    detail.current = ok(STAFF_VIEW);
    renderAt("/admin/bookings/TRV-1/fare");
    expect(screen.queryByText(/Supplier cost|Margin|11,000|1,500/)).not.toBeInTheDocument();
  });

  it("plain staff: no Supplier payment tab, and its URL goes back to Overview", () => {
    detail.current = ok(STAFF_VIEW);
    renderAt("/admin/bookings/TRV-1/supplier-payment");
    expect(tabLabels()).not.toContain("Supplier payment");
    expect(screen.getByRole("region", { name: "Overview" })).toBeInTheDocument();
    expect(screen.queryByText("AirSial")).not.toBeInTheDocument();
  });

  it("Supplier payment shows amount due and hold deadline for permitted viewers", () => {
    renderAt("/admin/bookings/TRV-1/supplier-payment");
    const payment = screen.getByRole("region", { name: "Supplier payment" });
    expect(within(payment).getByText("Rs 11,000")).toBeInTheDocument();
    expect(within(payment).queryByText(/Transfer reference|Paid from/)).not.toBeInTheDocument();
  });

  it("tabs without recorded data show the mockup columns and say not available", () => {
    renderAt("/admin/bookings/TRV-1/passengers");
    const table = screen.getByRole("table");
    expect(within(table).getByRole("columnheader", { name: "Document (masked)" })).toBeInTheDocument();
    expect(table).toHaveTextContent("Not available yet. The gateway doesn't record passengers for bookings yet.");
  });

  it("tickets shell leaves out the supplier response column", () => {
    renderAt("/admin/bookings/TRV-1/tickets");
    expect(screen.queryByRole("columnheader", { name: /Supplier response/ })).not.toBeInTheDocument();
  });

  it("labels sample bookings and reports missing ones", () => {
    detail.current = ok({ ...ADMIN_VIEW, sample: true, sample_label: "Sample data" });
    const { unmount } = renderAt("/admin/bookings/TRV-1");
    expect(screen.getByText("Sample data")).toBeInTheDocument();
    unmount();
    detail.current = { data: undefined, error: new GatewayError("not_found", "x"), isPending: false };
    renderAt("/admin/bookings/NOPE");
    expect(screen.getByRole("alert")).toHaveTextContent("This booking wasn't found.");
  });
});
