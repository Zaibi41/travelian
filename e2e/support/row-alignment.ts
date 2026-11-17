import { expect, type Page } from "@playwright/test";

/** The search row's boxes (From, To, date, travelers, search button) have one height and one top edge,
 *  whatever the airport fields hold. `boxes` are CSS selectors for each box. */
export async function expectRowAligned(page: Page, boxes: string[]) {
  const rects = await page.evaluate(selectors => selectors.map(selector => {
    const element = document.querySelector(selector);
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return { selector, top: Math.round(rect.top), height: Math.round(rect.height) };
  }), boxes);
  for (const rect of rects) expect(rect, "every box is on the page").not.toBeNull();
  const [first] = rects;
  for (const rect of rects) expect({ selector: rect!.selector, top: rect!.top, height: rect!.height }).toEqual({ selector: rect!.selector, top: first!.top, height: first!.height });
}
