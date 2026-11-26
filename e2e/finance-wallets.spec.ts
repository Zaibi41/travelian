import { expect, test } from "@playwright/test";
import { BEFORE, openAdmin, overflow, rs, shot } from "./support/finance";
import { expectReadableText } from "./support/type-scale";

// travelian#226: Finance > Wallets is B2B agency wallets (B2C customers have no wallet; supplier balances are on Supplier
// Balances). Made-up agencies and amounts, one with a long name; before = live site.
if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
if (process.env.FINANCE_BASE_URL) test.use({ baseURL: process.env.FINANCE_BASE_URL });

const wallet = (id: string, name: string, balance: number, low: boolean) => ({
  agency_id: id, agency_name: name, agency_status: "active", balance: rs(balance), deposits: rs(balance + 10_000),
  last_deposit_at: "2026-11-21T06:00:00Z", low, low_threshold: rs(100_000),
});
const WALLETS = { wallets: [
  wallet("ag-1", "Karachi Travels", 90_000, true),
  wallet("ag-2", "Al Noor International Travel and Tours Private Limited (Gulberg Branch)", 453_000, false),
], total_balance: rs(543_000), low_count: 1 };
const STATEMENT = { wallet: WALLETS.wallets[1], entries: [
  { at: "2026-11-21T05:00:00Z", kind: "deposit", amount: rs(500_000), balance_after: rs(500_000), reference: "IBFT-998877", account: "Meezan Bank" },
  { at: "2026-11-22T05:00:00Z", kind: "adjustment", amount: rs(-47_000), balance_after: rs(453_000), reason: "Ticket TRV-SF1234 charged to the agency" },
] };
const answer = (path: string) => path === "/v1/admin/finance/agency-wallets" ? WALLETS
  : path.startsWith("/v1/admin/finance/agency-wallets/") ? STATEMENT : undefined;

for (const width of [1440, 768, 390]) {
  test(`wallets at ${width}px`, async ({ page }) => {
    await openAdmin(page, "/admin/wallet", width, answer);
    if (!BEFORE) await expect(page.getByText("Rs 90,000").first()).toBeVisible();
    await shot(page, `wallets-${width}`);
    if (BEFORE) return;
    expect(await overflow(page)).toBe(0);
    await expectReadableText(page, `wallets at ${width}px`);
  });
}

test("wallet statement at 390px", async ({ page }) => {
  test.skip(BEFORE);
  await openAdmin(page, "/admin/wallet", 390, answer);
  await page.getByRole("button", { name: /Al Noor International.* statement/ }).locator("visible=true").first().click();
  await expect(page.getByRole("dialog")).toContainText("IBFT-998877");
  await shot(page, "wallet-statement-390");
});
