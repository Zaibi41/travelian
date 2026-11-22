import { expect, test, type Page } from "@playwright/test";
import { isLocal } from "./support/gateway";

// Issue #148: on phones From and To open a full-screen airport picker (not a dropdown hidden behind the keyboard);
// choosing From opens To, choosing To opens the departure date. Tablets and desktops keep the dropdown.
// Nothing reaches a real gateway: every request off this machine gets an empty answer.

async function openHome(page: Page) {
  await page.route("**/*", route => isLocal(route.request().url())
    ? route.continue() : route.fulfill({ json: { items: [], groups: [], results: [] } }));
  await page.goto("/");
  await expect(page.locator(".travelian-search-card")).toBeVisible();
}

const origin = (page: Page) => page.locator(".travelian-search-card").getByRole("combobox", { name: "Origin" });
const destination = (page: Page) => page.locator(".travelian-search-card").getByRole("combobox", { name: "Destination" });

for (const width of [390, 360]) {
  test.describe(`phone ${width}px`, () => {
    test.use({ viewport: { width, height: 780 }, isMobile: true, hasTouch: true });

    test("From → full-screen picker → Lahore → To picker → Dubai → departure date", async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await openHome(page);
      await origin(page).tap();

      const from = page.getByRole("dialog", { name: "Where from?" });
      await expect(from).toBeVisible();
      const box = await from.boundingBox();
      expect(box).toMatchObject({ x: 0, y: 0, width });
      expect(box!.height).toBeGreaterThanOrEqual(700);
      const search = from.getByRole("combobox", { name: "Where from?" });
      await expect(search).toBeFocused();
      await expect(from.getByText("Popular airports")).toBeVisible();
      await expect(from.getByRole("button", { name: "Back" })).toBeVisible();

      await page.keyboard.type("lah");
      const lahore = from.getByRole("option", { name: /Lahore.*LHE/ }).first();
      await expect(lahore).toBeVisible();
      await lahore.tap();

      const to = page.getByRole("dialog", { name: "Where to?" });
      await expect(to).toBeVisible();
      await expect(from).toBeHidden();
      await to.getByRole("combobox", { name: "Where to?" }).fill("dxb");
      await to.getByRole("option", { name: /Dubai.*DXB/ }).first().tap();

      const calendar = page.getByRole("dialog", { name: "Select departure date" });
      await expect(calendar).toBeVisible();
      await expect(to).toBeHidden();
      await page.keyboard.press("Escape");
      await expect(calendar).toBeHidden();
      await expect(origin(page)).toHaveValue(/LHE/);
      await expect(destination(page)).toHaveValue(/DXB/);
      // Each picker removed its own history entry again; the page is still the home page.
      await expect.poll(() => page.evaluate(() => Boolean(history.state?.travelianAirportPicker))).toBe(false);
      expect(new URL(page.url()).pathname).toBe("/");
      expect(errors).toEqual([]);
    });

    test("browser back and the back arrow close the picker without a change", async ({ page }) => {
      await openHome(page);
      await origin(page).tap();
      const from = page.getByRole("dialog", { name: "Where from?" });
      await expect(from).toBeVisible();
      await expect.poll(() => page.evaluate(() => Boolean(history.state?.travelianAirportPicker))).toBe(true);
      await page.evaluate(() => history.back());
      await expect(from).toBeHidden();
      expect(new URL(page.url()).pathname).toBe("/");
      await expect(origin(page)).toHaveValue("");
      await expect(page.getByRole("dialog", { name: "Where to?" })).toHaveCount(0);

      await origin(page).tap();
      await expect(from).toBeVisible();
      await page.keyboard.type("lah");
      await from.getByRole("button", { name: "Back" }).tap();
      await expect(from).toBeHidden();
      await expect(origin(page)).toHaveValue("");
      await expect(page.getByRole("dialog", { name: "Where to?" })).toHaveCount(0);
      await expect.poll(() => page.evaluate(() => Boolean(history.state?.travelianAirportPicker))).toBe(false);
    });

    test("From and To sit under the trip type row with the swap button between them", async ({ page }) => {
      await openHome(page);
      for (const trip of ["One-way", "Round-trip"]) {
        await page.getByRole("button", { name: trip, exact: true }).click();
        const fromBox = (await origin(page).boundingBox())!;
        const toBox = (await destination(page).boundingBox())!;
        const swap = page.locator(".travelian-search-card").getByRole("button", { name: "Swap origin and destination" });
        await expect(swap).toHaveCount(1);
        const swapBox = (await swap.boundingBox())!;
        expect(toBox.y).toBeGreaterThan(fromBox.y + fromBox.height);   // stacked
        expect(swapBox.width).toBeGreaterThanOrEqual(44);
        expect(swapBox.height).toBeGreaterThanOrEqual(44);
        expect(swapBox.y).toBeLessThan(fromBox.y + fromBox.height + 8);  // on the line between From and To
        expect(swapBox.y + swapBox.height).toBeGreaterThan(fromBox.y + fromBox.height);
        expect(swapBox.y + swapBox.height).toBeLessThan(toBox.y + 8);
        // No empty row above From: it starts right under the travellers / cabin row.
        const travellers = (await page.locator(".travelian-search-card").getByRole("button", { name: /Traveler/ }).first().boundingBox())!;
        expect(fromBox.y - (travellers.y + travellers.height)).toBeLessThan(56);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    });
  });
}

test("desktop 1440px keeps the dropdown, fully inside the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openHome(page);
  await origin(page).click();
  await expect(page.getByRole("dialog", { name: "Where from?" })).toHaveCount(0);
  const list = page.getByRole("listbox", { name: "Airports" });
  await expect(list).toBeVisible();
  const box = (await list.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(900);
  expect(box.x + box.width).toBeLessThanOrEqual(1440);
  await page.keyboard.type("lah");
  await page.getByRole("option", { name: /LHE/ }).first().click();
  await expect(origin(page)).toHaveValue(/LHE/);
  // No auto-advance on desktop.
  await expect(list).toBeHidden();
});
