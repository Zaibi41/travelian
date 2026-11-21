import { expect, test, type Page } from "@playwright/test";
import { gatewayView } from "./support/gateway";

// #54: every booking alert in Admin → Notifications opens that booking's detail page, not the Bookings list.
// Local-only session and intercepted gateway responses.
if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });

const ALERTS = [
  { kind: "paid_not_issued", ref: "TRV-RED001", title: "RED ALERT: paid, no ticket — TRV-RED001", urgent: true },
  { kind: "hold_created", ref: "TRV-HLD002", title: "Seats held: TRV-HLD002", urgent: false },
  { kind: "book_only_hold", ref: "TRV-BKO003", title: "Held (Book Only) — no payment yet: TRV-BKO003", urgent: false },
  { kind: "paid_issuance_pending", ref: "TRV-PAY004", title: "Paid by card: issuance pending: TRV-PAY004", urgent: false },
  { kind: "customer_email_failed", ref: "TRV-EML005", title: "Email not sent: TRV-EML005", urgent: false },
];

const detail = (ref: string) => ({
  source: "gateway_bookings", booking_id: ref, pnr: "ABC123", product: "flight", customer_or_agency: "Test Customer",
  statuses: { booking: "held", payment: "unpaid", issuance: "not_issued" }, amount: { amount_minor: 1_000_000, currency: "PKR" },
  created_at: "2026-11-20T10:00:00Z", passengers: [], audit: [], sections_not_available: ["itinerary", "payments", "tickets", "servicing"],
});

const row = (ref: string) => ({ booking_id: ref, pnr: `P${ref.slice(-5)}`, product: "flight", customer_or_agency: "Test Customer",
  statuses: { booking: "held", payment: "unpaid", issuance: "not_issued" }, amount: { amount_minor: 1_000_000, currency: "PKR" },
  created_at: "2026-11-20T10:00:00Z" });

async function mock(page: Page) {
  const listCalls: string[] = [];
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (url.port === "8000") {
      if (url.pathname === "/v1/admin/notifications") {
        return route.fulfill({ json: { email_enabled: true, items: ALERTS.map((alert, index) => ({
          id: `n${index}`, kind: alert.kind, reference: alert.ref, title: alert.title, urgent: alert.urgent, emailed: true,
          created_at: `2026-11-20T10:0${index}:00Z`, details: { reference: alert.ref, passenger: "Test Customer", route: "LHE-KHI" },
        })) } });
      }
      const match = url.pathname.match(/^\/v1\/admin\/bookings\/(TRV-[A-Z0-9]+)$/);
      if (match) return route.fulfill({ json: detail(match[1]) });
      if (url.pathname === "/v1/admin/bookings") {
        listCalls.push(url.search);
        // Searches by booking ID or PNR, like the gateway; no search lists every booking.
        const q = url.searchParams.get("q")?.toUpperCase();
        const all = ALERTS.map(alert => row(alert.ref));
        const items = q ? all.filter(item => item.booking_id.includes(q) || item.pnr === q) : all;
        return route.fulfill({ json: { source: "gateway_bookings", total: items.length, items, filter_options: { agencies: [], providers: [] },
          cards: { all_bookings: items.length, confirmed: 0, on_hold: items.length, cancelled: 0, unpaid: items.length, expiring_soon: 0,
            expiring_window_hours: 2, hold_deadlines: 0, awaiting_issuance: 0 } } });
      }
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return ["localhost", "127.0.0.1"].includes(url.hostname) ? route.continue() : route.fulfill({ json: {} });
  });
  await page.addInitScript(() => localStorage.setItem("travelian.session.v1", JSON.stringify({
    email: "layout-test@travelian.com", groups: ["super_admin"], name: "Layout Test", createdAt: new Date().toISOString(),
    accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
  })));
  return listCalls;
}

for (const alert of ALERTS) {
  test(`${alert.kind} alert opens /admin/bookings/${alert.ref}`, async ({ page }) => {
    await mock(page);
    await page.goto("/admin/notifications");
    await page.reload(); // the report: after a hard refresh
    await page.getByRole("link", { name: alert.title }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/bookings/${alert.ref}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("PNR ABC123"); // the detail page, not the list
  });
}

test("an old alert link /admin/bookings?search=REF opens that booking's detail page", async ({ page }) => {
  await mock(page);
  await page.goto("/admin/bookings?search=TRV-BKO003");
  await expect(page).toHaveURL(/\/admin\/bookings\/TRV-BKO003$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("PNR ABC123");
});

test("?search= that isn't exactly one booking ID stays on the filtered list", async ({ page }) => {
  await mock(page);
  await page.goto("/admin/bookings?search=TRV");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bookings");
  await expect(page.getByRole("textbox", { name: "Search", exact: true })).toHaveValue("TRV");
  await page.goto("/admin/bookings?search=PKO003"); // a PNR, not a booking ID: filtered list
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bookings");
  await expect(page.getByRole("link", { name: "View booking PKO003" })).toBeVisible();
});

test("a search typed on the Bookings page filters the list and stays in the URL", async ({ page }) => {
  const calls = await mock(page);
  await page.goto("/admin/bookings");
  await expect(page.getByRole("link", { name: /^View booking / })).toHaveCount(ALERTS.length);
  const box = page.getByRole("textbox", { name: "Search", exact: true });
  await box.fill("TRV-HLD002");
  await box.press("Enter");
  await expect(page).toHaveURL(/[?&]q=TRV-HLD002/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bookings"); // a manual exact search stays a list
  await expect(page.getByRole("link", { name: /^View booking / })).toHaveCount(1);
  expect(calls.some(call => call.includes("q=TRV-HLD002"))).toBe(true);
});
