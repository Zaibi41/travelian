import { expect, test } from "@playwright/test";
import { isLocal } from "./support/gateway";

for (const width of [1920, 1440, 1366, 1024, 768, 375, 320]) {
  test(`canonical product navigation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", route => {
            return isLocal(route.request().url())
        ? route.continue()
        : route.fulfill({ json: { items: [], groups: [], results: [] } });
    });
    await page.goto("/");
    const tabs = page.getByRole("group", { name: "Travelian products" });
    // D39: Umrah is hidden while the gateway switch is off (the default; the gateway call is not answered here).
    const labels = ["Flights", "Group Ticketing", "Hotels"];
    await expect(tabs.getByRole("button", { name: "Umrah", exact: true })).toHaveCount(0);
    const initial = await tabs.boundingBox();
    const cardHeight = await page.locator(".travelian-search-card").evaluate(element => element.getBoundingClientRect().height);
    for (const [name, path] of [["Hotels", "/hotels-search"], ["Group Ticketing", "/group-ticketing"], ["Flights", "/"]]) {
      await tabs.getByRole("button", { name, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(tabs.getByRole("button")).toHaveText(labels);
      await expect(tabs.getByRole("button", { name, exact: true })).toHaveAttribute("aria-pressed", "true");
      const bounds = await tabs.boundingBox();
      // Same card height on every product from 640px; on phones the Group form is shorter (#161).
      if (width >= 640) await expect.poll(() => page.locator(".travelian-search-card").evaluate(element => element.getBoundingClientRect().height)).toBe(cardHeight);
      expect(bounds!.width).toBeCloseTo(initial!.width, 0);
      expect(bounds!.y).toBeCloseTo(initial!.y, 0);
      const boxes = await tabs.getByRole("button").evaluateAll(elements => elements.map(element => element.getBoundingClientRect().width));
      expect(Math.max(...boxes) - Math.min(...boxes)).toBeLessThan(1);
      for (const label of labels) await expect(tabs.getByRole("button", { name: label, exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    }
    await page.keyboard.press("Tab");
    await tabs.getByRole("button", { name: "Hotels", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/hotels-search$/);
    expect(errors).toEqual([]);
  });
}
