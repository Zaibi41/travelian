import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GatewayError } from "@/lib/gateway/client";
import { IMPORTS, LINES, MISMATCHES } from "../../e2e/support/recon-fixture";

const api = vi.hoisted(() => ({ fetchMismatches: vi.fn(), resolveMismatch: vi.fn(), fetchStatementImports: vi.fn(), fetchStatementLines: vi.fn(),
  decideBankMatch: vi.fn(), runSupplierCheck: vi.fn(), previewStatement: vi.fn(), importStatement: vi.fn() }));
vi.mock("@/lib/finance/api", async (original) => ({ ...(await original<object>()), ...api }));
const bookings = vi.hoisted(() => ({ fetchPaymentAccounts: vi.fn() }));
vi.mock("@/lib/admin-bookings/api", async (original) => ({ ...(await original<object>()), ...bookings }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

import ReconciliationPage from "./ReconciliationPage";

function renderPage(url = "/admin/finance/reconciliation") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[url]}><ReconciliationPage /></MemoryRouter></QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchMismatches.mockResolvedValue(MISMATCHES);
  api.fetchStatementImports.mockResolvedValue(IMPORTS);
  api.fetchStatementLines.mockResolvedValue(LINES);
  bookings.fetchPaymentAccounts.mockResolvedValue({ accounts: [{ id: "a1", method: "bank_transfer", label: "Meezan Bank" }] });
});

describe("ReconciliationPage", () => {
  it("lists open mismatches and resolves one with a reason", async () => {
    api.resolveMismatch.mockResolvedValue({});
    renderPage();
    expect(await screen.findByText("PayFast amount differs")).toBeInTheDocument();
    expect(api.fetchMismatches.mock.calls[0][0]).toBe("open");
    fireEvent.click(screen.getAllByRole("button", { name: "Explain or resolve" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Write it in plain words.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("What happened"), { target: { value: "PayFast refunded Rs 101 of the fee" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(api.resolveMismatch).toHaveBeenCalledWith("m1", "explained", "PayFast refunded Rs 101 of the fee"));
  });

  it("bank: open an import and confirm a suggested match", async () => {
    api.decideBankMatch.mockResolvedValue(undefined);
    renderPage("/admin/finance/reconciliation?tab=bank");
    fireEvent.click(await screen.findByRole("button", { name: "Open" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(api.decideBankMatch).toHaveBeenCalledWith("l1", true));
  });

  it("import: preview, choose columns, rows that can't be read are listed", async () => {
    api.previewStatement.mockResolvedValue({ columns: ["Txn", "Gross", "Fee"], sample: [["T1", "48,101", "1,250"]], rows: 1, date_formats: ["DD/MM/YYYY"] });
    api.importStatement.mockRejectedValue(new GatewayError("unavailable", "1 row couldn't be read. Nothing was imported.", 422, undefined, [],
      { problems: ['Row 2: "x" is not an amount'] }));
    renderPage("/admin/finance/reconciliation?tab=payfast");
    fireEvent.click(await screen.findByRole("button", { name: "Import CSV" }));
    const file = new File(["Txn,Gross,Fee\nT1,48101,1250\n"], "settlement.csv", { type: "text/csv" });
    fireEvent.change(screen.getByLabelText("CSV file"), { target: { files: [file] } });
    expect(await screen.findByText("1 row. Say which column holds what:")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import" })).toBeDisabled();
    expect(screen.getByText(/Still to choose: Transaction id, Amount \(gross\)/)).toBeInTheDocument();
  });

  it("no Finance permission", async () => {
    api.fetchMismatches.mockRejectedValue(new GatewayError("forbidden", "Finance access denied.", 403));
    renderPage();
    expect(await screen.findByText("Not available for your role")).toBeInTheDocument();
  });
});
