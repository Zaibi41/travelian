import { expect, test } from "@playwright/test";
import { gatewayView } from "./support/gateway";

// Older admin pages (Agencies, Users, RBAC, Wallet, …) on the admin design system: each renders
// its heading with no page error, no text under 12px and no sideways scroll, at 1280 and 390px.
// Local-only session; gateway and legacy answers are made up and empty. /admin/settings is left
// out: it crashes on an empty legacy settings answer (known, docs/roadmap.md).
if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

const PAGES: [string, string][] = [
  ["/admin/agencies", "Agency Management"], ["/admin/packages", "Umrah Package Management"], ["/admin/reports", "Reports"],
  ["/admin/hotels", "Hotel Inventory & Pricing"], ["/admin/flights", "Flight Pricing & Rules"], ["/admin/flight-bookings", "Flight Operations"],
  ["/admin/requests", "Bookings"], ["/admin/wallet", "Wallets"], ["/admin/payments", "Payments"], ["/admin/users", "User Management"],
  ["/admin/rbac", "Access Control (RBAC)"], ["/admin/provider-systems", "Provider Systems"], ["/admin/group-ticketing", "Group Ticketing Collections"],
  ["/admin/coupons", "Coupons & Deals"], ["/admin/blog", "Blog Management"], ["/admin/notifications", "Notifications"],
  ["/admin/announcements", "Announcements"], ["/admin/attention-queue", "Attention Queue"],
];

for (const width of [1280, 390]) {
  for (const [path, heading] of PAGES) {
    test(`${path} at ${width}px: readable, no sideways scroll, no page error`, async ({ page }) => {
      test.setTimeout(45_000);
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.setViewportSize({ width, height: 900 });
      await page.route("**/*", route => {
        const url = gatewayView(route.request().url());
        if (url.port === "8000") return route.fulfill({ status: 404, json: { detail: "Not found." } });
        return ["localhost", "127.0.0.1"].includes(url.hostname) ? route.continue() : route.fulfill({ json: { items: [], groups: [], results: [] } });
      });
      await page.addInitScript(() => localStorage.setItem("travelian.session.v1", JSON.stringify({
        email: "layout-test@travelian.com", groups: ["super_admin"], name: "Layout Test", createdAt: new Date().toISOString(),
        accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
      })));
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
      await page.waitForLoadState("networkidle");
      const tooSmall = await page.evaluate(() => [...document.querySelectorAll("body *")].filter(element => {
        const own = [...element.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent!.trim());
        const rect = element.getBoundingClientRect();
        return own && rect.width > 0 && rect.height > 0 && parseFloat(getComputedStyle(element).fontSize) < 12;
      }).map(element => `${getComputedStyle(element).fontSize} "${element.textContent!.trim().slice(0, 40)}"`));
      expect(tooSmall).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
      expect(errors).toEqual([]);
    });
  }
}
