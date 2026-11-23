import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// #167: the website's Traveler Details form without the three helper texts, Date of Expiry to the right of Country of
// Issuance, and Contact Information with one Mobile Number, in one row with Email. Gateway calls are answered here.
const SHOTS = process.env.SHOTS_DIR;
const TAG = process.env.SHOT_TAG || "after";
const ONLY_SHOTS = process.env.SHOT_ONLY === "1";
const FLIGHT = {
  type: "flight", flightId: "f1", airline: "Example Air", flightNo: "EX786", from: "LHE", to: "DXB", date: "Dec 08, 2026",
  cabin: "Economy", trip: "oneway", adults: "1", children: "0", infants: "0", price: "45000", currency: "PKR", fare: "Value",
  searchId: "s-1", fareIds: "fare-1",
};

async function mock(page: Page) {
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (isGateway(url)) {
      if (url.pathname.endsWith("/payment-methods")) return route.fulfill({ json: { card: false, bank_transfer: false, jazzcash: false, flights: false } });
      if (url.pathname.includes("/documents")) return route.fulfill({ json: { documents: [{ type: "ADT", number: 1, document: "passport" }] } });
      return route.fulfill({ json: {} });
    }
    return isLocal(route.request().url()) ? route.continue() : route.fulfill({ json: { items: [], groups: [], results: [] } });
  });
}

for (const [width, height] of [[390, 844], [768, 1024], [1440, 900]]) {
  test(`traveler details and contact layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await mock(page);
    await page.goto(`/booking?${new URLSearchParams(FLIGHT)}`);
    await expect(page.getByRole("heading", { name: "Contact Information" })).toBeVisible();
    await page.waitForTimeout(500);
    if (SHOTS) await page.locator("main").screenshot({ path: `${SHOTS}/public-form-${width}-${TAG}.png` });
    if (ONLY_SHOTS) return;
    for (const text of ["Name must match exactly as shown on your passport.", "This airline needs the traveler's passport for this flight.",
      "Use the passport number without spaces.", "Travelian will use this number for ticketing updates and support.", "Alternate Mobile Number"]) {
      await expect(page.getByText(text, { exact: true })).toHaveCount(0);
    }
    const issuance = (await page.locator("#passenger-0-issuanceCountry").boundingBox())!;
    const expiry = (await page.locator("#passenger-0-expiryDate").boundingBox())!;
    const email = (await page.locator("#contact-email").boundingBox())!;
    const phone = (await page.locator("#contact-phone").boundingBox())!;
    if (width >= 768) {
      expect(Math.abs(expiry.y - issuance.y)).toBeLessThan(4);      // same row
      expect(expiry.x).toBeGreaterThan(issuance.x + issuance.width - 2);  // to its right
      expect(Math.abs(phone.y - email.y)).toBeLessThan(4);
      expect(phone.x).toBeGreaterThan(email.x);
    } else {
      expect(expiry.y).toBeGreaterThan(issuance.y);                 // stacked on phones
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  });
}
