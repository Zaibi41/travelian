import { expect, test } from "@playwright/test";
import { isLocal } from "./support/gateway";

const sizes = [1280, 1366, 1440, 1536, 1600, 1920, 2048, 2560, 1024, 768, 640, 375, 320].map(width => ({ width, scale: 1 }));
sizes.push({ width: 1536, scale: 1.25 }, { width: 1280, scale: 1.5 });
for (const { width, scale } of sizes) {
  test(`canonical trust geometry at ${width}px and DPR ${scale}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: scale });
    const page = await context.newPage();
    await page.route("**/*", route => isLocal(route.request().url())
      ? route.continue() : route.fulfill({ json: { items: [], groups: [], results: [] } }));
    await page.goto("/");
    const trust = page.getByRole("region", { name: "Booking confidence" });
    await expect(trust.getByRole("listitem")).toHaveCount(3);
    const geometry = await trust.evaluate(section => {
      const box = (element: Element) => { const rect = element.getBoundingClientRect(); return { left: rect.left, right: rect.right, width: rect.width, top: rect.top + scrollY, bottom: rect.bottom + scrollY }; };
      const grid = section.querySelector("ul")!;
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
      const items = [...grid.children].map(element => ({ ...box(element), block: box(element.firstElementChild!), align: getComputedStyle(element).textAlign, innerAlign: getComputedStyle(element.querySelector("p")!).textAlign }));
      return { card: box(card), grid: box(grid), section: box(section), popular: box(popular), popularContainer, other: box([...document.querySelectorAll("h2")].find(element => element.textContent?.trim() === "Why book with Travelian?")!), pills: box(pills), pillItems, items, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    for (const bounds of [geometry.grid, geometry.popularContainer, geometry.pills]) {
      expect(Math.abs(bounds.left - geometry.card.left)).toBeLessThan(0.1);
      expect(Math.abs(bounds.right - geometry.card.right)).toBeLessThan(0.1);
    }
    expect(geometry.popular.left).toBeCloseTo(geometry.card.left, 1);
    expect(geometry.other.left).toBeCloseTo(geometry.card.left, 1);
    expect(geometry.section.left).toBe(0);
    expect(geometry.section.width).toBe(width);
    if (width >= 768) {
      const widths = geometry.items.map(item => item.width);
      expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(0.1);
      expect(new Set(geometry.items.map(item => item.top)).size).toBe(1);
      expect(geometry.items[0].left).toBeCloseTo(geometry.card.left, 1);
      expect(geometry.items[2].right).toBeCloseTo(geometry.card.right, 1);
      for (const item of geometry.items) {
        expect(Math.abs((item.left + item.right) / 2 - (item.block.left + item.block.right) / 2)).toBeLessThan(0.1);
        expect(item.innerAlign).toBe("left");
      }
      const pillLeft = Math.min(...geometry.pillItems.map(item => item.left));
      const pillRight = Math.max(...geometry.pillItems.map(item => item.right));
      expect((pillLeft + pillRight) / 2).toBeCloseTo((geometry.card.left + geometry.card.right) / 2, 1);
    } else {
      for (const item of geometry.items) expect(item.block.left).toBeCloseTo(geometry.grid.left, 1);
      for (let index = 1; index < geometry.items.length; index++) expect(geometry.items[index].top).toBeGreaterThan(geometry.items[index - 1].bottom);
    }
    for (const item of geometry.items) expect(item.align).toBe("left");
    expect(geometry.overflow).toBe(false);
    if (scale !== 1) {
      await trust.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `/tmp/travelian-trust-${width}-dpr-${scale}.png` });
    }
    await context.close();
  });
}
