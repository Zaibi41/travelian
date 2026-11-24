import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// Public flight results: a card's fares are tiles to pick from, and the card has one Book, for the picked fare
// (the cheapest until another is picked). A flight with one fare has no tiles. One-way and round trip (public multi-city search
// shows "not available online yet", so it has no cards);
// 390 (tiles scroll sideways inside the card, not the page), 768, 1024 and 1440. Intercepted gateway answers only.

if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const seg = (n: string, o: string, d: string, dep: string, arr: string, m: number) => ({ flight_number: n, origin: o, destination: d, departure_local: dep, arrival_local: arr, duration_minutes: m });
const fare = (id: string, name: string, price: number, extra: object = {}) => ({ id, name, selling_price: rs(price), ...extra });
const flight = (id: string, code: string, name: string, number: string, o: string, d: string, date: string, fares: object[]) => ({
  id, airline_code: code, airline_name: name, flight_number: number, departure_local: `${date}T03:00`, arrival_local: `${date}T05:30`,
  duration_minutes: 150, stops: 0, stop_cities: [], segments: [seg(number, o, d, `${date}T03:00`, `${date}T05:30`, 150)], fares });

const TK = flight("o1", "TK", "Turkish Airlines", "TK715", "LHE", "DXB", "2026-12-08", [
  fare("o1-0", "Eco Fly", 496_150, { baggage: "7+20 kg" }),
  fare("o1-1", "Extra Fly", 512_300, { baggage: "7+30 kg", meal: "Meal" }),
  fare("o1-2", "Prime Fly", 541_900, { baggage: "7+40 kg", meal: "Meal" }),
  fare("o1-3", "Business Flexible Premium Fare With A Very Long Name", 889_400, { baggage: "2 x 32 kg", meal: "Meal" }),
]);
const QR = flight("o2", "QR", "Qatar Airways", "QR629", "LHE", "DXB", "2026-12-08", [fare("o2-0", "Economy Classic", 332_400, { baggage: "7+30 kg" })]);
const BACK = flight("r1", "TK", "Turkish Airlines", "TK716", "DXB", "LHE", "2026-12-15", [fare("r1-0", "Eco Fly", 100_000, { baggage: "7+20 kg" })]);

const TRIPS = {
  oneway: { query: "from=LHE&to=DXB&depart=2026-12-08&trip=oneway&adults=1", journeys: [{ direction: "outbound", origin: "LHE", destination: "DXB", flights: [TK, QR] }] },
  roundtrip: { query: "from=LHE&to=DXB&depart=2026-12-08&return=2026-12-15&trip=roundtrip&adults=1",
    journeys: [{ direction: "outbound", origin: "LHE", destination: "DXB", flights: [TK, QR] }, { direction: "return", origin: "DXB", destination: "LHE", flights: [BACK] }] },
};

async function open(page: Page, width: number, trip: keyof typeof TRIPS) {
  await page.setViewportSize({ width, height: 900 });
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (isGateway(url)) {
      if (url.pathname === "/v1/public/flights/search") {
        return route.fulfill({ json: { search_id: "s-fc", expires_at: new Date(Date.now() + 15 * 60_000).toISOString(), status: "complete", journeys: TRIPS[trip].journeys } });
      }
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return isLocal(url) ? route.continue() : route.fulfill({ json: {} });
  });
  await page.goto(`/flights-search?${TRIPS[trip].query}`);
  await expect(page.getByRole("button", { name: "Flight Details" }).first()).toBeVisible({ timeout: 20_000 });
}
const card = (page: Page, airline: string) => page.locator("main .shadow-card").filter({ has: page.getByRole("button", { name: airline, exact: true }) }).first();
const bookHref = async (c: ReturnType<Page["locator"]>) => (await c.getByRole("link").filter({ has: c.page().getByRole("button", { name: "Book", exact: true }) }).getAttribute("href"))!;

for (const width of [390, 768, 1024, 1440]) {
  test(`one-way ${width}px: pick a fare, one Book follows it`, async ({ page }) => {
    await open(page, width, "oneway");
    const tk = card(page, "Turkish Airlines");
    const tiles = tk.getByRole("group", { name: "Fares for Turkish Airlines TK715" }).getByRole("button");
    await expect(tiles).toHaveCount(4);
    await expect(tk.getByRole("button", { name: "Book", exact: true })).toHaveCount(1);
    await expect(tiles.first()).toHaveAttribute("aria-pressed", "true"); // the cheapest first, picked
    expect(await bookHref(tk)).toContain("496150");

    const prime = tiles.filter({ hasText: "Prime Fly" });
    await prime.scrollIntoViewIfNeeded();
    await prime.click();
    await expect(prime).toHaveAttribute("aria-pressed", "true");
    await expect(tiles.first()).toHaveAttribute("aria-pressed", "false");
    await expect(tk.getByText("PKR 541,900").last()).toBeVisible();
    expect(await bookHref(tk)).toContain("541900");
    expect(new URL(await bookHref(tk), "http://x").searchParams.get("fareIds")).toBe("o1-2");

    // A long fare name stays inside its tile.
    const long = tiles.filter({ hasText: "Business Flexible" });
    const [t, n] = [await long.boundingBox(), await long.locator("span").first().boundingBox()];
    expect(n!.x + n!.width).toBeLessThanOrEqual(t!.x + t!.width + 1);

    // One fare: no tiles, still one Book.
    const qr = card(page, "Qatar Airways");
    await expect(qr.getByRole("group", { name: /^Fares for / })).toHaveCount(0);
    await expect(qr.getByRole("button", { name: "Book", exact: true })).toHaveCount(1);
    await expect(page.getByRole("button", { name: /^Show \d+ more fares?/ })).toHaveCount(0);

    if (width < 640) expect((await tk.getByRole("button", { name: "Book", exact: true }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });
}

for (const trip of ["roundtrip"] as const) {
  for (const width of [390, 1440]) {
    test(`${trip} ${width}px: the picked fare is the one booked`, async ({ page }) => {
      await open(page, width, trip);
      const tk = card(page, "Turkish Airlines");
      const tiles = tk.getByRole("group", { name: /^Fares for / }).getByRole("button");
      await expect(tiles).toHaveCount(4);
      await expect(tk.getByRole("button", { name: "Book", exact: true })).toHaveCount(1);
      const before = await bookHref(tk);
      const extra = tiles.filter({ hasText: "Extra Fly" });
      await extra.scrollIntoViewIfNeeded();
      await extra.click();
      await expect(extra).toHaveAttribute("aria-pressed", "true");
      const after = await bookHref(tk);
      expect(after).not.toBe(before);
      const query = new URL(after, "http://x").searchParams;
      expect(query.get("fare")).toBe("Extra Fly");
      expect(query.get("fareIds")?.split(",")[0]).toBe("o1-1"); // the picked fare's gateway id is the one booked
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    });
  }
}
