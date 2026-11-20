import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";
import { expectReadableText } from "./support/type-scale";

// Bookings > Group Ticketing: group bookings in the Flights layout. Local-only session and intercepted gateway responses.
if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const LIST = {
  source: "gateway_bookings", contains_sample_data: false,
  cards: { all_bookings: 2, confirmed: 1, on_hold: 1, cancelled: 0, unpaid: 1, expiring_soon: 0, expiring_window_hours: 2, hold_deadlines: 1 },
  filter_options: { agencies: [], providers: [{ value: "dhillu", label: "Dhillu And Sahi Travel Group Ticketing Supplier Lahore" }] },
  total: 2, limit: 50, offset: 0,
  items: [
    { booking_id: "TRV-GRP-000123", pnr: "GRPABC", product: "group", customer_or_agency: "Karachi Travels",
      provider: "Dhillu And Sahi Travel Group Ticketing Supplier Lahore", statuses: { booking: "held", payment: "unpaid", issuance: "not_issued" },
      amount: rs(250_000), created_at: "2026-11-15T09:00:00Z", expires_at: "2099-11-20T09:00:00Z", sample: false },
    { booking_id: "TRV-GRP-000124", pnr: null, product: "group", customer_or_agency: "Lahore Tours",
      statuses: { booking: "confirmed", payment: "paid", issuance: "not_issued" },
      amount: rs(120_000), created_at: "2026-11-14T09:00:00Z", expires_at: null, sample: false },
  ],
};

async function open(page: Page, width: number) {
  const products: (string | null)[] = [];
  await page.setViewportSize({ width, height: 900 });
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (isGateway(url)) {
      if (url.pathname === "/v1/admin/bookings") {
        products.push(url.searchParams.get("product"));
        return route.fulfill({ json: LIST });
      }
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return isLocal(url) ? route.continue() : route.fulfill({ json: {} });
  });
  await page.addInitScript(() => localStorage.setItem("travelian.session.v1", JSON.stringify({
    email: "layout-test@travelian.com", groups: ["super_admin"], name: "Layout Test", createdAt: new Date().toISOString(),
    accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
  })));
  await page.goto("/admin/bookings/group-ticketing");
  return products;
}

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const width of [1440, 1024, 768, 390]) {
  test(`group bookings list like Flights at ${width}px`, async ({ page }) => {
    const products = await open(page, width);
    const table = page.getByRole("region", { name: "Bookings" });
    await expect(table.getByRole("link", { name: "GRPABC", exact: true })).toBeVisible();
    await expect(table.getByRole("link", { name: "TRV-GRP-000124", exact: true })).toHaveAttribute("href", "/admin/bookings/TRV-GRP-000124");
    await expect(page.getByRole("link", { name: /^Hold deadlines:/ })).toBeVisible();
    expect(products).toContain("group");
    expect(await overflow(page)).toBe(0);
    await expectReadableText(page, `group bookings at ${width}px`);
    await page.screenshot({ path: `test-results/admin-bookings-group-${width}.png`, fullPage: true });
  });
}
