import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GatewayError } from "@/lib/gateway/client";

// Finance operations screens. Gateway mocked; made-up suppliers, amounts and people.
const api = vi.hoisted(() => ({
  fetchSuppliers: vi.fn(), fetchSupplierLedger: vi.fn(), fetchSaleOptions: vi.fn(), previewTicketSale: vi.fn(), saveTicketSale: vi.fn(),
  fetchTicketSales: vi.fn(), fetchFinanceOverview: vi.fn(), fetchCustomerDues: vi.fn(), fetchSupplierRefunds: vi.fn(), applySupplierRefund: vi.fn(),
}));
vi.mock("@/lib/finance/ops-api", async (original) => ({ ...(await original<object>()), ...api }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import SupplierBalancesPage from "./SupplierBalancesPage";
import TicketSaleEntryPage from "./TicketSaleEntryPage";
import FinanceOverviewPage from "./FinanceOverviewPage";
import CustomerDuesPage from "./CustomerDuesPage";
import SupplierRefundsPage from "./SupplierRefundsPage";

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const supplier = (over: Record<string, unknown>) => ({
  section: "direct", booking_mode: "manual", balance_mode: "manual", total_topped_up: rs(0), total_deducted: rs(0), status: "ok", ...over,
});
const SUPPLIERS = { suppliers: [
  supplier({ id: "southair", name: "South Air", section: "api", booking_mode: "api", balance_mode: "api", current_balance: rs(500_000), status: "ok" }),
  supplier({ id: "sooperfare", name: "Sooperfare", section: "api", booking_mode: "api", current_balance: null, status: "not_set_up" }),
  supplier({ id: "airsial", name: "AirSial", opening_balance: rs(100_000), opening_set_at: "2026-11-20T00:00:00Z", total_deducted: rs(90_000),
    current_balance: rs(10_000), low_threshold: rs(20_000), status: "low", last_updated: "2026-11-24T08:00:00Z" }),
] };

function renderPage(page: React.ReactNode, url = "/") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[url]}>{page}</MemoryRouter></QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchSuppliers.mockResolvedValue(SUPPLIERS);
  api.fetchTicketSales.mockResolvedValue({ items: [], can_confirm: true });
});

describe("Supplier Balances", () => {
  it("shows the two sections with booking and balance badges and the status pill", async () => {
    renderPage(<SupplierBalancesPage />);
    const api_ = await screen.findByRole("region", { name: "API-integrated" });
    const table = within(api_).getAllByRole("table")[0] ?? api_;
    expect(within(table).getAllByText("South Air").length).toBeGreaterThan(0);
    expect(within(api_).getAllByText("Booking: API").length).toBeGreaterThan(0);
    expect(within(api_).getAllByText("Balance: API").length).toBeGreaterThan(0);
    expect(within(api_).getAllByText("Balance: Manual").length).toBeGreaterThan(0); // Sooperfare: no balance endpoint
    const direct = screen.getByRole("region", { name: "Direct airline IDs" });
    expect(within(direct).getAllByText("Low").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Add Supplier/ })).toBeInTheDocument();
  });

  it("the ledger shows Ticket Sale Entry and booking deductions in one history, each linked to its cause", async () => {
    api.fetchSupplierLedger.mockResolvedValue({ supplier: SUPPLIERS.suppliers[2], items: [
      { at: "2026-11-20T00:00:00Z", kind: "opening", amount: rs(100_000), balance_after: rs(100_000), description: "Opening balance", counted: true },
      { at: "2026-11-21T00:00:00Z", kind: "ticket_sale", amount: rs(-60_000), balance_after: rs(40_000), description: "Ticket Sale Entry #7", ticket_sale_number: 7, by_role: "super_admin", counted: true },
      { at: "2026-11-22T00:00:00Z", kind: "booking_charge", amount: rs(-30_000), balance_after: rs(10_000), description: "Supplier payment settlement", booking_reference: "TRV-ABC123", by_role: "staff", counted: true },
    ] });
    renderPage(<SupplierBalancesPage />);
    fireEvent.click(await screen.findByRole("button", { name: "AirSial ledger" }));
    const ledger = await screen.findByRole("list", { name: "AirSial ledger" });
    const rows = within(ledger).getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByRole("link", { name: "Booking TRV-ABC123" })).toHaveAttribute("href", "/admin/bookings/TRV-ABC123");
    expect(within(rows[1]).getByRole("link", { name: "Ticket Sale Entry #7" })).toHaveAttribute("href", "/admin/finance/ticket-sales?entry=7");
  });

  it("no permission", async () => {
    api.fetchSuppliers.mockRejectedValueOnce(new GatewayError("forbidden", "Needs Finance.", 403));
    renderPage(<SupplierBalancesPage />);
    expect(await screen.findByText("Not available for your role")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add Supplier/ })).not.toBeInTheDocument();
  });
});

