import { expect, test, type Page } from "@playwright/test";
import { gatewayView } from "./support/gateway";

// Visual regression for the shared design system (docs/design-system.md): the main public pages
// and the main admin screens at 1280, 1440 and 390px. A change that breaks the shared look (a
// token, a shared component) shows up as a pixel difference here. Update the baselines only for
// an intended change: `npx playwright test e2e/visual.spec.ts --update-snapshots`, then review
// the new images before committing them.
//
// Deterministic: fixed clock, animations off, every request outside this machine answered
// locally, made-up gateway answers (no real data), web fonts blocked (system fallback fonts,
// the same on every run).
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

const NOW = new Date("2026-11-11T10:00:00+05:00");
const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });

const SUMMARY = {
  source: "gateway_bookings", contains_sample_data: false, generated_at: "2026-11-11T05:00:00Z",
  needs_action: { pending_issuance: 2, payment_pending: 0, expiring_holds: 1, expiring_window_hours: 2 },
  business: { total_bookings: 42, issued_tickets: 30, total_sales: [rs(1_284_500)], gross_profit: [rs(96_400)] },
};
const REPORT = { granularity: "day", timezone: "Asia/Karachi", buckets: [
  { start: "2026-11-05", bookings: 4, issued: 3 }, { start: "2026-11-06", bookings: 6, issued: 5 }, { start: "2026-11-07", bookings: 2, issued: 2 },
  { start: "2026-11-08", bookings: 7, issued: 4 }, { start: "2026-11-09", bookings: 5, issued: 5 }, { start: "2026-11-10", bookings: 3, issued: 1 },
] };
const ATTENTION = { total: 1, items: [{ booking_id: "b1", type: "hold_expiring", reference: "GROUP-LHE-JED-ZAMZAM-TOWERS-35PAX-REF-0001" }] };
const FILTERS = { products: [{ value: "flight", label: "Flights" }], providers: [] };
const BOOKINGS = {
  source: "gateway_bookings", total: 2,
  cards: { all_bookings: 2, confirmed: 1, on_hold: 1, cancelled: 0, unpaid: 1, expiring_soon: 0, expiring_window_hours: 24, hold_deadlines: 1, awaiting_issuance: 0 },
  filter_options: { agencies: [], providers: [] },
  items: [
    { booking_id: "TRV-PE49ZP", pnr: "CAEDEC", product: "flight", statuses: { booking: "held", payment: "unpaid", issuance: "not_issued" },
      amount: rs(15_316), created_at: "2026-11-09T13:28:58Z", expires_at: "2026-11-11T12:00:00+05:00", customer_or_agency: "Muhammad Abdullah Rehmanullah Khan Durrani" },
    { booking_id: "TRV-QK21MA", pnr: "XKQ2LM", product: "flight", statuses: { booking: "confirmed", payment: "paid", issuance: "issued" },
      amount: rs(48_900), created_at: "2026-11-08T09:12:00Z", customer_or_agency: "Ayesha Siddiqui" },
  ],
};
const PEOPLE = { can_manage: true, can_merge: true, results: [
  { id: "p-00000001", title: "MR", first_name: "Muhammad Abdullah Rehman", last_name: "Rehmanullah Khan Durrani", birth_year: 1990, nationality: "PAK",
    phone_masked: "+92 •••••••567", email_masked: "a•••@example.invalid", documents: [{ id: "d-1", id_type: "PSPT", document_country: "PAK", document_number_masked: "••••••567", document_validity: "valid" }],
    last_booking_at: "2026-11-09T13:28:58Z", match: "name" },
  { id: "p-00000002", title: "MS", first_name: "Ayesha", last_name: "Siddiqui", birth_year: 1994, phone_masked: "+92 •••••••111", documents: [], match: "name" },
] };
const ticket = (id: string, sector: string, count = 1) => Array.from({ length: count }, (_, index) => ({
  id: `${id}-${index}`, sector, departure_date: "2026-11-24", departure_time: "09:45", airline: "Airblue",
  selling_price: rs(99_750), remaining: 9, baggage: "20 KG",
}));
const INVENTORY = { data: [{ id: "g1", sector: "mixed", airline: "Airblue", tickets: [
  ...ticket("a", "LHE - JED", 5), ...ticket("b", "ISB - JED", 4), ...ticket("c", "KHI - JED", 3), ...ticket("d", "LHE - MED", 2),
] }] };

