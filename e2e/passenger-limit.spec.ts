import { expect, test } from "@playwright/test";
import { isLocal } from "./support/gateway";

for (const width of [1440, 1024, 768, 375, 320]) {
  test(`traveler total is capped at nine at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.route("**/*", route => isLocal(route.request().url())
      ? route.continue() : route.fulfill({ json: { items: [], groups: [], results: [] } }));
    await page.goto("/");
    await page.getByRole("button", { name: "1 Traveler", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Travelers", exact: true });
    const count = dialog.getByRole("status", { name: "Passenger count" });
    await expect(count).toHaveText("1/9");
    await dialog.getByRole("button", { name: "Increase Adults", exact: true }).click();
    for (let index = 0; index < 6; index++) await dialog.getByRole("button", { name: "Increase Children", exact: true }).click();
    await dialog.getByRole("button", { name: "Increase Infants", exact: true }).click();
    await expect(count).toHaveText("9/9");
    for (const label of ["Adults", "Children", "Infants"]) await expect(dialog.getByRole("button", { name: `Increase ${label}`, exact: true })).toBeDisabled();
    const box = await dialog.boundingBox();
    const done = await dialog.getByRole("button", { name: "Done", exact: true }).boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    expect(done!.y + done!.height).toBeLessThanOrEqual(850);
    await dialog.getByRole("button", { name: "Decrease Children", exact: true }).click();
    await expect(count).toHaveText("8/9");
    for (const label of ["Adults", "Children", "Infants"]) await expect(dialog.getByRole("button", { name: `Increase ${label}`, exact: true })).toBeEnabled();
    await dialog.getByRole("button", { name: "Done", exact: true }).click();
    await page.getByRole("button", { name: "8 Travelers", exact: true }).click();
    await expect(count).toHaveText("8/9");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  });
}
