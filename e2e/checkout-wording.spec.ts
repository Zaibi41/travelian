import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// #149: checkout step 1 shows only real cancellation / refund information, in traveller wording.
// The fare comes from the link (as the results page builds it); gateway calls are answered here.
const FLIGHT = {
  type: "flight", flightId: "f1", airline: "Example Air", flightNo: "EX786", from: "LHE", to: "DXB", date: "Dec 08, 2026",
  cabin: "Economy", trip: "oneway", adults: "1", children: "0", infants: "0", price: "45000", currency: "PKR", fare: "Nil Baggage",
  searchId: "s-1", fareIds: "fare-1",
};
const checkout = (extra: Record<string, string> = {}) => `/booking?${new URLSearchParams({ ...FLIGHT, ...extra })}`;

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

const INTERNAL = /supplier|admin follow-up|wallet payment configuration|book only|free cancellation/i;

for (const [width, height] of [[390, 844], [1440, 900]]) {
  test(`checkout step 1 has no invented cancellation or internal wording at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await mockGateway(page);
    await page.goto(checkout());
    await expect(page.getByRole("button", { name: /^Continue/ })).toBeVisible();
    const text = await page.locator("main").innerText();
    expect(text).not.toMatch(INTERNAL);
    await expect(page.getByText("Cancellation and refund rules: as per airline fare rules.")).toBeVisible();
    await expect(page.getByText("We confirm your fare before ticketing")).toBeVisible();
    await expect(page.getByText(/^Refundable$|^Non-refundable$/)).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  });

  test(`checkout step 1 shows the fare's own refund status at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await mockGateway(page);
    await page.goto(checkout({ refund: "non_refundable" }));
    await expect(page.getByText("Non-refundable", { exact: true })).toBeVisible();
    await expect(page.getByText("Refundable", { exact: true })).toHaveCount(0);
    await page.goto(checkout({ refund: "refundable" }));
    await expect(page.getByText("Refundable", { exact: true })).toBeVisible();
    expect(await page.locator("main").innerText()).not.toMatch(INTERNAL);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  });
}
