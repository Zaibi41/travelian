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
    for (const [path, third] of [["/", "Live + Group Fares"], ["/group-ticketing", "Fixed Group Inventory"], ["/hotels-search", "Hotel Booking Assistance"], ["/umrah-packages", "Custom + Ready Packages"]]) {
      await page.goto(path);
      const pills = page.getByRole("list", { name: "Travelian value highlights" });
      const trust = page.getByRole("region", { name: "Booking confidence" });
      await expect(pills.getByRole("listitem")).toHaveText(["Secure Payments", "WhatsApp Support", third]);
      await expect(trust.getByRole("listitem")).toHaveCount(3);
      for (const text of ["Registered Travel Company", "Documented Booking", "Human Support", "Operating from Johar Town, Lahore.", "Payment and booking details in writing.", "Help by WhatsApp and phone."]) await expect(trust.getByText(text, { exact: true })).toBeVisible();
      await expect(pills.locator("svg[aria-hidden=true]")).toHaveCount(3);
      await expect(trust.locator("svg[aria-hidden=true]")).toHaveCount(3);
      const geometry = await pills.evaluate(element => {
        const strip = document.querySelector('[aria-label="Booking confidence"]')!;
        const hero = element.closest("section")!;
        const card = hero.querySelector(".travelian-search-card")!;
        const rect = (node: Element) => {
          const box = node.getBoundingClientRect();
          return { x: box.x, y: box.y + scrollY, width: box.width, height: box.height };
        };
        return { pills: rect(element), strip: rect(strip), card: rect(card), icons: [...element.querySelectorAll("svg")].map(svg => svg.innerHTML) };
      });
      if (!baseline) baseline = geometry;
      else expect(geometry).toEqual(baseline);
      expect(await trust.evaluate(element => element.previousElementSibling?.tagName)).toBe("SECTION");
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      if (path === "/hotels-search") await page.screenshot({ path: `/tmp/travelian-product-trust-${width}.png` });
    }
    expect(errors).toEqual([]);
  });
}
