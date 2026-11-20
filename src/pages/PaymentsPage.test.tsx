import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GatewayError } from "@/lib/gateway/client";

// Finance > Payments (#69). Gateway mocked; made-up data.
const api = vi.hoisted(() => ({
  fetchFinancePayments: vi.fn(), fetchPaymentSettings: vi.fn(), fetchRefundsDue: vi.fn(), exportFinancePayments: vi.fn(),
  fetchSlipLink: vi.fn(), confirmSlip: vi.fn(), rejectSlip: vi.fn(), requestRefund: vi.fn(), approveRefund: vi.fn(), markRefundPaid: vi.fn(),
  rejectRefund: vi.fn(), updatePaymentSettings: vi.fn(),
}));
vi.mock("@/lib/finance/api", async (original) => ({ ...(await original<object>()), ...api }));
const bookings = vi.hoisted(() => ({ fetchPaymentAccounts: vi.fn() }));
vi.mock("@/lib/admin-bookings/api", async (original) => ({ ...(await original<object>()), ...bookings }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import PaymentsPage from "./PaymentsPage";

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.scrollIntoView ??= function scrollIntoView() {};

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const ROW = {
  kind: "payment", id: "p1", booking_reference: "TRV-AB12CD", pnr: "QX12AB", product: "flight", is_test: false, customer_name: "Ayesha Khan",
  method: "payfast", account_id: null, account_label: "PayFast", chosen_account_id: null, amount: rs(46_700), card_fee: rs(1_401),
  payment_fee: null, payer_reference: "T-998", status: "confirmed", at: "2026-11-20T10:00:00Z", slip_id: null, rejection_reason: null,
};
const SLIP = { ...ROW, kind: "slip", id: "s1", slip_id: "s1", method: "bank_transfer", account_id: "a1", account_label: "Meezan Bank",
  card_fee: rs(0), status: "awaiting_check", payer_reference: "IBFT-1", booking_reference: "TRV-ZZ99ZZ" };
const LIST = { payments: [ROW, SLIP], total: 2, confirmed: rs(46_700), confirmed_count: 1, awaiting: rs(46_700), awaiting_count: 1,
  daily_totals: [{ day: "2026-11-20", method: "payfast", count: 1, amount: rs(46_700), card_fee: rs(1_401) }] };

function renderPage(url = "/admin/payments") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[url]}><PaymentsPage /></MemoryRouter></QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchFinancePayments.mockResolvedValue(LIST);
  api.fetchPaymentSettings.mockResolvedValue({ card_fee_bps: 300, card_fee_on_group: true, card_fee_refunded: false });
  api.fetchRefundsDue.mockResolvedValue({ owed: [], open: [] });
  api.fetchSlipLink.mockResolvedValue({ url: "https://signed.example/slip.png", content_type: "image/png", expires_in_seconds: 300 });
  bookings.fetchPaymentAccounts.mockResolvedValue({ accounts: [{ id: "a1", method: "bank_transfer", label: "Meezan Bank" }] });
});

describe("PaymentsPage", () => {
  it("lists payments with totals from the gateway; All dates by default", async () => {
    renderPage();
    const table = await screen.findByRole("table", { name: "Payments" });
    expect(within(table).getByText("TRV-AB12CD")).toBeInTheDocument();
    expect(within(table).getByText("+ card fee Rs 1,401")).toBeInTheDocument();
    expect(api.fetchFinancePayments.mock.calls[0][0]).toEqual({ limit: 50, offset: 0, method: undefined, status: undefined, account_id: undefined, q: undefined });
    expect(screen.getByRole("button", { name: /Card fee: 3%/ })).toBeInTheDocument();
    expect(screen.getByText("Daily totals (confirmed)")).toBeInTheDocument();
  });

  it("Awaiting confirmation asks only for slips; checking one confirms what arrived", async () => {
    api.fetchFinancePayments.mockResolvedValue({ ...LIST, payments: [SLIP], total: 1 });
    api.confirmSlip.mockResolvedValue({});
    renderPage("/admin/payments?tab=awaiting");
    await waitFor(() => expect(api.fetchFinancePayments.mock.calls[0][0]).toMatchObject({ status: "awaiting_check" }));
    fireEvent.click((await screen.findAllByRole("button", { name: "Check slip" }))[0]);
    expect(await screen.findByAltText("Payment slip")).toHaveAttribute("src", "https://signed.example/slip.png");
    fireEvent.change(screen.getByLabelText("Amount received (Rs)"), { target: { value: "46,000" } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Confirm payment" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Confirm payment" }));
    await waitFor(() => expect(api.confirmSlip).toHaveBeenCalled());
    expect(api.confirmSlip.mock.calls[0][0]).toBe("s1");
    expect(api.confirmSlip.mock.calls[0][1]).toMatchObject({ amount_minor: 4_600_000, account_id: "a1", payer_reference: "IBFT-1" });
  });

  it("rejecting a slip needs a reason", async () => {
    api.fetchFinancePayments.mockResolvedValue({ ...LIST, payments: [SLIP], total: 1 });
    api.rejectSlip.mockResolvedValue({});
    renderPage("/admin/payments?tab=awaiting");
    fireEvent.click((await screen.findAllByRole("button", { name: "Check slip" }))[0]);
    fireEvent.click(await screen.findByRole("radio", { name: "Reject the slip" }));
    fireEvent.click(screen.getByRole("button", { name: "Reject slip" }));
    expect(await screen.findByText("Say why, in plain words.")).toBeInTheDocument();
    expect(api.rejectSlip).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Why is it rejected?"), { target: { value: "No money arrived" } });
    fireEvent.click(screen.getByRole("button", { name: "Reject slip" }));
    await waitFor(() => expect(api.rejectSlip).toHaveBeenCalledWith("s1", "No money arrived"));
  });

  it("Refunds due: owed bookings and refunds in progress", async () => {
    api.fetchRefundsDue.mockResolvedValue({
      owed: [{ booking_reference: "TRV-OWED01", product: "flight", booking_status: "paid_not_ticketed", is_test: false, customer_name: "Bilal",
               reason: "hold_expired", paid: rs(30_000), refundable: rs(30_000) }],
      open: [{ id: "r1", booking_reference: "TRV-REF001", amount: rs(10_000), method: "bank_transfer", status: "approved", reason: "Cancelled",
               requested_at: "2026-11-20T10:00:00Z" }],
    });
    renderPage("/admin/payments?tab=refunds");
    expect(await screen.findByText("TRV-OWED01")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record refund" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark paid" })).toBeInTheDocument();
    expect(api.fetchFinancePayments).not.toHaveBeenCalled();
  });

  it("empty, error and no-permission states", async () => {
    api.fetchFinancePayments.mockResolvedValueOnce({ ...LIST, payments: [], total: 0, daily_totals: [] });
    const first = renderPage();
    expect(await screen.findByText("No payments yet.")).toBeInTheDocument();
    first.unmount();
    api.fetchFinancePayments.mockRejectedValueOnce(new GatewayError("unavailable", "Payments couldn't be loaded. Try again in a moment.", 503));
    const second = renderPage();
    expect(await screen.findByText("Payments couldn't be loaded. Try again in a moment.")).toBeInTheDocument();
    second.unmount();
    api.fetchPaymentSettings.mockRejectedValueOnce(new GatewayError("forbidden", "Finance access denied.", 403));
    renderPage();
    expect(await screen.findByText("Not available for your role")).toBeInTheDocument();
  });
});
