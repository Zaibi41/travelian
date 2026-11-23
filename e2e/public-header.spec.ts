import { expect, test } from "@playwright/test";
import { isLocal } from "./support/gateway";

const widths = [1280, 1366, 1440, 1536, 1600, 1920, 2048, 2560, 1024, 768, 375, 320];
// D39: Umrah is hidden while the gateway switch is off.
const products = [["Flights", "/"], ["Group Ticketing", "/group-ticketing"], ["Hotels", "/hotels-search"]];
for (const width of widths) {
  test(`search-driven header states at ${width}px`, async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/*", route => isLocal(route.request().url())
      ? route.continue() : route.fulfill({ json: { items: [], groups: [], results: [] } }));
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    for (const [active, path] of products) {
      await page.goto(path);
      const header = page.getByRole("banner", { name: "Travelian header" });
      const panel = header.locator("[data-header-state]");
      const shell = page.locator("[data-product-search-navigation]").first();
      await expect(shell).toBeVisible();
      await expect(panel).toHaveAttribute("data-header-state", "top");
      await expect(header.getByRole("link", { name: "Travelian home" })).toBeVisible();
      const geometry = await shell.evaluate(element => { const box = element.getBoundingClientRect(); return { top: box.top + scrollY, bottom: box.bottom + scrollY, height: box.height }; });
      const scroll = async (top: number, state: string) => {
        await page.evaluate(top => scrollTo(0, top), top);
        await expect(panel).toHaveAttribute("data-header-state", state);
      };
      // A fixed 100px trigger would fail this step: the search shell is still visible.
      await scroll(120, "search");
      await expect(panel).toHaveAttribute("aria-hidden", "true");
      expect(await panel.evaluate(element => element.inert)).toBe(true);
      await scroll(geometry.bottom + 12, "sticky");
      await expect(panel).toHaveCSS("height", "57px"); // 56px bar + 1px border
      await expect.poll(() => panel.evaluate(element => element.getBoundingClientRect().top)).toBe(0);
      await expect(header.getByRole("link", { name: "Travelian home" })).toBeVisible();
      const logoBox = await header.getByRole("link", { name: "Travelian home" }).boundingBox();
      expect(logoBox!.width).toBeLessThanOrEqual(128);
      const desktop = width >= 1024;
      if (!desktop) await header.getByRole("button", { name: "Open menu", exact: true }).click();
      for (const [name] of products) await expect(header.getByRole("link", { name, exact: true })).toBeVisible();
      await expect(header.getByRole("link", { name: active, exact: true })).toHaveAttribute("aria-current", "page");
      await expect(header.getByRole("link", { name: "Sign In", exact: true })).toBeVisible();
      await header.getByRole("button", { name: /Select currency/ }).click();
      await expect(page.getByRole("menu")).toBeVisible();
      const menuBox = await page.getByRole("menu").boundingBox();
      expect(menuBox!.x).toBeGreaterThanOrEqual(0);
      expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(width);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("menu")).toHaveCount(0);
      await page.keyboard.press("Tab");
      const flight = header.getByRole("link", { name: "Flights", exact: true });
      await flight.focus();
      await expect(flight).toHaveCSS("outline-style", "solid");
      if (desktop) {
        const navBox = await flight.locator("..").boundingBox();
        expect(Math.abs(navBox!.x + navBox!.width / 2 - width / 2)).toBeLessThan(1);
        const controls = await header.getByLabel("Account and preferences").boundingBox();
        const last = await header.getByRole("link", { name: "Hotels", exact: true }).boundingBox();
        expect(last!.x + last!.width).toBeLessThan(controls!.x);
        await expect(header.getByRole("link", { name: "Request a Booking", exact: true })).toHaveCount(0);
      } else {
        await expect(header.getByRole("link", { name: "Request a Booking", exact: true })).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(header.getByRole("button", { name: "Open menu", exact: true })).toBeFocused();
      }
      await scroll(geometry.bottom + 4, "sticky");
      await scroll(geometry.bottom - 4, "sticky");
      await scroll(geometry.bottom - 12, "search");
      await scroll(geometry.bottom + 4, "search");
      await scroll(geometry.bottom + 12, "sticky");
      const currentTop = await shell.evaluate(element => element.getBoundingClientRect().top + scrollY);
      expect(currentTop).toBe(geometry.top);
      await scroll(0, "top");
      await expect(panel).toHaveAttribute("aria-hidden", "false");
      // Desktop: no Request a Booking link in the header (removed; the phone menu keeps it).
      if (desktop) await expect(header.getByRole("link", { name: "Request a Booking", exact: true })).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    }
    expect(errors).toEqual([]);
    await page.screenshot({ path: `/tmp/travelian-search-header-${width}.png` });
  });
}

test("search-driven header respects reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const bottom = await page.locator("[data-product-search-navigation]").first().evaluate(element => element.getBoundingClientRect().bottom + scrollY);
  await page.evaluate(top => scrollTo(0, top), bottom + 12);
  const panel = page.locator("[data-header-state]");
  await expect(panel).toHaveAttribute("data-header-state", "sticky");
  await expect(panel).toHaveCSS("transition-property", "none");
});


test("sticky product links reset correctly and deep reload restores sticky", async ({ page }) => {
  await page.route("**/*", route => isLocal(route.request().url()) ? route.continue() : route.fulfill({ json: { items: [], groups: [], results: [] } }));
  await page.goto("/");
  const panel = page.locator("[data-header-state]");
  for (const [name, path] of [...products.slice(1), products[0]]) {
    await page.locator("[data-product-search-navigation]").evaluate(element => scrollTo(0, element.getBoundingClientRect().bottom + scrollY + 100));
    await expect(panel).toHaveAttribute("data-header-state", "sticky");
    await panel.getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(path === "/" ? "/$" : path + "$"));
    await expect(panel).toHaveAttribute("data-header-state", "top");
    // At the top the products are the search card's tabs (the header shows them once it is sticky).
    await expect(page.getByRole("group", { name: "Travelian products" }).getByRole("button", { name, exact: true })).toHaveAttribute("aria-current", "page");
  }
  await page.evaluate(() => scrollTo(0, 900));
  await expect(panel).toHaveAttribute("data-header-state", "sticky");
  await page.reload();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(500);
  await expect(panel).toHaveAttribute("data-header-state", "sticky");
});
