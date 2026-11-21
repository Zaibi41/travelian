import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GatewayError } from "@/lib/gateway/client";

// Finance > Wallets (#68). Gateway mocked; made-up balances.
const role = vi.hoisted(() => ({ current: "super_admin" }));
vi.mock("@/contexts/RoleContext", () => ({ useRole: () => ({ currentRole: role.current }) }));
const api = vi.hoisted(() => ({ fetchSupplierWallets: vi.fn(), refreshSouthair: vi.fn(), recordWalletEntry: vi.fn(), setWalletThreshold: vi.fn(),
  fetchWalletHistory: vi.fn() }));
vi.mock("@/lib/finance/api", async (original) => ({ ...(await original<object>()), ...api }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import WalletPage from "./WalletPage";

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const WALLETS = { wallets: [
  { provider_id: "southair", name: "Southair", mode: "api", balance: rs(90_000), as_of: "2026-11-21T06:00:00Z", threshold: rs(100_000), low: true },
  { provider_id: "sooperfare", name: "SooperFare", mode: "calculated", balance: null, note: "SooperFare has no balance API. Record a top-up to start." },
] };

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter><WalletPage /></MemoryRouter></QueryClientProvider>);
}

beforeEach(() => { vi.clearAllMocks(); role.current = "super_admin"; api.fetchSupplierWallets.mockResolvedValue(WALLETS); });

describe("WalletPage", () => {
  it("shows each supplier's balance with a Low label and the right actions", async () => {
    renderPage();
    expect(await screen.findByText("Rs 90,000")).toBeInTheDocument();
    expect(screen.getByText("Low")).toBeInTheDocument();
    expect(screen.getByText("Not known")).toBeInTheDocument();
    expect(screen.getByText(/no balance API/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record top-up" })).toBeInTheDocument();
  });

  it("an adjustment needs a reason and can take off the balance", async () => {
    api.recordWalletEntry.mockResolvedValue({});
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Adjust balance" }));
    fireEvent.click(screen.getByRole("radio", { name: "Take off balance" }));
    fireEvent.change(screen.getByLabelText("Amount (Rs)"), { target: { value: "1,230" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Adjust balance" }).at(-1)!);
    expect(await screen.findByText("Say why, in plain words.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Portal shows less" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Adjust balance" }).at(-1)!);
    await waitFor(() => expect(api.recordWalletEntry).toHaveBeenCalled());
    expect(api.recordWalletEntry.mock.calls[0][0]).toBe("sooperfare");
    expect(api.recordWalletEntry.mock.calls[0][1]).toBe("adjustments");
    expect(api.recordWalletEntry.mock.calls[0][2]).toMatchObject({ amount_minor: -123_000, reason: "Portal shows less" });
  });

  it("no permission and agency roles", async () => {
    api.fetchSupplierWallets.mockRejectedValueOnce(new GatewayError("forbidden", "Supplier balances need the cost and margin permission.", 403));
    const first = renderPage();
    expect(await screen.findByText("Not available for your role")).toBeInTheDocument();
    first.unmount();
    role.current = "agency_owner";
    renderPage();
    expect(screen.getByText("Not built yet.")).toBeInTheDocument();
    expect(api.fetchSupplierWallets).toHaveBeenCalledTimes(1);
  });
});
