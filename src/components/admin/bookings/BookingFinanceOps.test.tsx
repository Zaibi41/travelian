import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BookingDetail } from "@/lib/admin-bookings/types";

// Issue 202 on the booking detail. Gateway mocked; made-up booking.
const api = vi.hoisted(() => ({ acceptPaymentShortfall: vi.fn(), setSoldThrough: vi.fn(), setSupplierBillable: vi.fn(), settleSupplierBilling: vi.fn() }));
vi.mock("@/lib/finance/ops-api", async (original) => ({ ...(await original<object>()), ...api }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { PaymentDifference, SoldThroughValue, SupplierPaymentPanel } from "./BookingFinanceOps";

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const BOOKING = {
  booking_id: "TRV-277WKE", amount: rs(76_006), amount_due: rs(1_006), can_accept_shortfall: true, can_edit_sold_through: true, sold_through: null,
  supplier_payment: { amount_due: rs(76_006), available: true, can_edit: true, suppliers: [{ id: "sooperfare", name: "Sooperfare" }], supplier_id: "sooperfare",
    supplier_name: "Sooperfare", refund_credits: [{ id: "r1", number: 4, remaining: rs(80_000), reason: "Cancelled PNR" }] },
} as unknown as BookingDetail;

const renderIt = (node: React.ReactNode) =>
  render(<QueryClientProvider client={new QueryClient()}><MemoryRouter>{node}</MemoryRouter></QueryClientProvider>);

beforeEach(() => vi.clearAllMocks());

describe("booking finance (issue 202)", () => {
  it("accepts a payment difference only with a reason and an explanation", async () => {
    api.acceptPaymentShortfall.mockResolvedValue({});
    renderIt(<PaymentDifference booking={BOOKING} />);
    fireEvent.click(screen.getByRole("button", { name: "Accept difference" }));
    expect(await screen.findByText("Choose the reason.")).toBeInTheDocument();
    expect(api.acceptPaymentShortfall).not.toHaveBeenCalled();
  });

  it("shows an accepted difference instead of the form", () => {
    renderIt(<PaymentDifference booking={{ ...BOOKING, can_accept_shortfall: false, payment_shortfall: { amount: rs(1_006), reason_kind: "channel_rate",
      reason: "Reseller / channel rate", note: "Agreed on WhatsApp", recorded_at: "2026-11-24T10:00:00Z" } } as BookingDetail} />);
    expect(screen.getByText(/Difference of Rs 1,006 accepted/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accept difference" })).not.toBeInTheDocument();
  });

  it("records sold-through separately from the customer", async () => {
    api.setSoldThrough.mockResolvedValue({ sold_through: "Lahore reseller" });
    renderIt(<SoldThroughValue booking={BOOKING} />);
    fireEvent.click(screen.getByRole("button", { name: /Edit/ }));
    fireEvent.change(screen.getByLabelText("Sold through"), { target: { value: "Lahore reseller" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(api.setSoldThrough).toHaveBeenCalledWith("TRV-277WKE", "Lahore reseller"));
  });

  it("sets the billable amount, then settles against a refund credit", async () => {
    api.setSupplierBillable.mockResolvedValue({});
    api.settleSupplierBilling.mockResolvedValue({});
    const first = renderIt(<SupplierPaymentPanel booking={BOOKING} />);
    expect(screen.queryByRole("button", { name: "Settle with supplier" })).not.toBeInTheDocument(); // nothing to settle before the amount is set
    fireEvent.click(screen.getByRole("button", { name: /Set amount/ }));
    fireEvent.change(screen.getByLabelText("Amount (Rs)"), { target: { value: "74,886" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(api.setSupplierBillable).toHaveBeenCalledWith("TRV-277WKE", { billable_minor: 7_488_600, supplier_id: "sooperfare", note: null }));
    first.unmount();
    renderIt(<SupplierPaymentPanel booking={{ ...BOOKING, supplier_payment: { ...BOOKING.supplier_payment!, billable_amount: rs(74_886), amount_due: rs(74_886) } } as BookingDetail} />);
    expect(screen.getAllByText("Rs 74,886").length).toBe(2); // Amount due and the billable amount agree
    fireEvent.click(screen.getByRole("button", { name: "Settle with supplier" }));
    fireEvent.click(screen.getByRole("radio", { name: "Offset against a refund credit" }));
    fireEvent.click(screen.getByRole("button", { name: "Settle" }));
    await waitFor(() => expect(api.settleSupplierBilling).toHaveBeenCalledWith("TRV-277WKE", { method: "refund_credit", refund_id: "r1" }));
  });
});
