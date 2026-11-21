import { expect, type Page } from "@playwright/test";
import { APP_URL, gatewayView, isLocal } from "./gateway";

// Finance specs: a local-only admin session and gateway answers from the spec. Any /v1/ call is answered here
// (direct gateway, the dev /__gateway proxy, or api.travelian.pk when FINANCE_BASE_URL points at the live site
// for "before" screenshots), so nothing reaches a real gateway.
export type GatewayAnswer = (path: string, method: string, url: URL) => unknown | { status: number; json: unknown } | undefined;

export const rs = (rupees: number) => ({ amount_minor: Math.round(rupees * 100), currency: "PKR" });
export const SHOTS = process.env.FINANCE_SHOTS_DIR;
export const BEFORE = process.env.FINANCE_SHOTS === "before";

export async function openAdmin(page: Page, path: string, width: number, answer: GatewayAnswer, role = "super_admin") {
  await page.setViewportSize({ width, height: 900 });
  await page.route("**/*", route => {
    const request = route.request();
    const url = gatewayView(request.url());
    if (url.pathname.startsWith("/v1/")) {
      const result = answer(url.pathname, request.method(), url) as { status?: number; json?: unknown } | undefined;
      if (result === undefined) return route.fulfill({ status: 404, json: { detail: "Not found." } });
      if (result && typeof result === "object" && "status" in result && "json" in result) return route.fulfill({ status: result.status, json: result.json });
      return route.fulfill({ json: result });
    }
    const local = isLocal(url) || url.hostname === (page.url() === "about:blank" ? APP_URL : new URL(page.url())).hostname
      || url.hostname.endsWith("travelian.pk");
    return local && !url.hostname.startsWith("api.") ? route.continue() : route.fulfill({ json: {} });
  });
  await page.addInitScript(r => localStorage.setItem("travelian.session.v1", JSON.stringify({
    email: "layout-test@travelian.com", groups: [r], name: "Layout Test", createdAt: new Date().toISOString(),
    accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
  })), role);
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

export async function shot(page: Page, name: string) {
  if (!SHOTS) return;
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SHOTS}/${BEFORE ? "before" : "after"}-${name}.png`, fullPage: true });
}

export const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
