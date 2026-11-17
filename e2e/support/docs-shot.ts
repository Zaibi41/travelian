import type { Page } from "@playwright/test";

/** A screenshot for the docs (e.g. DOCS_RENDER_DIR=docs/2026-11-15), only when that folder is given; tests never
 *  depend on it. The viewport is grown to the page height first, so sticky bars stay where they belong. */
export async function docsShot(page: Page, name: string) {
  const dir = process.env.DOCS_RENDER_DIR;
  if (!dir) return;
  const size = page.viewportSize();
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  if (size) await page.setViewportSize({ width: size.width, height: Math.min(height, 4000) });
  await page.screenshot({ path: `${dir}/${name}.png` });
  if (size) await page.setViewportSize(size);
}
