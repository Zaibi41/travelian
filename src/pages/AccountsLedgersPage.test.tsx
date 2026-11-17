import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GatewayError } from "@/lib/gateway/client";

// Finance > Accounts & Ledgers, "Bank and cash book": receiving accounts. Gateway calls are mocked;
// made-up account names.
const api = vi.hoisted(() => ({ fetchReceivingAccounts: vi.fn(), addReceivingAccount: vi.fn(), deactivateReceivingAccount: vi.fn() }));
vi.mock("@/lib/finance/payment-accounts", async (original) => ({ ...(await original<object>()), ...api }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import AccountsLedgersPage from "./AccountsLedgersPage";

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => {};
Element.prototype.scrollIntoView ??= function scrollIntoView() {};

const LONG = "Meezan Bank, Travelian current account for Umrah and group ticketing collections, Gulberg branch";
const ACCOUNTS = { accounts: [
  { id: "a-1", method: "bank_transfer", label: LONG, active: true },
  { id: "a-2", method: "bank_transfer", label: "HBL collections", active: false },
  { id: "a-3", method: "jazzcash", label: "JazzCash business wallet", active: true },
] };

function renderPage(url = "/admin/finance/accounts-ledgers") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[url]}><AccountsLedgersPage /></MemoryRouter></QueryClientProvider>);
}
const table = () => screen.getByRole("table");

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchReceivingAccounts.mockResolvedValue(ACCOUNTS);
});

describe("Accounts & Ledgers: Bank and cash book", () => {
  it("title, tabs (others disabled, Not built), filters with counts including inactive, all accounts listed", async () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Accounts & Ledgers" })).toBeInTheDocument();
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map(tab => tab.textContent)).toEqual(["Bank and cash book", "Chart of accountsNot built", "Provider accountsNot built",
      "General ledgerNot built", "Manual journalsNot built"]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    tabs.slice(1).forEach(tab => expect(tab).toBeDisabled());
    await screen.findByRole("table");
    const filters = within(screen.getByRole("group", { name: "Method" })).getAllByRole("button");
    expect(filters.map(button => button.textContent)).toEqual(["All 3", "Bank transfer 2", "JazzCash 1", "1Link 0"]);
    expect(within(table()).getAllByRole("row")).toHaveLength(4);
    expect(within(table()).getByText(LONG)).toHaveAttribute("title", LONG);
    expect(within(table()).getByText(LONG).className).toContain("truncate");
    expect(within(table()).getAllByRole("button", { name: /^Deactivate/ })).toHaveLength(2);   // Active rows only
    expect(within(table()).getByText("Inactive")).toBeInTheDocument();
    expect(screen.getByText("3 accounts, 2 active")).toBeInTheDocument();
  });

  it("a method with no account shows the empty state; its button opens Add with that method", async () => {
    renderPage("/admin/finance/accounts-ledgers?method=1link");
    expect(await screen.findByText("No 1Link account is set up yet.")).toBeInTheDocument();
    expect(screen.getByText(/Add the account where 1Link payments arrive\. Staff can then pick it as "Received into" on the Payments tab\./)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add 1Link account" }));
    const dialog = await screen.findByRole("dialog", { name: "Add account" });
    expect(within(dialog).getByRole("combobox", { name: "Method" })).toHaveTextContent("1Link");
  });

  it("Add: defaults to Bank transfer under All, sends the name, and shows the gateway's error under the field", async () => {
    api.addReceivingAccount.mockRejectedValueOnce(new GatewayError("unavailable", "An active account with this name and method already exists.", 409));
    api.addReceivingAccount.mockResolvedValueOnce({ id: "a-9", method: "bank_transfer", label: "UBL", active: true });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Add account" }));
    const dialog = await screen.findByRole("dialog", { name: "Add account" });
    expect(within(dialog).getByRole("combobox", { name: "Method" })).toHaveTextContent("Bank transfer");
    expect(within(dialog).getByText(/don't include the full account number/)).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText("Account name"), { target: { value: "HBL collections" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save account" }));
    const alert = await within(dialog).findByRole("alert");
    expect(alert).toHaveTextContent("An active account with this name and method already exists.");
    expect(within(dialog).getByLabelText("Account name")).toHaveAttribute("aria-invalid", "true");
    fireEvent.change(within(dialog).getByLabelText("Account name"), { target: { value: "UBL" } });
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Save account" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(api.addReceivingAccount).toHaveBeenLastCalledWith("bank_transfer", "UBL");
    expect(api.fetchReceivingAccounts).toHaveBeenCalledTimes(2);   // the list reloads
  });

  it("Add under a method filter preselects that method", async () => {
    renderPage("/admin/finance/accounts-ledgers?method=jazzcash");
    fireEvent.click(await screen.findByRole("button", { name: "Add account" }));
    expect(within(await screen.findByRole("dialog")).getByRole("combobox", { name: "Method" })).toHaveTextContent("JazzCash");
  });

  it("Deactivate: confirm shows the account and the rules, then deactivates", async () => {
    api.deactivateReceivingAccount.mockResolvedValue({ ...ACCOUNTS.accounts[2], active: false });
    renderPage();
    await screen.findByRole("table");
    fireEvent.click(within(table()).getByRole("button", { name: "Deactivate JazzCash business wallet" }));
    const dialog = await screen.findByRole("dialog", { name: "Deactivate account?" });
    expect(dialog).toHaveTextContent("JazzCash business wallet");
    expect(dialog).toHaveTextContent('Staff will no longer be able to choose it as "Received into" for new payments.');
    expect(dialog).toHaveTextContent("Payments already recorded keep this account. Accounts are never deleted.");
    fireEvent.click(within(dialog).getByRole("button", { name: "Deactivate account" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(api.deactivateReceivingAccount).toHaveBeenCalledWith("a-3");
  });

  it("a role the gateway refuses sees a notice, not the card", async () => {
    api.fetchReceivingAccounts.mockRejectedValue(new GatewayError("forbidden", "Accounts & Ledgers access denied.", 403));
    renderPage();
    expect(await screen.findByText("Not available for your role")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add account" })).not.toBeInTheDocument();
  });
});
