import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// #153: the checkout summary's duration is the flight's own time (as on the results card), never local arrival minus
// local departure across time zones. The fare comes from the link the results page builds; gateway calls are answered here.
const seg = (flightNumber: string, origin: string, destination: string, dep: string, arr: string, duration: string) =>
  ({ flightNumber, origin, destination, departureTime: dep, arrivalTime: arr, departureTimestamp: dep, arrivalTimestamp: arr, duration });
const FLIGHT = {
  type: "flight", flightId: "f1", airline: "Example Air", flightNo: "EX786", from: "LHE", to: "DXB", date: "Dec 08, 2026",
  cabin: "Economy", trip: "oneway", adults: "1", children: "0", infants: "0", price: "45000", currency: "PKR", fare: "Value",
  searchId: "s-1", fareIds: "fare-1",
};
const checkout = (extra: Record<string, string>) => `/booking?${new URLSearchParams({ ...FLIGHT, ...extra })}`;

async function mockGateway(page: Page) {
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (isGateway(url)) {
      if (url.pathname.endsWith("/payment-methods")) return route.fulfill({ json: { card: false, bank_transfer: false, jazzcash: false, flights: false } });
      if (url.pathname.includes("/documents")) return route.fulfill({ json: { documents: [] } });
      return route.fulfill({ json: {} });
    }
    return isLocal(route.request().url()) ? route.continue() : route.fulfill({ json: { items: [], groups: [], results: [] } });
  });
}

const CASES: { name: string; extra: Record<string, string>; lines: string[]; stops: string[] }[] = [
  { name: "LHE to DXB (PKT to GST)", extra: { segments: JSON.stringify([seg("EX786", "LHE", "DXB", "2026-12-08 11:50", "2026-12-08 14:35", "3h 45m")]) }, lines: ["Total Duration: 3h 45m"], stops: ["Non-stop"] },
  { name: "DXB to LHE", extra: { from: "DXB", to: "LHE", segments: JSON.stringify([seg("EX787", "DXB", "LHE", "2026-12-08 16:00", "2026-12-08 20:10", "3h 10m")]) }, lines: ["Total Duration: 3h 10m"], stops: ["Non-stop"] },
  { name: "LHE to IST with 1 stop", extra: { to: "IST", segments: JSON.stringify([seg("EX623", "LHE", "DXB", "2026-12-08 04:00", "2026-12-08 06:30", "3h 30m"), seg("EX121", "DXB", "IST", "2026-12-08 09:00", "2026-12-08 13:00", "5h 0m")]) }, lines: ["Total Duration: 11h 0m"], stops: ["1 Stop"] },
  { name: "round trip", extra: { trip: "roundtrip", return: "Dec 15, 2026", segments: JSON.stringify([seg("EX786", "LHE", "DXB", "2026-12-08 11:50", "2026-12-08 14:35", "3h 45m"), seg("EX787", "DXB", "LHE", "2026-12-15 16:00", "2026-12-15 20:10", "3h 10m")]) }, lines: ["Outbound: 3h 45m", "Return: 3h 10m"], stops: ["Non-stop", "Non-stop"] },
];

for (const [width, height] of [[390, 844], [768, 1024], [1440, 900]]) {
  for (const item of CASES) {
    test(`checkout duration for ${item.name} matches the flight's own time at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await mockGateway(page);
      await page.goto(checkout(item.extra));
      const summary = page.getByTestId("checkout-journeys");
      await expect(summary).toBeVisible();
      for (const line of item.lines) await expect(summary.getByText(line, { exact: true })).toBeVisible();
      await expect(summary.getByText(/stop/i)).toHaveText(item.stops);
      await expect(page.getByText(/0 Stops/)).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    });
  }
}
