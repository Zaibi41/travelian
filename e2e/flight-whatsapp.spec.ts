import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// #53 (+ #163's placement): one WhatsApp button per flight, next to Flight Details; none on the fare rows, where Book
// stays the main action. The message has the flight number(s), date, route, cabin and the lowest price on the card, and
// no supplier labels. One-way (multi-fare, 1-stop), round trip; 390, 360, 768, 1440. Intercepted gateway answers only.
// WA_SHOTS_DIR saves screenshots; WA_SHOTS=before only takes them (for the page before this change), with no checks.

if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
const BEFORE = process.env.WA_SHOTS === "before";
const SHOTS = process.env.WA_SHOTS_DIR;

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const seg = (n: string, o: string, d: string, dep: string, arr: string, m: number) => ({ flight_number: n, origin: o, destination: d, departure_local: dep, arrival_local: arr, duration_minutes: m });
const fares = (id: string, prices: number[]) => prices.map((p, i) => ({ id: `${id}-${i}`, name: ["Value", "Flexi", "Extra"][i], baggage: "7+20 kg", selling_price: rs(p) }));
const PK = { id: "o1", airline_code: "PK", airline_name: "Pakistan International Airlines", flight_number: "PK203", departure_local: "2026-12-08T03:00",
  arrival_local: "2026-12-08T05:30", duration_minutes: 210, stops: 0, stop_cities: [], segments: [seg("PK203", "LHE", "DXB", "2026-12-08T03:00", "2026-12-08T05:30", 210)],
  fares: fares("o1", [99_000, 90_000, 120_000]) };
const QR = { id: "o2", airline_code: "QR", airline_name: "Qatar Airways", flight_number: "QR629 / QR1018", departure_local: "2026-12-08T04:10",
  arrival_local: "2026-12-08T11:00", duration_minutes: 470, stops: 1, stop_cities: ["DOH"],
  segments: [seg("QR629", "LHE", "DOH", "2026-12-08T04:10", "2026-12-08T06:00", 230), { ...seg("QR1018", "DOH", "DXB", "2026-12-08T08:45", "2026-12-08T11:00", 75), layover_minutes: 165 }],
  fares: fares("o2", [132_400]) };
const BACK = [
  { id: "r1", airline_code: "PK", airline_name: "Pakistan International Airlines", flight_number: "PK204", departure_local: "2026-12-15T07:00",
    arrival_local: "2026-12-15T11:30", duration_minutes: 210, stops: 0, stop_cities: [], segments: [seg("PK204", "DXB", "LHE", "2026-12-15T07:00", "2026-12-15T11:30", 210)],
    fares: fares("r1", [80_000]) },
];
const answer = (round: boolean) => ({ search_id: "s-wa", expires_at: new Date(Date.now() + 15 * 60_000).toISOString(), status: "complete",
  journeys: [{ direction: "outbound", origin: "LHE", destination: "DXB", flights: [PK, QR] },
             ...(round ? [{ direction: "return", origin: "DXB", destination: "LHE", flights: BACK }] : [])] });

async function open(page: Page, width: number, round = false) {
  await page.setViewportSize({ width, height: 900 });
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (isGateway(url)) {
      if (url.pathname === "/v1/public/flights/search") return route.fulfill({ json: answer(round) });
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return isLocal(url) ? route.continue() : route.fulfill({ json: {} });
  });
  await page.goto(round ? "/flights-search?from=LHE&to=DXB&depart=2026-12-08&return=2026-12-15&trip=roundtrip&adults=1"
    : "/flights-search?from=LHE&to=DXB&depart=2026-12-08&trip=oneway&adults=1");
  await expect(page.getByRole("button", { name: "Flight Details" }).first()).toBeVisible({ timeout: 20_000 });
}
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${BEFORE ? "before" : "after"}-${name}.png`, fullPage: false });
};
const card = (page: Page, airline: string) => page.locator("main .shadow-card").filter({ has: page.getByRole("button", { name: airline, exact: true }) }).first();
const message = async (link: ReturnType<Page["locator"]>) => new URL((await link.getAttribute("href"))!).searchParams.get("text") ?? "";

for (const width of [390, 360, 768, 1440]) {
  test(`one-way ${width}px: one WhatsApp per flight beside Flight Details, none on fare rows`, async ({ page }) => {
    await open(page, width);
    await shot(page, `oneway-${width}`);
    if (BEFORE) return;
    const pk = card(page, "PIA");
    await expect(pk.getByRole("group", { name: /^Fares for / }).getByRole("button")).toHaveCount(3); // all three fares: still one WhatsApp
    await shot(page, `oneway-all-fares-${width}`);
    const links = pk.getByRole("link", { name: /WhatsApp/ }).locator("visible=true");
    await expect(links).toHaveCount(1);
    await expect(pk.getByRole("button", { name: "WhatsApp", exact: true })).toHaveCount(0);
    await expect(pk.getByRole("button", { name: "Book", exact: true }).locator("visible=true")).toHaveCount(1); // one Book per flight, for the picked fare
    const wa = links.first();
    await expect(wa).toHaveAccessibleName("Ask about PIA PK203 on WhatsApp");
    const box = (await wa.boundingBox())!;
    if (width < 640) expect(box.height).toBeGreaterThanOrEqual(44);
    const details = (await pk.getByRole("button", { name: "Flight Details" }).boundingBox())!;
    expect(Math.abs(details.y - box.y)).toBeLessThan(2); // same row as Flight Details
    const text = await message(wa);
    expect(text).toContain("Airline: PIA");
    expect(text).toContain("PK203, LHE to DXB, Dec 08, 2026");
    expect(text).toContain("Cabin: Economy");
    expect(text).toContain("Lowest fare shown: PKR 90,000"); // the cheapest of the card's fares
    expect(text).not.toMatch(/sooperfare|southair|supplier|provider|AIRSIALAPI|FLYJINNAH|undefined|null/i);

    const qr = await message(card(page, "Qatar Airways").getByRole("link", { name: /WhatsApp/ }).locator("visible=true").first());
    expect(qr).toContain("QR629 / QR1018, LHE to DXB, Dec 08, 2026"); // 1 stop: both flight numbers, the whole route
    expect(qr).toContain("Lowest fare shown: PKR 132,400");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });
}

for (const width of [390, 1440]) {
  test(`round trip ${width}px: the message has the outbound and the return`, async ({ page }) => {
    await open(page, width, true);
    await shot(page, `roundtrip-${width}`);
    if (BEFORE) return;
    const pk = card(page, "PIA");
    await expect(pk.getByRole("link", { name: /WhatsApp/ }).locator("visible=true")).toHaveCount(1);
    const text = await message(pk.getByRole("link", { name: /WhatsApp/ }).locator("visible=true").first());
    expect(text).toContain("Outbound: PK203, LHE to DXB, Dec 08, 2026");
    expect(text).toContain("Return: PK204, DXB to LHE, Dec 15, 2026");
    expect(text).toContain("Lowest fare shown: PKR 170,000"); // 90,000 + 80,000, as the results card shows it
  });
}
