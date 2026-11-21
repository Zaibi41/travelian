import { expect, test } from "@playwright/test";
import { SITE_URL, SOCIAL_LINKS, SUPPORT_ADDRESS, SUPPORT_EMAIL, SUPPORT_PHONE_TEL } from "../src/lib/site-config";
import { isLocal } from "./support/gateway";

const products = [["Flights", "/"], ["Group Ticketing", "/group-ticketing"], ["Hotels", "/hotels-search"], ["Umrah", "/umrah-packages"]];
const policies = [["FAQ", "/faq"], ["Terms & Conditions", "/terms"], ["Privacy Policy", "/privacy"], ["Refund / Cancellation Policy", "/terms"]];

for (const [width, height] of [[1366, 768], [1440, 900], [1920, 1080], [1024, 768], [768, 1024], [375, 812], [320, 740]]) {
  test(`footer information and responsive layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.route("**/*", route => isLocal(route.request().url())
      ? route.continue() : route.fulfill({ json: { items: [], groups: [], results: [] } }));
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await footer.scrollIntoViewIfNeeded();
    await expect(footer.getByRole("navigation")).toHaveCount(3);
    const productNav = footer.getByRole("navigation", { name: "Products", exact: true });
    await expect(productNav.getByRole("link")).toHaveText(products.map(([name]) => name));
    for (const [name, path] of products) await expect(productNav.getByRole("link", { name, exact: true })).toHaveAttribute("href", path);
    const company = footer.getByRole("navigation", { name: "Company", exact: true });
    await expect(company.getByRole("link", { name: "About", exact: true })).toHaveAttribute("href", "/about");
    await expect(company.getByRole("link", { name: "Contact", exact: true })).toHaveAttribute("href", "/contact");
    const support = footer.getByRole("navigation", { name: "Support & Policies", exact: true });
    for (const [name, path] of policies) await expect(support.getByRole("link", { name, exact: true })).toHaveAttribute("href", path);
    await expect(footer.getByText(SUPPORT_ADDRESS, { exact: true })).toBeVisible();
    await expect(footer.locator('a[href^="tel:"]')).toHaveAttribute("href", `tel:${SUPPORT_PHONE_TEL}`);
    await expect(footer.locator('a[href^="mailto:"]')).toHaveAttribute("href", `mailto:${SUPPORT_EMAIL}`);
    await expect(footer.getByRole("link", { name: "www.travelian.pk", exact: true })).toHaveAttribute("href", SITE_URL);
    for (const social of SOCIAL_LINKS) {
      const link = footer.getByRole("link", { name: `Travelian on ${social.label}`, exact: true });
      await expect(link).toHaveAttribute("href", social.href);
      const box = await link.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    await expect(footer.getByRole("img", { name: "Travelian", exact: true })).toHaveAttribute("src", "/travelian-logo-wordmark-dark.png");
    const link = productNav.getByRole("link", { name: "Group Ticketing", exact: true });
    await page.keyboard.press("Tab");
    await link.focus();
    await expect(link).toHaveCSS("outline-style", "solid");
    await expect(link).toHaveCSS("outline-width", "2px");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.screenshot({ path: `/tmp/travelian-footer-${width}.png` });
  });
}

test("footer links reach existing product, company, and legal pages", async ({ page }) => {
  await page.route("**/*", route => isLocal(route.request().url())
    ? route.continue() : route.fulfill({ json: { items: [], groups: [], results: [] } }));
  await page.goto("/");
  for (const [name, path] of [...products.slice(1), ["About", "/about"], ["Contact", "/contact"], ...policies]) {
    const footer = page.getByRole("contentinfo");
    await footer.getByRole("navigation").getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("main")).not.toContainText("Page not found");
  }
  await expect(page.getByRole("heading", { name: "2. Cancellation Policy", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "3. Refund Policy", exact: true })).toBeVisible();
});
