import { expect, test, type Page } from "@playwright/test";
import { isLocal } from "./support/gateway";

// #159: "Find my booking" (guests) / "My Bookings" (signed in) in the desktop header, the mobile menu's Quick Links, the
// footer's Support column and Contact → Existing Bookings; each opens the page. Nothing reaches a real gateway.
const SHOTS = process.env.SHOTS_DIR;
const TAG = process.env.SHOT_TAG || "after";
const ONLY_SHOTS = process.env.SHOT_ONLY === "1";

async function offline(page: Page) {
  await page.route("**/*", route => isLocal(route.request().url()) ? route.continue() : route.fulfill({ json: { items: [], groups: [], results: [] } }));
}
const noSideScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth > innerWidth);

for (const [width, height] of [[1440, 900], [1024, 800], [768, 1024], [390, 844]]) {
  test(`Find my booking is linked from the header or menu, footer and Contact at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await offline(page);
    await page.goto("/");
    const header = page.getByRole("banner", { name: "Travelian header" });
    if (width >= 1024) {
      if (SHOTS) await header.screenshot({ path: `${SHOTS}/header-${width}-${TAG}.png` });
      if (!ONLY_SHOTS) {
        const link = header.getByRole("link", { name: "Find my booking" });
        await expect(link).toBeVisible();
        const sign = (await header.getByRole("link", { name: "Sign In" }).boundingBox())!;
        const own = (await link.boundingBox())!;
        expect(own.x + own.width).toBeLessThanOrEqual(sign.x + 1);          // next to Sign In, no overlap
      }
    } else {
      await page.getByRole("button", { name: "Open menu" }).click();
      const menu = page.locator("#mobile-navigation");
      await expect(menu).toBeVisible();
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/menu-${width}-${TAG}.png` });
      if (!ONLY_SHOTS) {
        const link = menu.getByRole("region", { name: "Quick Links" }).getByRole("link", { name: "Find my booking" });
        await expect(link).toBeVisible();
        expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        await link.click();
        await expect(page).toHaveURL(/\/find-booking$/);
        await page.goto("/");
      }
    }
    const footer = page.locator("footer");
    await footer.scrollIntoViewIfNeeded();
    if (SHOTS) await footer.screenshot({ path: `${SHOTS}/footer-${width}-${TAG}.png` });
    if (!ONLY_SHOTS) {
      await footer.getByRole("link", { name: "Find my booking" }).click();
      await expect(page).toHaveURL(/\/find-booking$/);
    }
    await page.goto("/contact");
    const box = page.getByRole("heading", { name: "Existing Bookings" }).locator("xpath=..");
    await box.scrollIntoViewIfNeeded();
    if (SHOTS) await box.screenshot({ path: `${SHOTS}/contact-${width}-${TAG}.png` });
    if (ONLY_SHOTS) return;
    await box.getByRole("link", { name: "Find my booking" }).click();
    await expect(page).toHaveURL(/\/find-booking$/);
    // Wrong reference: the page's existing message.
    expect(await noSideScroll(page)).toBe(false);
  });
}

test("signed in: the header says My Bookings and opens /my-bookings", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await offline(page);
  await page.addInitScript(() => localStorage.setItem("travelian.session.v1", JSON.stringify({
    email: "customer@example.invalid", name: "Ali", createdAt: new Date().toISOString(), groups: [], expiresAt: Date.now() + 3_600_000 })));
  await page.goto("/");
  const header = page.getByRole("banner", { name: "Travelian header" });
  await header.getByRole("link", { name: "My Bookings" }).click();
  await expect(page).toHaveURL(/\/my-bookings$/);
});

test("sticky header on the results page at 1024px: Find my booking doesn't overlap the service links", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await offline(page);
  await page.goto("/flights-search?from=LHE&to=DXB&depart=2026-12-15&adults=1&children=0&infants=0&cabin=Economy&trip=oneway");
  const header = page.getByRole("banner", { name: "Travelian header" });
  const link = header.getByRole("link", { name: "Find my booking" });
  await expect(link).toBeVisible();
  if (SHOTS) await header.screenshot({ path: `${SHOTS}/header-sticky-1024-${TAG}.png` });
  const own = (await link.boundingBox())!;
  for (const service of await header.getByRole("navigation", { name: "Main navigation" }).getByRole("link").all()) {
    if (!(await service.isVisible())) continue;
    const box = (await service.boundingBox())!;
    const overlaps = box.x < own.x + own.width && own.x < box.x + box.width && box.y < own.y + own.height && own.y < box.y + box.height;
    expect(overlaps, await service.innerText()).toBe(false);
  }
});

test("a wrong reference on Find my booking shows the existing message", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/*", route => {
    if (route.request().url().includes("/v1/public/bookings/lookup")) {
      return route.fulfill({ status: 404, json: { detail: "No booking with that reference and contact.", code: "not_found" } });
    }
    return isLocal(route.request().url()) ? route.continue() : route.fulfill({ json: {} });
  });
  await page.goto("/contact");
  await page.getByRole("link", { name: "Find my booking" }).last().click();
  await page.getByLabel("Booking reference").fill("TRV-WRONG1");
  await page.getByLabel("Email or phone").fill("ali@example.invalid");
  await page.getByRole("button", { name: "Find booking" }).click();
  await expect(page.getByRole("alert").or(page.getByText(/No booking|not found|couldn't find/i)).first()).toBeVisible();
});