describe("Ticket Sale Entry", () => {
  const OPTIONS = { suppliers: [{ id: "airsial", name: "AirSial" }], accounts: [{ id: "a1", name: "UBL Business", detail: "business" }], partners: [{ id: "p1", name: "Karachi Travels" }] };

  it("staff without Finance submit it for Finance to confirm, and the gateway's effects are shown", async () => {
    api.fetchSaleOptions.mockResolvedValue({ ...OPTIONS, is_finance: false });
    api.previewTicketSale.mockResolvedValue({ profit: rs(2_000), due: rs(62_000), problems: [], confirmed_on_save: false,
      effects: ["Be sent to Finance to confirm. Nothing below happens until Finance confirms it.", "Deduct the cost from AirSial's balance when Finance confirms it (if the balance covers it)."] });
    api.fetchTicketSales.mockResolvedValue({ items: [], can_confirm: false });
    renderPage(<TicketSaleEntryPage />);
    expect(await screen.findByRole("button", { name: "Submit for Finance to confirm" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Cost (Rs)"), { target: { value: "60000" } });
    fireEvent.change(screen.getByLabelText("Sale price (Rs)"), { target: { value: "62000" } });
    expect(await screen.findByText(/when Finance confirms it/)).toBeInTheDocument();
    expect(await screen.findByText("Rs 2,000")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Submit for Finance to confirm" }));
    expect(await screen.findByText("Find or add the passenger.")).toBeInTheDocument();
    expect(api.saveTicketSale).not.toHaveBeenCalled();
  });

  it("B2B Partner shows the partner picker; Finance saves directly; a refused preview blocks saving", async () => {
    api.fetchSaleOptions.mockResolvedValue({ ...OPTIONS, is_finance: true });
    api.previewTicketSale.mockResolvedValue({ profit: rs(1_000), due: rs(0), effects: [], confirmed_on_save: true,
      problems: ["AirSial's balance would go below zero (Rs -10,000). Top up AirSial first."] });
    renderPage(<TicketSaleEntryPage />);
    expect(await screen.findByRole("button", { name: "Save entry" })).toBeInTheDocument();
    expect(screen.queryByLabelText("B2B partner")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "B2B Partner" }));
    expect(screen.getByLabelText("B2B partner")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Cost (Rs)"), { target: { value: "50000" } });
    expect(await screen.findByText(/would go below zero/)).toBeInTheDocument();
  });
});

describe("Finance overview", () => {
  it("shows the tiles, the suppliers needing action and the quick action", async () => {
    api.fetchFinanceOverview.mockResolvedValue({
      total_supplier_balance: rs(510_000), suppliers_attention_count: 1, suppliers_negative_count: 0, total_bank_balance: rs(52_000), include_personal: false,
      total_customer_dues: rs(61_006), customer_dues_count: 2, total_profit: rs(2_114), profit_not_known: 0, pending_refunds_count: 1,
      pending_refunds_total: rs(15_000), pending_sales_count: 1, suppliers: [{ id: "airsial", name: "AirSial" }],
      attention: [{ supplier_id: "airsial", supplier_name: "AirSial", status: "low", current_balance: rs(10_000), low_threshold: rs(20_000) }],
      activity: [{ at: "2026-11-24T08:00:00Z", kind: "top_up", title: "AirSial top-up", amount: rs(50_000), by_role: "super_admin" }],
    });
    renderPage(<FinanceOverviewPage />);
    expect(await screen.findByText("Total Supplier Balance")).toBeInTheDocument();
    for (const tile of ["Total Bank Balance", "Total Customer Dues", "Total Profit", "Pending Supplier Refunds"]) expect(screen.getByText(tile)).toBeInTheDocument();
    expect(screen.getByText("1 supplier below threshold")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Top up AirSial" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /New Ticket Sale Entry/ })).toHaveAttribute("href", "/admin/finance/ticket-sales");
    expect(screen.getByText("AirSial top-up")).toBeInTheDocument();
    expect(screen.getByText(/waiting for Finance/)).toBeInTheDocument();
  });

  it("hides supplier and profit tiles the gateway doesn't send (no cost and margin)", async () => {
    api.fetchFinanceOverview.mockResolvedValue({
      total_bank_balance: rs(0), include_personal: false, total_customer_dues: rs(0), customer_dues_count: 0, pending_refunds_count: 0,
      pending_refunds_total: rs(0), pending_sales_count: 0, suppliers: [], attention: [], activity: [], suppliers_attention_count: 0, suppliers_negative_count: 0, profit_not_known: 0,
    });
    renderPage(<FinanceOverviewPage />);
    expect(await screen.findByText("Total Bank Balance")).toBeInTheDocument();
    expect(screen.queryByText("Total Supplier Balance")).not.toBeInTheDocument();
    expect(screen.queryByText("Total Profit")).not.toBeInTheDocument();
  });
});

describe("Customer Dues and Supplier Refunds", () => {
  it("lists dues longest first, with the account a part payment went into", async () => {
    api.fetchCustomerDues.mockResolvedValue({ total_due: rs(61_006), items: [
      { kind: "ticket_sale", reference: "TSE-3", customer: "Muhammad Azam", total: rs(62_000), received: rs(2_000), due: rs(60_000), days_outstanding: 2, payment_account: "UBL Business" },
      { kind: "booking", reference: "TRV-277WKE", customer: "Ali Khan", total: rs(76_006), received: rs(75_000), due: rs(1_006), days_outstanding: 9, payment_account: "UBL Business" },
    ] });
    renderPage(<CustomerDuesPage />);
    const rows = await screen.findAllByRole("row");
    expect(within(rows[1]).getByText("TRV-277WKE")).toBeInTheDocument();
    expect(within(rows[2]).getByRole("link", { name: "Ticket Sale Entry #3" })).toHaveAttribute("href", "/admin/finance/ticket-sales?entry=3");
  });

  it("applies a refund as credit against a booking", async () => {
    api.fetchSupplierRefunds.mockResolvedValue({ pending_count: 1, pending_total: rs(15_000), items: [
      { id: "r1", number: 4, supplier_id: "sooperfare", supplier_name: "Sooperfare", amount: rs(15_000), applied: rs(0), remaining: rs(15_000), reason: "Cancelled PNR",
        status: "requested", opened_on: "2026-11-20", days_outstanding: 5, next_statuses: ["chased", "received", "written_off"], can_apply_credit: true },
    ] });
    api.applySupplierRefund.mockResolvedValue({ remaining: rs(0) });
    renderPage(<SupplierRefundsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Apply as credit" }));
    fireEvent.change(screen.getByLabelText("Booking reference"), { target: { value: "trv-277wke" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Apply as credit" }).at(-1)!);
    await waitFor(() => expect(api.applySupplierRefund).toHaveBeenCalledWith("r1", { booking_reference: "TRV-277WKE", billable_minor: null }));
  });
});
