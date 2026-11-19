import { expect, test, type Page } from "@playwright/test";
import { gatewayView } from "./support/gateway";

// Finance > Accounts & Ledgers, "Bank and cash book" (receiving accounts). Local-only session and
// made-up gateway answers; nothing reaches a real gateway.
if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });

const LONG = "Meezan Bank, Travelian current account for Umrah and group ticketing collections, Gulberg branch Lahore";
const ACCOUNTS = [
  { id: "a-1", method: "bank_transfer", label: LONG, active: true },
  { id: "a-2", method: "bank_transfer", label: "HBL collections", active: false },
  { id: "a-3", method: "jazzcash", label: "JazzCash business wallet", active: true },
];

async function open(page: Page, width: number, query = "") {
  await page.setViewportSize({ width, height: 900 });
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (url.port === "8000") {
      if (url.pathname === "/v1/admin/finance/payment-accounts" && route.request().method() === "GET") return route.fulfill({ json: { accounts: ACCOUNTS } });
      if (url.pathname === "/v1/admin/finance/payment-accounts") {
        return route.fulfill({ status: 422, json: { detail: "The account name must be 2 to 120 characters." } });
      }
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return ["localhost", "127.0.0.1"].includes(url.hostname) ? route.continue() : route.fulfill({ json: {} });
  });
  await page.addInitScript(() => localStorage.setItem("travelian.session.v1", JSON.stringify({
    email: "layout-test@travelian.com", groups: ["super_admin"], name: "Layout Test", createdAt: new Date().toISOString(),
    accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
  })));
  await page.goto(`/admin/finance/accounts-ledgers${query}`);
  await expect(page.getByRole("heading", { level: 1, name: "Accounts & Ledgers" })).toBeVisible();
}

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const shot = (width: number, name: string) => process.env.SHOT_DIR ? { path: `${process.env.SHOT_DIR}/accounts-${width}-${name}.png`, animations: "disabled" as const } : {};

for (const width of [1440, 1024, 768, 390]) {
  test(`list, long name and dialogs fit at ${width}px`, async ({ page }) => {
    await open(page, width);
    await expect(page.getByText("3 accounts, 2 active")).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    const name = page.getByText(LONG).filter({ visible: true });
    await expect(name).toHaveAttribute("title", LONG);
    const box = await name.evaluate(el => ({ scroll: el.scrollWidth, client: el.clientWidth, style: getComputedStyle(el) }))
      .then(({ scroll, client, style }) => ({ scroll, client, ellipsis: style.textOverflow === "ellipsis" && style.whiteSpace === "nowrap" }));
    expect(box.ellipsis).toBe(true);                                  // one line, ellipsis when it doesn't fit
    if (width <= 1024) expect(box.scroll).toBeGreaterThan(box.client);
    await expect(page.getByRole("table")).toBeVisible({ visible: width >= 640 });
    await page.screenshot(shot(width, "list"));

    await page.getByRole("button", { name: "Add account" }).click();
    const add = page.getByRole("dialog", { name: "Add account" });
    await add.getByLabel("Account name").fill("a");
    await add.getByRole("button", { name: "Save account" }).click();
    await expect(add.getByRole("alert")).toHaveText("The account name must be 2 to 120 characters.");
    const dialogBox = (await add.boundingBox())!;
    expect(dialogBox.y).toBeGreaterThanOrEqual(0);
    expect(dialogBox.y + dialogBox.height).toBeLessThanOrEqual(900);
    expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(width);
    await page.screenshot(shot(width, "add"));
    await page.keyboard.press("Escape");
    await expect(add).toHaveCount(0);

    await page.getByRole("button", { name: `Deactivate ${LONG}` }).filter({ visible: true }).click();
    const confirm = page.getByRole("dialog", { name: "Deactivate account?" });
    await expect(confirm.getByRole("button", { name: "Deactivate account" })).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    await page.screenshot(shot(width, "deactivate"));
  });
}

test("Finance in the sidebar ends with Accounts & Ledgers, active on this page", async ({ page }) => {
  await open(page, 1440, "?method=1link");
  await expect(page.getByText("No 1Link account is set up yet.")).toBeVisible();
  const links = (await page.getByRole("link").filter({ visible: true }).allInnerTexts()).map(text => text.trim());
  const at = links.indexOf("Reconciliation");
  expect(links.slice(at - 2, at + 2)).toEqual(["Wallets", "Payments", "Reconciliation", "Accounts & Ledgers"]);
  await page.screenshot(shot(1440, "empty"));
});
