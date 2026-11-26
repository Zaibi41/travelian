import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// #13: the Dashboard tracker of paid group bookings still waiting for the supplier's final PNR. Local-only session and
// intercepted gateway answers (made-up values). TRACKER_SHOTS_DIR saves screenshots; TRACKER_SHOTS=before only takes
// them (origin/main has no tracker).
if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
const SHOTS = process.env.TRACKER_SHOTS_DIR;
const BEFORE = process.env.TRACKER_SHOTS === "before";

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const SUMMARY = {
  source: "gateway_bookings", contains_sample_data: false, generated_at: "2026-11-22T07:00:00Z",
  needs_action: { pending_issuance: 2, payment_pending: 0, expiring_holds: 1, expiring_window_hours: 2, unknown_issuance: 1 },
  business: { total_bookings: 42, held: 7, paid: 31, issued_tickets: 30, total_sales: [rs(1_284_500)], gross_profit: [rs(96_400)] },
};
const TRACKER = { window_hours: 48, total: 3, departs_soon: 1, items: [
  { booking_id: "TRV-GRP-000123", departure_at: "2026-11-23T18:30:00+05:00", departs_soon: true, route: "LHE → MCT → JED", airline_name: "SalamAir",
    flight_number: "OV522", customer_or_agency: "Muhammad Abdullah Rehman Rehmanullah Khan Durrani Travel and Tours International" },
  { booking_id: "TRV-GRP-000124", departure_at: "2026-12-20T03:25:00+05:00", departs_soon: false, route: "ISB → DMM",
    airline_name: "South Air International Regional Airways Limited", flight_number: "Z8266", customer_or_agency: "Sana Raza" },
  { booking_id: "TRV-GRP-000125", departs_soon: false },
] };

async function open(page: Page, width: number, tracker: unknown) {
  await page.setViewportSize({ width, height: 900 });
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (isGateway(url)) {
      const answers: Record<string, unknown> = {
        "/v1/admin/dashboard/summary": SUMMARY,
        "/v1/admin/dashboard/booking-report": { granularity: "day", timezone: "Asia/Karachi", buckets: [{ start: "2026-11-20", bookings: 4, issued: 3 }] },
        "/v1/admin/attention-queue": { total: 0, items: [] },
        "/v1/admin/dashboard/filter-options": { products: [{ value: "group", label: "Group" }], providers: [] },
      };
      if (url.pathname === "/v1/admin/flight-operations/group-bookings-awaiting-final-pnr" && tracker) return route.fulfill({ json: tracker });
      if (answers[url.pathname]) return route.fulfill({ json: answers[url.pathname] });
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return isLocal(url) ? route.continue() : route.fulfill({ json: {} });
  });
  await page.addInitScript(() => localStorage.setItem("travelian.session.v1", JSON.stringify({
    email: "layout-test@travelian.com", groups: ["super_admin"], name: "Layout Test", createdAt: new Date().toISOString(),
    accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
  })));
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Bookings needing action" })).toBeVisible({ timeout: 20_000 });
}

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const width of [1440, 1024, 768, 390]) {
  test(`dashboard tracks paid group bookings awaiting the final PNR at ${width}px`, async ({ page }) => {
    await open(page, width, TRACKER);
    const tracker = page.getByRole("region", { name: "Group bookings awaiting final PNR" });
    if (BEFORE) {
      await page.waitForTimeout(1500);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/before-dashboard-${width}.png`, fullPage: true });
      return;
    }
    await expect(tracker).toBeVisible();
    await tracker.scrollIntoViewIfNeeded();
    if (SHOTS) {
      await page.screenshot({ path: `${SHOTS}/after-dashboard-${width}.png`, fullPage: true });
      await tracker.screenshot({ path: `${SHOTS}/after-tracker-${width}.png` });
    }
    await expect(tracker).toContainText("3 bookings");
    await expect(tracker).toContainText("1 due within 48 hours");
    const rows = tracker.getByRole("row");
    await expect(rows).toHaveCount(4);
    await expect(rows.nth(1).getByRole("link")).toHaveAttribute("href", "/admin/bookings/TRV-GRP-000123/tickets");
    await expect(rows.nth(1)).toContainText("Due now");
    await expect(rows.nth(2)).toContainText("Awaiting");
    await expect(rows.nth(3)).toContainText("Not recorded");
    expect(await overflow(page)).toBe(0);
    // Long names stay in their cell (ellipsis), never widening the page.
    const cell = rows.nth(1).getByRole("cell").nth(4);
    const box = await cell.boundingBox();
    expect(box!.height).toBeLessThan(60);
  });
}

test("no tracker when the gateway has no such list yet (endpoint not deployed)", async ({ page }) => {
  test.skip(BEFORE);
  await open(page, 1440, null);
  await expect(page.getByRole("heading", { name: "Attention Queue" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Group bookings awaiting final PNR" })).toHaveCount(0);
});

test("a real zero shows the green Fine stripe", async ({ page }) => {
  test.skip(BEFORE);
  await open(page, 390, { window_hours: 48, total: 0, departs_soon: 0, items: [] });
  const tracker = page.getByRole("region", { name: "Group bookings awaiting final PNR" });
  await expect(tracker).toContainText("Fine");
  await expect(tracker).toContainText("No paid group booking is waiting for its final PNR.");
  if (SHOTS) await tracker.screenshot({ path: `${SHOTS}/after-tracker-zero-390.png` });
});