const GATEWAY: Record<string, unknown> = {
  "/v1/admin/dashboard/summary": SUMMARY,
  "/v1/admin/dashboard/booking-report": REPORT,
  "/v1/admin/attention-queue": ATTENTION,
  "/v1/admin/dashboard/filter-options": FILTERS,
  "/v1/admin/bookings": BOOKINGS,
  "/v1/admin/customers": PEOPLE,
  "/v1/group-ticketing/inventory": INVENTORY,
};

async function open(page: Page, width: number, path: string, signedIn: boolean) {
  await page.setViewportSize({ width, height: 900 });
  await page.clock.setFixedTime(NOW);
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (url.port === "8000") {
      const body = GATEWAY[url.pathname];
      return body ? route.fulfill({ json: body }) : route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    if (["localhost", "127.0.0.1"].includes(url.hostname)) return route.continue();
    if (route.request().resourceType() === "font" || url.hostname.includes("fonts.")) return route.fulfill({ status: 404, body: "" });
    return route.fulfill({ json: { items: [], groups: [], results: [] } });
  });
  if (signedIn) {
    await page.addInitScript(() => localStorage.setItem("travelian.session.v1", JSON.stringify({
      email: "layout-test@travelian.com", name: "Layout Test", createdAt: new Date().toISOString(),
      accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
    })));
  }
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  // Let late layout (lazy routes, measured search heights) settle.
  await page.waitForTimeout(400);
}

async function snap(page: Page, name: string) {
  await expect(page).toHaveScreenshot(name, {
    fullPage: true, animations: "disabled", caret: "hide", maxDiffPixels: 0, threshold: 0, timeout: 15_000,
    // Running marquees and the live expiry countdown move on their own; they are not layout.
    // threshold 0: any colour change counts (the default 0.2 lets small shifts through).
    mask: [page.locator(".animate-route-marquee"), page.locator(".admin-announcement-scroll")],
    // The floating WhatsApp bubble (pulse, shadow, blur over moving content) is hidden.
    stylePath: "e2e/support/visual.css",
  });
}

const PUBLIC = [
  ["home-flights", "/"],
  ["home-group-ticketing", "/group-ticketing"],
  ["home-hotels", "/hotels-search"],
  ["home-umrah", "/umrah-packages"],
  ["signin", "/signin"],
  ["register", "/register"],
] as const;

const ADMIN = [
  ["admin-dashboard", "/admin"],
  ["admin-search-flights", "/admin/search?tab=flights"],
  ["admin-search-group-ticketing", "/admin/search?tab=group-ticketing"],
  ["admin-search-hotels", "/admin/search?tab=hotels"],
  ["admin-search-umrah", "/admin/search?tab=umrah"],
  ["admin-bookings", "/admin/bookings"],
  ["admin-customers", "/admin/customers"],
] as const;

for (const width of [1280, 1440, 390]) {
  test.describe(`${width}px`, () => {
    for (const [name, path] of PUBLIC) {
      test(`public ${name}`, async ({ page }) => {
        test.setTimeout(60_000);
        await open(page, width, path, false);
        await snap(page, `${name}-${width}.png`);
      });
    }
    // The admin sign-in is the public sign-in page (/signin); "public signin" covers it.
    for (const [name, path] of ADMIN) {
      test(`admin ${name}`, async ({ page }) => {
        test.setTimeout(60_000);
        await open(page, width, path, true);
        await snap(page, `${name}-${width}.png`);
      });
    }
  });
}
