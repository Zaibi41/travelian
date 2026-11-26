import { expect, test } from "@playwright/test";
import { isLocal } from "./support/gateway";

for (const [width, height] of [[1366, 768], [1440, 900], [1920, 1080], [1024, 768], [768, 1024], [375, 812], [320, 740]]) {
  test(`shared product trust layers at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.route("**/*", route => isLocal(route.request().url())
      ? route.continue() : route.fulfill({ json: { items: [], groups: [], results: [] } }));
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    let baseline: unknown;
    // D39: Umrah is hidden. The homepage has no "Booking confidence" strip ("Why book with Travelian?" carries it); Group
    // Ticketing and Hotels keep it. Every product shows the same pills and the rotating tagline (#218).
    for (const [path, third, strip] of [["/", "Live + Group Fares", false], ["/group-ticketing", "Fixed Group Inventory", true],
      ["/hotels-search", "Hotel Booking Assistance", true]] as const) {
      await page.goto(path);
      const pills = page.getByRole("list", { name: "Travelian value highlights" });
      const trust = page.getByRole("region", { name: "Booking confidence" });
      await expect(pills.getByRole("listitem")).toHaveText(["Secure Payments", "WhatsApp Support", third]);
      await expect(pills.locator("svg[aria-hidden=true]")).toHaveCount(3);
      await expect(page.locator(".brand-tagline")).toHaveCount(1);
      if (strip) {
        await expect(trust.getByRole("listitem")).toHaveCount(3);
        for (const text of ["Registered Travel Company", "Documented Booking", "Human Support", "Operating from Johar Town, Lahore.", "Payment and booking details in writing.", "Help by WhatsApp and phone."]) await expect(trust.getByText(text, { exact: true })).toBeVisible();
        await expect(trust.locator("svg[aria-hidden=true]")).toHaveCount(3);
        expect(await trust.evaluate(element => element.previousElementSibling?.tagName)).toBe("SECTION");
      } else {
        await expect(trust).toHaveCount(0);
      }
      // The pills sit in the same place with the same icons on every product (the card above may differ in height).
      const geometry = await pills.evaluate(element => {
        const box = element.getBoundingClientRect();
        return { x: box.x, width: box.width, height: box.height, icons: [...element.querySelectorAll("svg")].map(svg => svg.innerHTML).length };
      });
      if (!baseline) baseline = geometry;
      else expect(geometry).toEqual(baseline);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      if (path === "/hotels-search") await page.screenshot({ path: `/tmp/travelian-product-trust-${width}.png` });
    }
    expect(errors).toEqual([]);
  });
}
