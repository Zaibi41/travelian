import { expect, test, type Page, type Route } from "@playwright/test";
import { format, addDays } from "date-fns";
import { isLocal } from "./support/gateway";

// Issue #151: in Round-trip, picking the departure opens the return calendar, which is the same fare calendar with
// the dates before the departure greyed out and the departure outlined; a departure moved past the return clears the
// return with a note at the field; Search stays enabled ("Search flights") and explains what to fix at the field.
// Nothing reaches a real gateway: the fare calendar is answered here, everything else gets an empty answer.

const iso = (date: Date) => format(date, "yyyy-MM-dd");
const dayLabel = (date: Date) => new RegExp(`^${format(date, "EEEE d MMMM")}`);

async function mock(page: Page) {
  const calendars: { origin: string; destination: string; start?: string }[] = [];
  await page.route("**/*", (route: Route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/flights/calendar")) {
      const body = JSON.parse(route.request().postData() || "{}");
      calendars.push(body);
      const start = body.start ? new Date(`${body.start}T00:00:00`) : new Date();
      const days = Array.from({ length: 70 }, (_, index) => ({
        date: iso(addDays(start, index)), checked: true, available: true,
        lowest_price: { amount_minor: (50_000 + (index % 5) * 3_000) * 100, currency: "PKR" },
      }));
      return route.fulfill({ json: { origin: body.origin, destination: body.destination, pending: false, days } });
    }
    if (isLocal(url) && !url.pathname.startsWith("/__gateway")) return route.continue();
    return route.fulfill({ json: { items: [], groups: [], results: [], flights: [] } });
  });
  return calendars;
}

/** SHOTS=<dir>: keep screenshots for the PR. */
const shot = (page: Page, name: string) => (process.env.SHOTS ? page.screenshot({ path: `${process.env.SHOTS}/${name}.png` }) : Promise.resolve());

const card = (page: Page) => page.locator(".travelian-search-card");

async function chooseAirport(page: Page, name: "Origin" | "Destination", query: string, phone: boolean) {
  if (phone) {
    const sheet = page.getByRole("dialog", { name: name === "Origin" ? "Where from?" : "Where to?" });
    if (!(await sheet.isVisible())) await card(page).getByRole("combobox", { name }).click();
    await sheet.getByRole("combobox").fill(query.toLowerCase());
    await sheet.getByRole("option", { name: new RegExp(query) }).first().click();
  } else {
    await card(page).getByRole("combobox", { name }).click();
    await page.keyboard.type(query);
    await page.getByRole("option", { name: new RegExp(query) }).first().click();
  }
}

async function pickIn(page: Page, dialogName: RegExp, date: Date) {
  const dialog = page.getByRole("dialog", { name: dialogName });
  await expect(dialog).toBeVisible();
  const day = dialog.getByRole("button", { name: dayLabel(date) });
  while (!(await day.isVisible())) await dialog.getByRole("button", { name: "Next month" }).click();
  await day.click();
}

