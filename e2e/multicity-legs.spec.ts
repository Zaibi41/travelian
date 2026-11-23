import { expect, test, type Page } from "@playwright/test";
import { addDays, format } from "date-fns";
import { isLocal } from "./support/gateway";

// Issue #160: multi-city legs are headed "Flight 1", "Flight 2" (a card each on phones, with a remove x from the
// third), each field to fix gets a red border and its own message (the first one is focused, Add Flight stays put),
// a new leg starts where the previous one lands, and a leg's calendar starts at the previous leg's date.
// Nothing reaches a real gateway.

async function mock(page: Page) {
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    if (isLocal(url) && !url.pathname.startsWith("/__gateway")) return route.continue();
    return route.fulfill({ status: 503, json: { detail: "test" } });
  });
}

const card = (page: Page) => page.locator(".travelian-search-card");

async function chooseAirport(page: Page, field: ReturnType<Page["locator"]>, query: string, phone: boolean, sheetName: string) {
  if (phone) {
    const sheet = page.getByRole("dialog", { name: sheetName });
    await page.waitForTimeout(300);
    if (!(await sheet.isVisible())) await field.click();
    await sheet.getByRole("combobox").fill(query.toLowerCase());
    await sheet.getByRole("option", { name: new RegExp(query) }).first().click();
  } else {
    await field.click();
    await page.keyboard.type(query);
    await page.getByRole("option", { name: new RegExp(query) }).first().click();
  }
}

for (const width of [1440, 768, 390, 360]) {
  test.describe(`home multi-city at ${width}px`, () => {
    const phone = width < 768;
    test.use({ viewport: { width, height: 900 }, ...(phone ? { isMobile: true, hasTouch: true } : {}) });

    test("labelled legs, messages at the fields, next leg pre-filled", async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await mock(page);
      await page.goto("/");
      await card(page).getByRole("button", { name: "Multi-city", exact: true }).click();
      await expect(card(page).getByRole("heading", { name: "Flight 1" })).toBeVisible();
      await expect(card(page).getByRole("heading", { name: "Flight 2" })).toBeVisible();
      // Every leg's Date field has a name (label), also on phones.
      await expect(card(page).getByLabel("Date")).toHaveCount(2);

      const add = card(page).getByRole("button", { name: "Add Flight" });
      const addBefore = (await add.boundingBox())!;
      await card(page).getByRole("button", { name: "Search Flights" }).click();
      await expect(card(page).getByText("Choose an origin")).toHaveCount(2);
      await expect(card(page).getByText("Choose a destination")).toHaveCount(2);
      await expect(card(page).getByText("Pick a date")).toHaveCount(2);
      await expect(card(page).getByRole("combobox", { name: "Origin" }).first()).toBeFocused();
      const addAfter = (await add.boundingBox())!;
      expect(Math.abs(addAfter.x - addBefore.x)).toBeLessThan(2); // no sideways jump
      if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/after-e2e-empty-${width}.png` });
      await page.keyboard.press("Escape");
      expect(new URL(page.url()).pathname).toBe("/");

      const origins = card(page).getByRole("combobox", { name: "Origin" });
      const destinations = card(page).getByRole("combobox", { name: "Destination" });
      await chooseAirport(page, origins.first(), "LHE", phone, "Where from?");
      await chooseAirport(page, destinations.first(), "DXB", phone, "Where to?");
      // Phones open the date next by themselves (#148); elsewhere open it.
      await page.waitForTimeout(400);
      if (!(await page.getByRole("dialog", { name: "Select flight date" }).isVisible())) await card(page).getByLabel("Date").first().click();
      await expect(page.getByRole("dialog", { name: "Select flight date" })).toBeVisible();
      const flight1 = addDays(new Date(), 5);
      await page.getByRole("dialog", { name: "Select flight date" }).getByRole("gridcell", { name: String(flight1.getDate()), exact: true }).first().click();
      await expect(origins.nth(1)).toHaveValue("DXB Dubai");
      // Flight 1's fixed fields lost their messages; Flight 2's From was filled, so its message went too.
      await expect(card(page).getByText("Choose an origin")).toHaveCount(0);

      // Flight 2's calendar can't go before Flight 1's date.
      await card(page).getByLabel("Date").nth(1).click();
      const calendar = page.getByRole("dialog", { name: "Select flight date" });
      const dayBefore = addDays(flight1, -1);
      if (dayBefore.getMonth() === flight1.getMonth()) {
        await expect(calendar.getByRole("gridcell", { name: String(dayBefore.getDate()), exact: true }).first()).toBeDisabled();
      }
      await page.keyboard.press("Escape");

      // Same airport twice.
      await chooseAirport(page, destinations.nth(1), "DXB", phone, "Where to?");
      if (await page.getByRole("dialog", { name: "Select flight date" }).isVisible()) await page.keyboard.press("Escape");
      await card(page).getByRole("button", { name: "Search Flights" }).click();
      await expect(card(page).getByText("Choose a different destination")).toBeVisible();

      // A third leg starts at Flight 2's destination and can be removed.
      await add.click();
      await expect(card(page).getByRole("heading", { name: "Flight 3" })).toBeVisible();
      await expect(origins.nth(2)).toHaveValue("DXB Dubai");
      await card(page).getByRole("button", { name: "Remove Flight 3" }).click();
      await expect(card(page).getByRole("heading", { name: "Flight 3" })).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
      if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/after-e2e-filled-${width}.png` });
      expect(errors).toEqual([]);
    });
  });
}

for (const width of [1440, 390]) {
  test(`Modify Search multi-city: labelled legs, messages at the fields, pre-filled From (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mock(page);
    const depart = format(addDays(new Date(), 10), "yyyy-MM-dd");
    await page.goto(`/flights-search?from=LHE&to=DXB&depart=${depart}&trip=oneway&adults=1&children=0&infants=0&cabin=Economy`);
    await page.getByRole("button", { name: /Modify Search/ }).first().click();
    const modal = page.getByRole("dialog", { name: "Modify Search" });
    await modal.getByRole("button", { name: "Multi-city", exact: true }).click();
    await expect(modal.getByRole("heading", { name: "Flight 1" })).toBeVisible();
    await expect(modal.getByRole("heading", { name: "Flight 2" })).toBeVisible();
    // Flight 2 starts at Flight 1's destination (DXB) already.
    await expect(modal.getByRole("combobox", { name: "Origin" }).nth(1)).toHaveValue("DXB Dubai");
    await modal.getByRole("button", { name: "Search Flights" }).click();
    await expect(modal.getByText("Choose a destination")).toBeVisible();
    await expect(modal.getByText("Pick a date")).toBeVisible();
    await expect(modal.getByRole("combobox", { name: "Destination" }).nth(1)).toBeFocused();
    if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/after-e2e-modify-${width}.png` });
    await modal.getByRole("button", { name: "Add flight" }).click();
    await expect(modal.getByRole("heading", { name: "Flight 3" })).toBeVisible();
    await modal.getByRole("button", { name: "Remove Flight 3" }).click();
    await expect(modal.getByRole("heading", { name: "Flight 3" })).toHaveCount(0);
  });
}
