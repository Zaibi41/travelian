import { expect, test } from "@playwright/test";
import { BEFORE, openAdmin, overflow, shot } from "./support/finance";
import { IMPORTS, LINES, MISMATCHES } from "./support/recon-fixture";
import { expectReadableText } from "./support/type-scale";

// travelian#71: Finance > Reconciliation. Made-up data; before = live site (placeholder).
if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
if (process.env.FINANCE_BASE_URL) test.use({ baseURL: process.env.FINANCE_BASE_URL });

const answer = (path: string) => path === "/v1/admin/finance/reconciliation/mismatches" ? MISMATCHES
  : path === "/v1/admin/finance/reconciliation/imports" ? IMPORTS : path.endsWith("/lines") ? LINES : undefined;

for (const width of [1440, 768, 390]) {
  test(`reconciliation at ${width}px`, async ({ page }) => {
    await openAdmin(page, BEFORE ? "/admin/roadmap/reconciliation" : "/admin/finance/reconciliation", width, answer);
    if (!BEFORE) await expect(page.getByText("PayFast amount differs")).toBeVisible();
    await shot(page, `reconciliation-${width}`);
    if (BEFORE) return;
    expect(await overflow(page)).toBe(0);
    await expectReadableText(page, `reconciliation at ${width}px`);
  });
}

test("bank statement lines at 390px", async ({ page }) => {
  test.skip(BEFORE);
  await openAdmin(page, "/admin/finance/reconciliation?tab=bank", 390, answer);
  await page.locator("main").getByRole("button", { name: "Open", exact: true }).click();
  await expect(page.getByRole("button", { name: "Confirm" })).toBeVisible();
  await shot(page, "reconciliation-bank-lines-390");
});