for (const width of [1440, 1024, 768, 390]) {
  test.describe(`home round-trip at ${width}px`, () => {
    const phone = width < 768;
    test.use({ viewport: { width, height: 900 }, ...(phone ? { isMobile: true, hasTouch: true } : {}) });

    test("departure opens the return calendar, earlier dates off, wrong order explained at the field", async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      const calendars = await mock(page);
      await page.goto("/");
      await card(page).getByRole("button", { name: "Round-trip", exact: true }).click();

      // Search is enabled and labelled; pressing it with nothing filled says what's missing at the fields.
      const search = card(page).getByRole("button", { name: "Search flights" });
      await expect(search).toBeEnabled();
      await expect(search).toHaveText(/Search flights/);
      await search.click();
      await expect(card(page).getByRole("alert").first()).toContainText("Select a valid origin airport");
      await shot(page, `after-empty-search-${width}`);
      await page.keyboard.press("Escape");

      await chooseAirport(page, "Origin", "LHE", phone);
      await chooseAirport(page, "Destination", "DXB", phone);
      const depart = addDays(new Date(), 20);
      // Choosing To opens the departure calendar by itself (waiting for it avoids a race with clicking the field under it).
      await expect(page.getByRole("dialog", { name: /departure date/i })).toBeVisible();
      await pickIn(page, /departure date/i, depart);

      // The return calendar opens by itself: the fare calendar, from the departure on, departure outlined.
      const returnDialog = page.getByRole("dialog", { name: "Select return date" });
      await expect(returnDialog).toBeVisible();
      await expect(returnDialog.getByText(/Lowest fare per adult/)).toBeVisible();
      await expect(returnDialog.getByRole("button", { name: new RegExp(`^${format(depart, "EEEE d MMMM")} \\(departure\\)`) })).toBeEnabled();
      const before = addDays(depart, -3);
      if (format(before, "MM") === format(depart, "MM")) {
        await expect(returnDialog.getByRole("button", { name: dayLabel(before) })).toBeDisabled();
      }
      await expect.poll(() => calendars.some(body => body.origin === "DXB" && body.destination === "LHE" && body.start === iso(depart))).toBe(true);
      const back = addDays(depart, 5);
      await pickIn(page, /return date/i, back);
      await expect(returnDialog).toBeHidden();
      await expect(card(page).getByRole("button", { name: /Return date/i })).toContainText(format(back, "dd"));

      // A departure moved past the return clears the return, says so at the field, and opens the return again.
      await card(page).getByRole("button", { name: /Departure date/i }).click();
      await pickIn(page, /departure date/i, addDays(back, 2));
      await expect(returnDialog).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(returnDialog).toBeHidden();
      await expect(card(page).getByRole("alert")).toContainText("Pick a new return date");
      await search.click();
      await expect(card(page).getByRole("alert")).toContainText("Choose a return date");
      await expect(card(page).locator('[aria-invalid="true"]')).toHaveCount(1);
      await shot(page, `after-return-cleared-search-${width}`);
      await expect(page).toHaveURL(/\/$/);

      const box = await search.boundingBox();
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
      expect(errors).toEqual([]);
    });
  });
}

for (const width of [1440, 390]) {
  test(`Modify Search round-trip: return opens after departure, earlier dates off, message at the field (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mock(page);
    const depart = addDays(new Date(), 20);
    const back = addDays(depart, 5);
    await page.goto(`/flights-search?from=LHE&to=DXB&depart=${iso(depart)}&return=${iso(back)}&trip=roundtrip&adults=1&children=0&infants=0&cabin=Economy`);
    await page.getByRole("button", { name: /Modify Search/ }).first().click();
    const modal = page.getByRole("dialog", { name: "Modify Search" });
    await expect(modal).toBeVisible();
    await modal.getByRole("button", { name: format(depart, "MMM dd, yyyy") }).click();
    await pickIn(page, /departure date/i, addDays(back, 3));
    const returnDialog = page.getByRole("dialog", { name: "Select return date" });
    await expect(returnDialog).toBeVisible();
    await expect(returnDialog.getByRole("button", { name: new RegExp(`^${format(addDays(back, 3), "EEEE d MMMM")} \\(departure\\)`) })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(returnDialog).toBeHidden();
    await expect(modal.getByRole("alert")).toHaveText("Pick a new return date");
    await modal.getByRole("button", { name: "Search Flights" }).click();
    await expect(modal.getByRole("alert")).toHaveText("Choose a return date");
    await expect(modal.getByRole("button", { name: "Select return date" })).toBeFocused();
    await shot(page, `after-modify-return-message-${width}`);
    await modal.getByRole("button", { name: "Select return date" }).click();
    await pickIn(page, /return date/i, addDays(back, 6));
    await expect(modal.getByRole("alert")).toHaveCount(0);
  });
}
