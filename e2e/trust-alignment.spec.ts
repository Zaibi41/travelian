import { expect, test } from "@playwright/test";
import { isLocal } from "./support/gateway";

// The homepage has no separate trust strip ("Booking confidence"): "Why book with Travelian?"
// carries those messages (UI review, 24 Nov 2026). Hotels, Group Ticketing and Packages keep it.
// What stays canonical on the homepage: the value pills, Popular routes and Why book line up
// with the search card, with no sideways scroll.
const sizes = [1280, 1366, 1440, 1536, 1600, 1920, 2048, 2560, 1024, 768, 640, 375, 320].map(width => ({ width, scale: 1 }));
sizes.push({ width: 1536, scale: 1.25 }, { width: 1280, scale: 1.5 });
for (const { width, scale } of sizes) {
  test(`canonical trust geometry at ${width}px and DPR ${scale}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: scale });
    const page = await context.newPage();
    await page.route("**/*", route => isLocal(route.request().url())
      ? route.continue() : route.fulfill({ json: { items: [], groups: [], results: [] } }));
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Why book with Travelian?" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Booking confidence" })).toHaveCount(0);
    const geometry = await page.evaluate(() => {
      const box = (element: Element) => { const rect = element.getBoundingClientRect(); return { left: rect.left, right: rect.right, width: rect.width, top: rect.top + scrollY, bottom: rect.bottom + scrollY }; };
      const card = document.querySelector(".travelian-search-card")!;
      const popular = document.querySelector("#popular-routes-heading")!;
      const pills = document.querySelector('[aria-label="Travelian value highlights"]')!;
      const popularOuter = popular.closest(".travelian-container")!;
      const padding = getComputedStyle(popularOuter);
      const popularContainer = box(popularOuter);
      popularContainer.left += parseFloat(padding.paddingLeft);
      popularContainer.right -= parseFloat(padding.paddingRight);
      popularContainer.width = popularContainer.right - popularContainer.left;
      const pillItems = [...pills.children].map(box);
      return { card: box(card), popular: box(popular), popularContainer, other: box([...document.querySelectorAll("h2")].find(element => element.textContent?.trim() === "Why book with Travelian?")!), pills: box(pills), pillItems, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    for (const bounds of [geometry.popularContainer, geometry.pills]) {
      expect(Math.abs(bounds.left - geometry.card.left)).toBeLessThan(0.1);
      expect(Math.abs(bounds.right - geometry.card.right)).toBeLessThan(0.1);
    }
    expect(geometry.popular.left).toBeCloseTo(geometry.card.left, 1);
    expect(geometry.other.left).toBeCloseTo(geometry.card.left, 1);
    if (width >= 768) {
      const pillLeft = Math.min(...geometry.pillItems.map(item => item.left));
      const pillRight = Math.max(...geometry.pillItems.map(item => item.right));
      expect((pillLeft + pillRight) / 2).toBeCloseTo((geometry.card.left + geometry.card.right) / 2, 1);
    }
    expect(geometry.overflow).toBe(false);
    if (scale !== 1) await page.screenshot({ path: `/tmp/travelian-trust-${width}-dpr-${scale}.png` });
    await context.close();
  });
}
