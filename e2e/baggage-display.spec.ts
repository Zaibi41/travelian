import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// #36: baggage shown the same way on the website results, the fare details, the public Baggage filter and the admin
// search. Intercepted gateway responses only. BAGGAGE_SHOTS=before replays what the gateway sent before #36 (for the
// before screenshots); by default it sends the gateway's new short form and full words.

if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
const BEFORE = process.env.BAGGAGE_SHOTS === "before";
const SHOTS = process.env.BAGGAGE_SHOTS_DIR;

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
// [old gateway text, new short, new full words]
const BAGS = {
  hand: ["No checked baggage, 7 kg hand carry", "7 kg", "7 kg hand carry only, no checked bag"],
  b20: ["20 kg checked, 7 kg hand carry", "7+20 kg", "7 kg hand carry + 20 kg checked"],
  b30: ["30 kg checked, 7 kg hand carry", "7+30 kg", "7 kg hand carry + 30 kg checked"],
  // Southair: 7 kg hand carry included (#36, owner 20 Nov 2026).
  sa20: ["20KG", "7+20 kg", "7 kg hand carry + 20 kg checked"],
  pc: ["1 PC 23KG", "7+1×23 kg", "7 kg hand carry + 1 checked piece of up to 23 kg"],
  none: [null, "Baggage: check with airline", "Baggage: check with airline"],
} as const;
type Bag = keyof typeof BAGS;

const fare = (id: string, name: string, bag: Bag, price: number) => {
  const [old, short, detail] = BAGS[bag];
  const baggage = BEFORE ? (old ? { baggage: old } : {}) : { baggage: short, baggage_detail: detail };
  return { id, name, ...baggage, selling_price: rs(price) };
};

const SEARCH = {
  search_id: "s-e2e", expires_at: new Date(Date.now() + 15 * 60_000).toISOString(), status: "complete",
  providers: [{ name: "southair", status: "responded" }],
  journeys: [{
    direction: "outbound", origin: "LHE", destination: "KHI",
    flights: [
      { id: "f1", airline_code: "PA", airline_name: "Airblue", flight_number: "PA401",
        departure_local: "2026-12-10T08:00", arrival_local: "2026-12-10T09:55", duration_minutes: 115, stops: 0, stop_cities: [],
        fares: [fare("a", "Value", "hand", 14_500), fare("b", "Flexi", "b20", 17_200), fare("c", "Xtra", "b30", 19_900)] },
      { id: "f2", airline_code: "Z8", airline_name: "South Air International Regional Airways Limited", flight_number: "Z8266",
        departure_local: "2026-12-10T13:25", arrival_local: "2026-12-10T15:35", duration_minutes: 130, stops: 1, stop_cities: ["MUX"],
        fares: [fare("d", "EV", "sa20", 15_671), fare("e", "EP", "pc", 18_300)] },
      { id: "f3", airline_code: "PF", airline_name: "AirSial", flight_number: "PF142",
        departure_local: "2026-12-10T19:10", arrival_local: "2026-12-10T21:05", duration_minutes: 115, stops: 0, stop_cities: [],
        fares: [fare("g", "Economy", "none", 16_100)] },
    ],
  }],
};

async function mock(page: Page) {
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (isGateway(url)) {
      if (url.pathname === "/v1/public/flights/search" || url.pathname === "/v1/live-ticketing/flights/search") return route.fulfill({ json: SEARCH });
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return isLocal(url) ? route.continue() : route.fulfill({ json: {} });
  });
}

const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${BEFORE ? "before" : "after"}-${name}.png`, fullPage: false });
};
const noSideScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

async function openPublic(page: Page, width: number) {
  await page.setViewportSize({ width, height: width < 600 ? 860 : 900 });
  await mock(page);
  await page.goto("/flights-search?from=LHE&to=KHI&depart=2026-12-10&trip=oneway&adults=1");
  await expect(page.locator("main").getByText("08:00", { exact: true }).locator("visible=true").first()).toBeVisible({ timeout: 20_000 });
}

for (const width of [1440, 390]) {
  test(`website results show baggage in the short form at ${width}px`, async ({ page }) => {
    await openPublic(page, width);
    await page.locator("main").getByText("08:00", { exact: true }).locator("visible=true").first().scrollIntoViewIfNeeded();
    await shot(page, `public-results-${width}`);
    if (BEFORE) return;
    expect(await noSideScroll(page)).toBe(0);
    const main = page.locator("main");
    for (const text of ["7 kg", "7+20 kg", "7+30 kg", "Check with airline"]) {
      await expect(main.getByText(text, { exact: true }).first()).toBeAttached();
    }
    // The old guess "7 KG" for a fare with no hand-carry value, and raw supplier codes, are gone.
    await expect(main.getByText(/^(7 KG|20KG|1 PC 23KG|Baggage info not available)$/)).toHaveCount(0);
    // Full words on hover (and for screen readers) on the fare shown first.
    await expect(main.locator('[title="7 kg hand carry only, no checked bag"]').locator("visible=true").first()).toBeVisible();
  });
}

test("website Baggage filter lists the fares' baggage, lightest first, and filters", async ({ page }) => {
  await openPublic(page, 1440);
  const filter = page.getByRole("group", { name: "Baggage" });
  if (BEFORE) return;
  await filter.scrollIntoViewIfNeeded();
  await shot(page, "public-filter-1440");
  const labels = await filter.getByRole("checkbox").evaluateAll(boxes => boxes.map(box => box.closest("label")?.textContent?.trim()));
  expect(labels).toEqual(["7 kg (hand carry only)", "7+20 kg", "7+1×23 kg", "7+30 kg", "Check with airline"]);
  await filter.getByRole("checkbox", { name: "7+20 kg" }).check();
  const main = page.locator("main");
  await expect(main.getByText("08:00", { exact: true }).locator("visible=true").first()).toBeVisible();
  await expect(main.getByText("13:25", { exact: true }).locator("visible=true")).toHaveCount(1); // Southair EV is 7+20 kg too
  await expect(main.getByText("19:10", { exact: true })).toHaveCount(0);
});

for (const width of [1440, 390]) {
  test(`admin search: baggage column and filter at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mock(page);
    await page.addInitScript(() => localStorage.setItem("travelian.session.v1", JSON.stringify({
      email: "layout-test@travelian.com", groups: ["super_admin"], name: "Layout Test", createdAt: new Date().toISOString(),
      accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
    })));
    await page.goto("/admin/bookings/new?tab=flights&from=LHE&to=KHI&date=2026-12-10");
    await expect(page.getByRole("region", { name: "Results" })).toBeVisible();
    await page.getByText("PA401").first().scrollIntoViewIfNeeded();
    await shot(page, `admin-results-${width}`);
    if (BEFORE) return;
    // At 390px the page already scrolls sideways by 19px with these results on main (before #36); not part of this change.
    if (width > 390) expect(await noSideScroll(page)).toBe(0);
    const results = page.getByRole("region", { name: "Results" });
    await expect(results.getByText("7+20 kg", { exact: true }).first()).toBeAttached();
    await expect(results.getByText("7 kg hand carry + 20 kg checked").first()).toBeAttached(); // screen readers get the words
  });
}
