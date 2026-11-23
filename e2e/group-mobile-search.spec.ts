import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// Issue #161 (Group Ticketing on phones): tapping a sector (or Search) scrolls to the results heading and focuses it;
// phones show the sectors once (chips, no extra list); no empty space above Search. Desktop unchanged.
// Intercepted gateway answers only.

const money = { amount_minor: 9_000_000, currency: "PKR" };
const ticket = (id: string, sector: string, date: string) => {
  const [origin, destination] = sector.split(" - ");
  return { id, sector, airline: "PA", tickets: [{ id: `t-${id}`, sector, airline: "PA", flight_number: "PA470", departure_date: date, departure_time: "23:00",
    remaining: 9, baggage: "20", hand_carry: "7", selling_price: money, fare_terms: { notice: "Non-refundable.", refund: "Non-refundable" },
    legs: [{ direction: "outbound", flight_number: "PA470", origin, destination, departure_date: date, departure_time: "23:00", arrival_time: "03:15" }] }] };
};
const SECTORS = ["LHE - JED", "ISB - JED", "KHI - JED", "LHE - MED", "MUX - JED", "SKT - DXB"];
const SEARCH = { data: SECTORS.flatMap((sector, index) => [ticket(`g${index}a`, sector, "2026-12-27"), ticket(`g${index}b`, sector, "2026-12-29")]) };

async function mock(page: Page) {
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (isGateway(url)) {
      if (url.pathname === "/v1/public/group-ticketing/search") return route.fulfill({ json: SEARCH });
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return isLocal(url) ? route.continue() : route.fulfill({ json: {} });
  });
}

const shot = (page: Page, name: string) => (process.env.SHOTS ? page.screenshot({ path: `${process.env.SHOTS}/${name}.png` }) : Promise.resolve());
const form = (page: Page) => page.locator(".unified-search-content");

for (const width of [390, 360]) {
  test.describe(`phone ${width}px`, () => {
    test.use({ viewport: { width, height: 780 }, isMobile: true, hasTouch: true });

    test("a sector tap brings the results heading into view; one sector control; Search right under the fields", async ({ page }) => {
      await mock(page);
      await page.goto("/group-ticketing");
      const chips = form(page).getByRole("button", { name: /→/ });
      await expect(chips.first()).toBeVisible();
      // Every sector as a chip (sideways scroll), no "Select available sector" list.
      await expect(chips).toHaveCount(SECTORS.length);
      await expect(form(page).getByRole("combobox", { name: /Select available sector/ })).toBeHidden();
      // Search 8–16px under the last field.
      const gap = await form(page).evaluate(content => {
        const submit = content.querySelector(".unified-search-submit")!.getBoundingClientRect();
        const date = content.querySelector('.group-search-fields button[aria-haspopup="dialog"]')!.getBoundingClientRect();
        return submit.top - date.bottom;
      });
      expect(gap).toBeGreaterThanOrEqual(8);
      expect(gap).toBeLessThanOrEqual(16);
      await shot(page, `after-e2e-form-${width}`);

      await chips.filter({ hasText: "KHI → JED" }).tap();
      const heading = page.getByRole("heading", { name: "KHI → JED Group Tickets" });
      await expect(heading).toBeFocused();
      await expect.poll(async () => {
        const box = await heading.boundingBox();
        return Boolean(box && box.y >= 0 && box.y + box.height <= 780);
      }).toBe(true);
      await page.waitForTimeout(800);
      await shot(page, `after-e2e-results-${width}`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);

      // Search from the form does the same.
      await page.evaluate(() => window.scrollTo(0, 0));
      await chips.filter({ hasText: "LHE → JED" }).tap();
      await expect(page.getByRole("heading", { name: "LHE → JED Group Tickets" })).toBeFocused();
    });
  });
}

test("desktop 1440: four chips plus the sector list, the page does not move", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mock(page);
  await page.goto("/group-ticketing");
  const chips = form(page).getByRole("button", { name: /→/ });
  await expect(chips.first()).toBeVisible();
  await expect(chips.filter({ visible: true })).toHaveCount(4);
  await expect(form(page).getByRole("combobox", { name: /Select available sector/ })).toBeVisible();
  await chips.filter({ hasText: "KHI → JED" }).click();
  await expect(page.getByRole("heading", { name: "KHI → JED Group Tickets" })).toBeVisible();
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});
