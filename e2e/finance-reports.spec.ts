import { expect, test } from "@playwright/test";
import { BEFORE, openAdmin, overflow, shot } from "./support/finance";
import { REPORT } from "./support/report-fixture";
import { expectReadableText } from "./support/type-scale";

// travelian#70: Reports (sales, profit, receivables, refunds due, supplier spend, payments by method). Made-up data.
if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
if (process.env.FINANCE_BASE_URL) test.use({ baseURL: process.env.FINANCE_BASE_URL });

for (const width of [1440, 768, 390]) {
  test(`reports at ${width}px`, async ({ page }) => {
    await openAdmin(page, "/admin/reports", width, path => path === "/v1/admin/finance/reports" ? REPORT : undefined);
    if (!BEFORE) await expect(page.getByText("Rs 421,300").first()).toBeVisible();
    await shot(page, `reports-${width}`);
    if (BEFORE) return;
    expect(await overflow(page)).toBe(0);
    await expectReadableText(page, `reports at ${width}px`);
  });
}
