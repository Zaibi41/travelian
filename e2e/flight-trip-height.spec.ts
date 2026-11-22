import { expect, test } from "@playwright/test";
import { isLocal } from "./support/gateway";
import { MAX_MULTI_CITY_FLIGHTS } from "../src/lib/flight-search-limits";

for (const [width, height] of [[1366, 768], [1440, 900], [1920, 1080], [1024, 768], [768, 1024], [375, 812], [320, 740]]) {
  test(`flight trip forms collapse after multi-city at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.route("**/*", route => isLocal(route.request().url())
      ? route.continue() : route.fulfill({ json: { items: [], groups: [], results: [] } }));
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("/");
    const card = page.locator(".travelian-search-card");
    const cardHeight = () => card.evaluate(element => element.getBoundingClientRect().height);
    const switchTrip = async (name: string) => {
      await page.getByRole("button", { name, exact: true }).click();
      // Remove automatic click scrolling from geometry checks and hide the fixed header.
      await page.evaluate(() => scrollTo(0, 0));
    };
    const oneWay = await cardHeight();
    // The From field is a combobox named "Origin" (its value shows the airport). Below 768px it opens the full-screen
    // airport picker (#148), which opens To next after a choice; that To picker is closed here.
    const origin = page.locator(".travelian-search-card").getByRole("combobox", { name: "Origin" });
    await origin.click();
    await page.getByRole("option", { name: /LHE/ }).first().click();
    if (width < 768) {
      await expect(page.getByRole("dialog", { name: "Where to?" })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog", { name: "Where to?" })).toHaveCount(0);
    }
    await switchTrip("Round-trip");
    const roundTrip = await cardHeight();
    expect(roundTrip).toBe(oneWay);
    await expect(page.getByLabel("Return Date", { exact: true })).toBeVisible();
    await switchTrip("Multi-city");
    await expect(page.locator(".unified-search-segment-grid")).toHaveCount(2);
    await switchTrip("One-way");
    await expect.poll(cardHeight).toBe(oneWay);
    await expect(origin).toHaveValue(/LHE/);
    await expect(page.locator(".unified-search-segment-grid")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Select date", exact: true })).toHaveCount(0);
    for (const count of [2, 3, MAX_MULTI_CITY_FLIGHTS]) {
      await switchTrip("Multi-city");
      while (await page.locator(".unified-search-segment-grid").count() < count) await page.getByRole("button", { name: "Add Flight", exact: true }).click();
      await expect(page.locator(".unified-search-segment-grid")).toHaveCount(count);
      expect(await cardHeight()).toBeGreaterThanOrEqual(oneWay);
      if (count > 2) expect(await cardHeight()).toBeGreaterThan(oneWay);
      const rows = await page.locator(".unified-search-segment-grid").evaluateAll(elements => elements.map(element => {
        const box = element.getBoundingClientRect();
        return { top: box.top, bottom: box.bottom };
      }));
      for (let index = 1; index < rows.length; index++) expect(rows[index].top).toBeGreaterThanOrEqual(rows[index - 1].bottom);
      const submit = card.getByRole("button", { name: "Search Flights", exact: true });
      const submitBox = await submit.boundingBox();
      const last = rows.at(-1)!;
      expect(submitBox!.y).toBeGreaterThanOrEqual(last.bottom);
      await switchTrip("Round-trip");
      await expect.poll(cardHeight).toBe(roundTrip);
      await expect(page.locator(".unified-search-segment-grid")).toHaveCount(0);
      await switchTrip("One-way");
      await expect.poll(cardHeight).toBe(oneWay);
      await expect(origin).toHaveValue(/LHE/);
    }
    expect(await page.locator(".unified-search-content").getAttribute("style")).toBeNull();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    expect(errors).toEqual([]);
  });
}
