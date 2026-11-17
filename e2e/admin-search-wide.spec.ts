import { expect, test, type Page } from "@playwright/test";
import { gatewayView } from "./support/gateway";
import { docsShot } from "./support/docs-shot";

// Admin Search (Flights and Group Ticketing) from a laptop to a 32-inch monitor: no sideways page scroll,
// the page is the only scroller (no inner scroll on results, filters or main), the content is at most
// 1600px wide and centred, and the search card, status line, filters and results share the same edges.
// 2048 and 3072 are 2560 and 3840 at 125% zoom. Gateway answers are local and made up.
if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const fare = (id: string, name: string, price: number) => ({ id, name, baggage: "20KG", selling_price: rs(price), supplier: "southair" });
const FLIGHTS = {
  search_id: "s-wide", expires_at: new Date(Date.now() + 15 * 60_000).toISOString(), status: "complete", providers: [{ name: "southair", status: "responded" }],
  journeys: [{
    direction: "outbound", origin: "LHE", destination: "KHI",
    flights: Array.from({ length: 6 }, (_, n) => ({
      id: `f${n}`, airline_code: "Z8", airline_name: n % 2 ? "South Air International Regional Airways Limited" : "South Air", flight_number: `Z8${266 + n}`,
      departure_local: `2026-11-19T${String(6 + n).padStart(2, "0")}:25`, arrival_local: `2026-11-19T${String(8 + n).padStart(2, "0")}:35`,
      duration_minutes: 130, stops: n % 3, stop_cities: n % 3 ? ["ISB", "MUX"].slice(0, n % 3) : [],
      fares: [fare(`a${n}`, "EB", 13_997 + n), fare(`b${n}`, "EV", 15_671 + n)],
    })),
  }],
};
const TICKETS = Array.from({ length: 6 }, (_, n) => ({
  id: `t${n}`, sector: "LHE - JED", departure_date: "2026-11-24", departure_time: "09:45", airline: n % 2 ? "A very long airline name used for truncation checks" : "Airblue",
  flight_number: `PA${470 + n}`, remaining: 12, baggage: "20", hand_carry: "7", meal: "Yes", selling_price: rs(168_000 + n), stock: "supplier", can_hold: true,
}));
const GROUP = { data: [{ id: "g1", sector: "LHE - JED", airline: "Airblue", tickets: TICKETS }] };

const SIZES: [number, number][] = [[1280, 800], [1366, 768], [1920, 1080], [2048, 1152], [2560, 1440], [3072, 1728], [3840, 2160]];
const DOCS = new Set(["1366x768", "1920x1080", "2560x1440", "3840x2160"]);

async function open(page: Page, width: number, height: number, url: string) {
  await page.setViewportSize({ width, height });
  await page.route("**/*", route => {
    const target = gatewayView(route.request().url());
    if (target.port === "8000") {
      if (target.pathname === "/v1/live-ticketing/flights/search") return route.fulfill({ json: FLIGHTS });
      if (target.pathname === "/v1/group-ticketing/inventory" || target.pathname === "/v1/group-ticketing/search") return route.fulfill({ json: GROUP });
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return ["localhost", "127.0.0.1"].includes(target.hostname) ? route.continue() : route.fulfill({ json: {} });
  });
  await page.addInitScript(() => localStorage.setItem("travelian.session.v1", JSON.stringify({
    email: "layout-test@travelian.com", name: "Layout Test", createdAt: new Date().toISOString(),
    accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
  })));
  await page.goto(url);
  await expect(page.getByRole("region", { name: "Results" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Results" }).getByRole("row").nth(1)).toBeVisible();
}

/** Page scroll sizes, the scroll containers inside <main>, and the left/right edges of the page's blocks. */
const measure = (page: Page) => page.evaluate(() => {
  const page = document.scrollingElement!;
  const main = document.querySelector("main")!;
  const scrollers = [main, ...main.querySelectorAll<HTMLElement>("*")].filter(element => {
    const style = getComputedStyle(element);
    return (/(auto|scroll)/.test(style.overflowX) && element.scrollWidth > element.clientWidth + 1)
      || (/(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 1);
  }).map(element => `${element.tagName.toLowerCase()}.${String(element.className).slice(0, 60)}`);
  /** [left, right] of the element (or of its parent: the page column around the h1, the grid around the filters). */
  const edges = (selector: string, parent = false) => {
    const found = document.querySelector(selector);
    const element = parent ? found?.parentElement : found;
    if (!element) return null;
    const box = element.getBoundingClientRect();
    return [Math.round(box.left), Math.round(box.right)];
  };
  return {
    scrollWidth: page.scrollWidth, clientWidth: page.clientWidth, scrollHeight: page.scrollHeight, clientHeight: page.clientHeight, scrollers,
    content: edges("main h1", true),
    card: edges("section[aria-label='Search flights'], section[aria-label='Search group fares']"),
    status: edges("[aria-label='Search status']"),
    results: edges("section[aria-label='Results']"),
    filters: edges("aside[aria-label='Filters']"),
    grid: edges("aside[aria-label='Filters']", true),  // the filters and results grid
  };
});

for (const [width, height] of SIZES) {
  for (const [tab, url] of [
    ["flights", "/admin/search?tab=flights&from=LHE&to=KHI&date=2026-11-19"],
    ["group", "/admin/search?tab=group-ticketing&from=LHE&to=JED&date=2026-11-24&adults=2"],
  ] as const) {
    test(`${tab} at ${width}x${height}: one vertical scroller, no sideways scroll, shared edges, at most 1600px`, async ({ page }) => {
      await open(page, width, height, url);
      const m = await measure(page);
      expect(m.scrollWidth, "no horizontal page scroll").toBe(m.clientWidth);
      expect(m.scrollers, "no scroll container inside the main area: the page is the only scroller").toEqual([]);
      const [left, right] = m.content!;
      expect(right - left).toBeLessThanOrEqual(1600);
      if (m.clientWidth - 256 > 1700) expect(Math.abs(left - 256 - (m.clientWidth - right))).toBeLessThanOrEqual(56);  // centred in the area beside the sidebar
      expect(m.card).toEqual([left, right]);
      if (tab === "flights") {
        expect(m.status).toEqual([left, m.status![1]]);       // the status line starts at the same left edge
        expect(m.grid).toEqual([left, right]);                 // filters + results span the same width as the search card
        expect(m.filters![0]).toBe(left);
        expect(m.results![1]).toBe(right);
      } else {
        expect(m.results).toEqual([left, right]);
      }
      if (tab === "flights" && DOCS.has(`${width}x${height}`)) await docsShot(page, `admin-search-wide-${width}x${height}`);
    });
  }
}
