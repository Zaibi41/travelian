import { expect, test } from "@playwright/test";
import { BEFORE, openAdmin, overflow, rs, shot } from "./support/finance";
import { expectReadableText } from "./support/type-scale";

// travelian#68: Finance > Wallets (supplier balances). Made-up balances; before = live site.
if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
if (process.env.FINANCE_BASE_URL) test.use({ baseURL: process.env.FINANCE_BASE_URL });

const WALLETS = { wallets: [
  { provider_id: "southair", name: "Southair", mode: "api", balance: rs(90_000), as_of: "2026-11-21T06:00:00Z", threshold: rs(100_000), low: true },
  { provider_id: "sooperfare", name: "SooperFare", mode: "calculated", balance: rs(453_000), as_of: "2026-11-21T05:00:00Z",
    tracking_since: "2026-11-01T05:00:00Z", threshold: rs(200_000), low: false },
] };
const HISTORY = { items: [
  { at: "2026-11-21T05:00:00Z", kind: "ticket", amount: rs(-45_770), booking_reference: "TRV-SF1234" },
  { at: "2026-11-20T05:00:00Z", kind: "adjustment", amount: rs(-1_230), reason: "SooperFare portal shows a lower balance after a platform fee" },
  { at: "2026-11-01T05:00:00Z", kind: "top_up", amount: rs(500_000), reference: "IBFT-998877" },
] };
const answer = (path: string) => path === "/v1/admin/finance/supplier-balances" ? WALLETS
  : path.endsWith("/history") ? HISTORY : undefined;

for (const width of [1440, 768, 390]) {
  test(`wallets at ${width}px`, async ({ page }) => {
    await openAdmin(page, "/admin/wallet", width, answer);
    if (!BEFORE) await expect(page.getByText("Rs 90,000")).toBeVisible();
    await shot(page, `wallets-${width}`);
    if (BEFORE) return;
    expect(await overflow(page)).toBe(0);
    await expectReadableText(page, `wallets at ${width}px`);
  });
}

test("wallet history at 390px", async ({ page }) => {
  test.skip(BEFORE);
  await openAdmin(page, "/admin/wallet", 390, answer);
  await page.getByRole("button", { name: "History" }).nth(1).click();
  await expect(page.getByRole("dialog")).toContainText("TRV-SF1234");
  await shot(page, "wallet-history-390");
});
