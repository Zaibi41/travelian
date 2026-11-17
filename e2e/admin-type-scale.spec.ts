import { expect, test, type Page } from "@playwright/test";
import { gatewayView } from "./support/gateway";
import { expectReadableText } from "./support/type-scale";

// One type scale across the admin: no text under 12px, labels and tables at least 13px, no
// sideways scroll. Pages not covered by their own specs (customers, booking detail and the hold
// flow call the same check there). Local-only session and intercepted gateway answers.
if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const SEARCH = {
  search_id: "s-e2e", expires_at: new Date(Date.now() + 15 * 60_000).toISOString(), status: "complete", providers: [{ name: "southair", status: "responded" }],
  journeys: [{ direction: "outbound", origin: "LHE", destination: "KHI", flights: [{
    id: "f1", airline_code: "Z8", airline_name: "South Air International Regional Airways Limited", flight_number: "Z8266",
    departure_local: "2026-11-19T00:25", arrival_local: "2026-11-19T02:35", duration_minutes: 130, stops: 0, stop_cities: [],
    fares: [{ id: "x1", name: "EB", baggage: "20 kg checked baggage", meal: "Snacks", selling_price: rs(13_597) }],
  }] }],
};
const LIST = {
  source: "gateway_bookings", total: 1, sample_label: "Sample data",
  cards: { all_bookings: 1, confirmed: 0, on_hold: 1, cancelled: 0, unpaid: 1, expiring_soon: 0, expiring_window_hours: 24, hold_deadlines: 1, awaiting_issuance: 0 },
  filter_options: { agencies: [], providers: [] },
  items: [{ booking_id: "TRV-PE49ZP", pnr: "CAEDEC", product: "flight", statuses: { booking: "held", payment: "unpaid", issuance: "not_issued" },
    amount: rs(15_316), created_at: "2026-11-09T13:28:58Z", expires_at: new Date(Date.now() + 3_600_000).toISOString(), customer_or_agency: "Muhammad Abdullah Rehmanullah Khan Durrani" }],
};

async function open(page: Page, width: number, path: string) {
  await page.setViewportSize({ width, height: 900 });
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (url.port === "8000") {
      if (url.pathname === "/v1/live-ticketing/flights/search") return route.fulfill({ json: SEARCH });
      if (url.pathname === "/v1/admin/bookings") return route.fulfill({ json: LIST });
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return ["localhost", "127.0.0.1"].includes(url.hostname) ? route.continue() : route.fulfill({ json: {} });
  });
  await page.addInitScript(() => localStorage.setItem("travelian.session.v1", JSON.stringify({
    email: "layout-test@travelian.com", name: "Layout Test", createdAt: new Date().toISOString(),
    accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
  })));
  await page.goto(path);
}

const PAGES: [string, string, (page: Page) => Promise<void>][] = [
  ["Dashboard", "/admin", page => expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible()],
  ["Search Flights with results", "/admin/search?tab=flights&from=LHE&to=KHI&date=2026-11-19",
    page => expect(page.getByRole("region", { name: "Results" })).toContainText("Z8266")],
  ["Search Group Ticketing", "/admin/search?tab=group-ticketing", page => expect(page.getByRole("heading", { level: 1, name: "Search" })).toBeVisible()],
  ["Search Hotels", "/admin/search?tab=hotels", page => expect(page.getByRole("button", { name: "Search hotels" })).toBeVisible()],
  ["Bookings", "/admin/bookings", page => expect(page.getByRole("region", { name: "Bookings" })).toContainText("CAEDEC")],
  ["Customers & Travelers", "/admin/customers", page => expect(page.getByRole("heading", { level: 1, name: "Customers & Travelers" })).toBeVisible()],
];

for (const width of [1280, 1440]) {
  for (const [name, path, ready] of PAGES) {
    test(`${name}: type scale at ${width}px`, async ({ page }) => {
      await open(page, width, path);
      await ready(page);
      await expectReadableText(page, `${name} at ${width}px`);
    });
  }
  test(`sign-in: type scale at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/signin?redirect=%2Fadmin&reason=expired");
    await expect(page.getByRole("heading", { name: "Sign in to Travelian" })).toBeVisible();
    await expectReadableText(page, `sign-in at ${width}px`);
  });
  test(`dialog and account menu: type scale at ${width}px`, async ({ page }) => {
    await open(page, width, "/admin/customers");
    await page.getByRole("button", { name: "Add Customer" }).click();
    await expect(page.getByRole("dialog", { name: "Add Customer" })).toBeVisible();
    await expectReadableText(page, `Add Customer dialog at ${width}px`);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Open account menu" }).click();
    await expect(page.getByRole("menu")).toBeVisible();
    await expectReadableText(page, `account menu at ${width}px`);
  });
}
