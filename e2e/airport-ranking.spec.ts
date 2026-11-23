import { expect, test, type Page } from "@playwright/test";
import { addDays, format } from "date-fns";
import { isLocal } from "./support/gateway";

// Issue #157: one airport ranking for the desktop dropdown and the phone picker (exact code, then the city's main
// airport; no military fields), and on desktop choosing From moves to To, choosing To opens the departure date.
// Nothing reaches a real gateway.

async function mock(page: Page) {
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    if (isLocal(url) && !url.pathname.startsWith("/__gateway")) return route.continue();
    return route.fulfill({ status: 503, json: { detail: "test" } });
  });
}

const card = (page: Page) => page.locator(".travelian-search-card");
const firstCodes = (page: Page, count = 3) => page.getByRole("option").evaluateAll(
  (options, n) => options.slice(0, n).map(option => option.querySelector("span.font-semibold")?.textContent?.trim()), count);

for (const width of [1440, 1024, 768]) {
  test.describe(`desktop dropdown at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    test("main airport first, no military field, From → To → departure date", async ({ page }) => {
      await mock(page);
      await page.goto("/");
      const from = card(page).getByRole("combobox", { name: "Origin" });
      const to = card(page).getByRole("combobox", { name: "Destination" });

      await from.click();
      await page.keyboard.type("lah");
      await expect.poll(() => firstCodes(page, 1)).toEqual(["LHE"]);
      await page.keyboard.press("Enter");
      await expect(from).toHaveValue("LHE Lahore");
      // Focus moved to To with its list open: typing goes to To, not to From.
      await expect(to).toBeFocused();
      await expect(page.getByRole("listbox")).toHaveCount(1);
      await page.keyboard.type("Dubai");
      await expect.poll(() => firstCodes(page, 5)).toEqual(expect.arrayContaining(["DXB", "DWC"]));
      expect((await firstCodes(page, 5))[0]).toBe("DXB");
      expect(await firstCodes(page, 20)).not.toContain("NHD");
      await page.keyboard.press("Enter");
      await expect(page.getByRole("dialog", { name: "Select departure date" })).toBeVisible();
      await expect(page.getByRole("listbox")).toHaveCount(0);
      if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/after-e2e-advance-${width}.png` });
      await page.getByRole("dialog", { name: "Select departure date" }).getByRole("button", { name: "Close" }).click();
      await expect(page.getByRole("dialog", { name: "Select departure date" })).toHaveCount(0);
      await expect(to).toHaveValue("DXB Dubai");
      await expect(from).toHaveValue("LHE Lahore");
    });

    test("exact code first; London, Jeddah", async ({ page }) => {
      await mock(page);
      await page.goto("/");
      const from = card(page).getByRole("combobox", { name: "Origin" });
      for (const [query, first] of [["IST", "IST"], ["London", "LHR"], ["Jeddah", "JED"], ["Lahore", "LHE"]]) {
        await page.reload();
        await from.click();
        await page.keyboard.type(query);
        await expect.poll(() => firstCodes(page, 1)).toEqual([first]);
      }
    });
  });
}

test("multi-city legs advance too: Flight 1 From → To", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mock(page);
  await page.goto("/");
  await card(page).getByRole("button", { name: "Multi-city", exact: true }).click();
  const origins = card(page).getByRole("combobox", { name: "Origin" });
  const destinations = card(page).getByRole("combobox", { name: "Destination" });
  await origins.first().click();
  await page.keyboard.type("Karachi");
  await expect.poll(() => firstCodes(page, 1)).toEqual(["KHI"]);
  await page.keyboard.press("Enter");
  await expect(destinations.first()).toBeFocused();
});

test("Modify Search: From → To → departure date", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mock(page);
  const depart = format(addDays(new Date(), 20), "yyyy-MM-dd");
  await page.goto(`/flights-search?from=KHI&to=JED&depart=${depart}&trip=oneway&adults=1&children=0&infants=0&cabin=Economy`);
  await page.getByRole("button", { name: /Modify Search/ }).first().click();
  const modal = page.getByRole("dialog", { name: "Modify Search" });
  await modal.getByRole("combobox", { name: "Origin" }).click();
  await page.keyboard.type("Dubai");
  await expect.poll(() => firstCodes(page, 1)).toEqual(["DXB"]);
  await page.keyboard.press("Enter");
  await expect(modal.getByRole("combobox", { name: "Destination" })).toBeFocused();
  await page.keyboard.type("lah");
  await expect.poll(() => firstCodes(page, 1)).toEqual(["LHE"]);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Select departure date" })).toBeVisible();
});

test.describe("phone picker uses the same ranking", () => {
  test.use({ viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true });
  test("lah → Lahore first, Dubai → DXB first, no NHD", async ({ page }) => {
    await mock(page);
    await page.goto("/");
    await card(page).getByRole("combobox", { name: "Origin" }).tap();
    const sheet = page.getByRole("dialog", { name: "Where from?" });
    await sheet.getByRole("combobox").fill("lah");
    await expect(sheet.getByRole("option").first()).toContainText("LHE");
    await sheet.getByRole("combobox").fill("dubai");
    await expect(sheet.getByRole("option").first()).toContainText("DXB");
    await expect(sheet.getByRole("option", { name: /NHD/ })).toHaveCount(0);
    if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/after-e2e-phone-dubai-390.png` });
  });
});
