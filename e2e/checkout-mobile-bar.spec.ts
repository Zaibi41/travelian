import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// #156: on phones the checkout total and the step's main button stay in a bar at the bottom of the screen.
// The fare comes from the link the results page builds; gateway calls are answered here.
const FLIGHT = {
  type: "flight", flightId: "f1", airline: "Example Air", flightNo: "EX786", from: "LHE", to: "DXB", date: "Dec 08, 2026",
  cabin: "Economy", trip: "oneway", adults: "1", children: "0", infants: "0", price: "78155", currency: "PKR", fare: "Value",
  searchId: "s-1", fareIds: "fare-1",
};
const query = (extra: Record<string, string>) => new URLSearchParams({ ...FLIGHT, ...extra }).toString();

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

/** A saved draft (as the page keeps one) so the form is complete and the later steps can be reached. */
async function saveDraft(page: Page, q: string, travelers: number) {
  const forms = Array.from({ length: travelers }, (_, i) => ({
    passengerType: "adult", label: `Adult ${i + 1}`, title: "mr", firstName: `Test${"abcdefgh"[i]}`, lastName: "Traveller", gender: "male",
    dob: "1990-01-01", docNumber: `AB12345${i}`, expiryDate: "2032-01-01", nationality: "Pakistan", issuanceCountry: "Pakistan",
  }));
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [`travelian.bookingDraft.${q}`,
    JSON.stringify({ passengerForms: forms, email: "traveller@example.invalid", phoneCode: "+92", phone: "3001234567" })]);
}

async function inViewport(page: Page, selector: ReturnType<Page["getByTestId"]>) {
  const box = await selector.boundingBox();
  const height = page.viewportSize()!.height;
  return Boolean(box && box.y >= 0 && box.y + box.height <= height);
}

for (const [width, height] of [[390, 844], [360, 740]]) {
  for (const adults of [1, 4]) {
    test(`phone bar keeps the total and main action on screen at ${width}px with ${adults} traveler(s)`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await mockGateway(page);
      const q = query({ adults: String(adults) });
      await saveDraft(page, q, adults);
      await page.goto(`/booking?${q}`);
      const bar = page.getByTestId("checkout-action-bar");
      await expect(bar).toBeVisible();
      await expect(bar.getByText(adults === 1 ? "PKR 78,155" : "PKR 312,620")).toBeVisible();
      await expect(bar.getByText(adults === 1 ? "1 Adult" : "4 Travelers")).toBeVisible();
      // No floating WhatsApp button on the phone checkout; the bar's button is the 44px main action.
      await expect(page.getByRole("link", { name: "Chat with Travelian on WhatsApp" })).toBeHidden();
      const action = bar.getByRole("button", { name: /^Continue/ });
      expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(44);

      // Scrolled anywhere, the total stays on screen.
      for (const y of [0, 1200, 99999]) {
        await page.evaluate(top => window.scrollTo(0, top), y);
        expect(await inViewport(page, bar)).toBe(true);
      }
      // At the very bottom the footer isn't covered: the page has room below it.
      const footerBottom = await page.evaluate(() => document.querySelector("footer")!.getBoundingClientRect().bottom);
      const barTop = (await bar.boundingBox())!.y;
      expect(footerBottom).toBeLessThanOrEqual(barTop + 1);

      // Keyboard up (a text field has focus): the bar steps aside.
      await page.locator("#contact-phone").focus();
      await expect(bar).toBeHidden();
      await page.locator("#contact-phone").blur();
      await expect(bar).toBeVisible();

      // Tap the total: the fare summary opens as a sheet.
      await bar.getByRole("button", { name: /Show fare summary/ }).click();
      const sheet = page.getByRole("dialog", { name: "Fare summary" });
      await expect(sheet.getByText("Fare Summary", { exact: true })).toBeVisible();
      await expect(sheet.getByText("Total", { exact: true })).toBeVisible();
      await sheet.getByRole("button", { name: "Close", exact: true }).last().click();
      await expect(sheet).toBeHidden();

      // Step 1 -> 2 -> 3 from the bar.
      await action.click();
      await expect(page.getByRole("heading", { name: "Review Booking" })).toBeVisible();
      await page.getByRole("checkbox", { name: /match the passport/ }).click();
      await expect(bar.getByRole("button", { name: /^Continue/ })).toBeVisible();
      await bar.getByRole("button", { name: /^Continue/ }).click();
      await expect(page.getByRole("heading", { name: "Payment Method" })).toBeVisible();
      await expect(bar.getByRole("button", { name: /Reserve \/ Request Booking/ })).toBeVisible();
      expect(await inViewport(page, bar)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    });
  }
}

for (const [width, height] of [[768, 1024], [1440, 900]]) {
  test(`no bottom bar at ${width}px; the page keeps its own Continue`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await mockGateway(page);
    await page.goto(`/booking?${query({})}`);
    await expect(page.getByRole("button", { name: /^Continue/ })).toBeVisible();
    await expect(page.getByTestId("checkout-action-bar")).toHaveCount(0);
  });
}
