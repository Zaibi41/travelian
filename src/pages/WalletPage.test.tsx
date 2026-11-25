import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GatewayError } from "@/lib/gateway/client";

// Finance > Wallets (issue 224, D3): B2B agency wallets only. Gateway mocked; made-up agencies and amounts.
const role = vi.hoisted(() => ({ current: "super_admin" }));
vi.mock("@/contexts/RoleContext", () => ({ useRole: () => ({ currentRole: role.current }) }));
const api = vi.hoisted(() => ({ fetchAgencyWallets: vi.fn(), addAgencyWalletEntry: vi.fn(), fetchAgencyWalletStatement: vi.fn(), setAgencyWalletLow: vi.fn(),
  fetchSaleOptions: vi.fn() }));
vi.mock("@/lib/finance/ops-api", async (original) => ({ ...(await original<object>()), ...api }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import WalletPage from "./WalletPage";

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const WALLETS = { total_balance: rs(95_000), low_count: 1, wallets: [
  { agency_id: "karachi", agency_name: "Karachi Travels", agency_status: "active", balance: rs(80_000), deposits: rs(100_000), last_deposit_at: "2026-11-24T08:00:00Z" },
  { agency_id: "lahore", agency_name: "Lahore Tours", agency_status: "active", balance: rs(15_000), deposits: rs(15_000), low_threshold: rs(20_000), low: true },
] };

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter><WalletPage /></MemoryRouter></QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  role.current = "super_admin";
  api.fetchAgencyWallets.mockResolvedValue(WALLETS);
  api.fetchSaleOptions.mockResolvedValue({ is_finance: true, suppliers: [], partners: [], accounts: [{ id: "a1", name: "UBL Business", detail: "business" }] });
});

describe("WalletPage", () => {
  it("shows agency wallets, not supplier balances", async () => {
    renderPage();
    expect(await screen.findByText("Held for agencies")).toBeInTheDocument();
    expect(screen.getAllByText("Karachi Travels").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Low").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Southair|South Air|Sooperfare/)).not.toBeInTheDocument();
  });

  it("a deposit needs the account and reference; an adjustment can take money off", async () => {
    api.addAgencyWalletEntry.mockResolvedValue({ ...WALLETS.wallets[0], balance: rs(85_000) });
    renderPage();
    fireEvent.click((await screen.findAllByRole("button", { name: "Record deposit for Karachi Travels" }))[0]);
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Amount (Rs)"), { target: { value: "5,000" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Record deposit" }));
    expect(await within(dialog).findByText("Choose the account the money arrived in.")).toBeInTheDocument();
    expect(api.addAgencyWalletEntry).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    fireEvent.click(screen.getAllByRole("button", { name: "Adjust Karachi Travels wallet" })[0]);
    fireEvent.click(screen.getByRole("radio", { name: "Take off wallet" }));
    fireEvent.change(screen.getByLabelText("Amount (Rs)"), { target: { value: "1,000" } });
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Fee agreed" } });
    fireEvent.click(screen.getByRole("button", { name: "Adjust wallet" }));
    await waitFor(() => expect(api.addAgencyWalletEntry).toHaveBeenCalled());
    expect(api.addAgencyWalletEntry.mock.calls[0][0]).toBe("karachi");
    expect(api.addAgencyWalletEntry.mock.calls[0][1]).toMatchObject({ kind: "adjustment", amount_minor: -100_000, reason: "Fee agreed", account_id: null });
  });

  it("no permission and agency roles", async () => {
    api.fetchAgencyWallets.mockRejectedValueOnce(new GatewayError("forbidden", "Needs Finance.", 403));
    const first = renderPage();
    expect(await screen.findByText("Not available for your role")).toBeInTheDocument();
    first.unmount();
    role.current = "agency_owner";
    renderPage();
    expect(screen.getByText("Not built yet.")).toBeInTheDocument();
    expect(api.fetchAgencyWallets).toHaveBeenCalledTimes(1);
  });
});
