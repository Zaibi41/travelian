import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// #73: Finance → Wallets and Payments ran on fake data kept in the browser. Until #68/#69 they show a notice, the
// fake data is gone (and its old browser keys are cleared), and the menu marks them "Coming soon".
// FINANCE_SHOTS=before only takes the before screenshots.

if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
const BEFORE = process.env.FINANCE_SHOTS === "before";
const SHOTS = process.env.FINANCE_SHOTS_DIR;
const OLD_KEYS = ["travelian:wallet-ledger", "travelian:wallet-deposits", "travelian:payment-webhook-events"];

async function open(page: Page, path: string, width: number, role = "admin") {
  await page.setViewportSize({ width, height: 900 });
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (isGateway(url)) return route.fulfill({ status: 404, json: { detail: "Not found." } });
    return isLocal(url) ? route.continue() : route.fulfill({ json: {} });
  });
  await page.addInitScript(([role, keys]) => {
    localStorage.setItem("travelian.session.v1", JSON.stringify({
      email: "layout-test@travelian.com", groups: [role], name: "Layout Test", createdAt: new Date().toISOString(),
      accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
    }));
    // What an older version left behind in this browser.
    if (!sessionStorage.getItem("seeded")) {
      sessionStorage.setItem("seeded", "1");
      for (const key of keys as string[]) localStorage.setItem(key, JSON.stringify([{ ledgerId: "L1", agencyId: "A1", amount: 125000 }]));
    }
  }, [role, OLD_KEYS] as const);
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

const shot = async (page: Page, name: string) => {
  if (!SHOTS) return;
  await page.waitForTimeout(800); // let the page fade-in and menu animation finish
  await page.screenshot({ path: `${SHOTS}/${BEFORE ? "before" : "after"}-${name}.png` });
};

for (const width of [1440, 390]) {
  // Payments is built (#69, e2e/finance-payments.spec.ts); Wallets keeps the notice until #68.
  for (const [path, name, heading] of [["/admin/wallet", "wallets", "Wallets"]] as const) {
    test(`${path} at ${width}px: a not-built notice, no fake numbers`, async ({ page }) => {
      await open(page, path, width);
      await shot(page, `${name}-${width}`);
      if (BEFORE) return;
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
      const main = page.locator("main");
      await expect(main.getByText("Not built yet.")).toBeVisible();
      await expect(main).toContainText("Supplier balances: see #68");
      await expect(main).toContainText("All payments: see #69");
      await expect(main).toContainText("Each booking's Payments tab shows real payments.");
      await expect(main.getByRole("link", { name: "Go to Bookings" })).toHaveAttribute("href", "/admin/bookings");
      await expect(main).not.toContainText(/Rs\s?[\d,]+|\$\s?[\d,]+|PKR\s?[\d,]+/); // no money on the page
      await expect(page.getByRole("link", { name: /Wallet balance/ })).toHaveCount(0); // nor the header's Wallet chip
      expect(await page.evaluate(keys => keys.filter(key => localStorage.getItem(key) !== null), OLD_KEYS)).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    });
  }
}

test("the Finance menu keeps Wallets marked Coming soon; Payments is built", async ({ page }) => {
  await open(page, "/admin/wallet", 1440, "super_admin");
  const finance = page.getByRole("button", { name: /^Finance/ });
  await finance.waitFor();
  if (await finance.getAttribute("data-state") !== "open") await finance.click();
  await expect(finance).toHaveAttribute("data-state", "open");
  await shot(page, "menu-1440");
  if (BEFORE) return;
  await expect(page.getByRole("link", { name: "Wallets Coming soon" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Payments", exact: true })).toBeVisible(); // built (#69): no tag
  await expect(page.getByRole("link", { name: "Accounts & Ledgers", exact: true })).toBeVisible(); // built: no tag
});
