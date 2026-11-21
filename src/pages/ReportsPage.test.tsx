import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GatewayError } from "@/lib/gateway/client";
import { REPORT } from "../../e2e/support/report-fixture";

// Reports (#70). Gateway mocked; made-up data.
const api = vi.hoisted(() => ({ fetchFinanceReport: vi.fn(), exportReportXlsx: vi.fn(), exportReportCsv: vi.fn(), saveBlob: vi.fn() }));
vi.mock("@/lib/finance/api", async (original) => ({ ...(await original<object>()), ...api }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

import ReportsPage from "./ReportsPage";

function renderPage(url = "/admin/reports") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[url]}><ReportsPage /></MemoryRouter></QueryClientProvider>);
}

beforeEach(() => { vi.clearAllMocks(); api.fetchFinanceReport.mockResolvedValue(REPORT); });

describe("ReportsPage", () => {
  it("shows tiles from the gateway, with profit not known counted apart", async () => {
    renderPage();
    expect((await screen.findAllByText("Rs 421,300")).length).toBeGreaterThan(0);
    expect(screen.getByText("1 booking: profit not known")).toBeInTheDocument();
    expect(api.fetchFinanceReport.mock.calls[0][0]).toEqual({ granularity: "day", product: undefined });
    expect(screen.getAllByText("Not known").length).toBeGreaterThan(0);
  });

  it("filters from the URL and exports", async () => {
    api.exportReportXlsx.mockResolvedValue(new Blob(["x"]));
    renderPage("/admin/reports?date=month&by=week&product=group");
    await waitFor(() => expect(api.fetchFinanceReport.mock.calls[0][0]).toMatchObject({ granularity: "week", product: "group" }));
    expect(api.fetchFinanceReport.mock.calls[0][0].date_from).toMatch(/-01$/);
    fireEvent.click(await screen.findByRole("button", { name: "Export Excel" }));
    await waitFor(() => expect(api.saveBlob).toHaveBeenCalled());
  });

  it("without cost access there is no profit tile or profit by booking", async () => {
    api.fetchFinanceReport.mockResolvedValue({ ...REPORT, totals: { ...REPORT.totals, profit: null, supplier_charge: null }, by_booking: null, supplier_spend: null });
    renderPage();
    expect((await screen.findAllByText("Rs 421,300")).length).toBeGreaterThan(0);
    expect(screen.queryByText("Profit by booking")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Receivables" })).toBeInTheDocument();
  });

  it("no Finance permission", async () => {
    api.fetchFinanceReport.mockRejectedValue(new GatewayError("forbidden", "Finance access denied.", 403));
    renderPage();
    expect(await screen.findByText("Not available for your role")).toBeInTheDocument();
  });
});
