import { expect, type Page } from "@playwright/test";

/** Every visible piece of text is at least 12px; field labels and table text at least 13px (tags 12px);
 *  and the page has no sideways scroll. Screen-reader-only text is ignored. */
export async function expectReadableText(page: Page, where: string) {
  const problems = await page.evaluate(() => {
    const found: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set<Element>();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const element = node.parentElement;
      if (!element || seen.has(element) || !node.textContent?.trim()) continue;
      seen.add(element);
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (rect.width <= 1 || rect.height <= 1 || style.visibility === "hidden" || style.display === "none" || style.opacity === "0") continue;
      if (element.closest("svg") && !element.closest(".recharts-cartesian-axis-tick")) continue;
      const size = parseFloat(style.fontSize);
      // Tags and badges (h-badge) may be 12px even inside a table cell.
      const min = element.closest("label, td, th") && !element.closest(".h-badge") ? 13 : 12;
      if (size < min - 0.01) found.push(`${size}px < ${min}px: "${node.textContent.trim().slice(0, 40)}" <${element.tagName.toLowerCase()} class="${element.getAttribute("class")?.slice(0, 80) ?? ""}">`);
    }
    return found;
  });
  expect(problems, `text too small on ${where}`).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `sideways scroll on ${where}`).toBe(0);
}
