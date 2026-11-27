import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// Pricing & Revenue > Flight Pricing & Rules at /admin/pricing/flights (the old /admin/flights redirects): every flight
// supplier with its status and rule count, and Rs-per-passenger rules (supplier, SooperFare source, airline). Gateway
// answers are made up here; nothing reaches a real gateway. 390/768/1024/1440. PRICING_SHOTS_DIR saves screenshots.

if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
const SHOTS = process.env.PRICING_SHOTS_DIR;

const SUPPLIERS = { suppliers: [
  { code: "southair", name: "Southair", status: "live", sources: [] },
  { code: "sooperfare", name: "SooperFare", status: "live", sources: [
    { code: "PK", name: "PIA" }, { code: "PA", name: "Airblue" }, { code: "PF", name: "AirSial" },
    { code: "ONEAPI", name: "OneAPI (Fly Jinnah)" }, { code: "Z8", name: "South Air" }, { code: "SABRE", name: "Sabre (GDS)" }] },
  { code: "kyte", name: "Kyte", status: "not_public", sources: [] },
] };

type Rule = { id: string; supplier: string; source: string | null; airline_code: string | null; amount_minor: number; active: boolean; updated_at: string };

async function open(page: Page, width: number, path = "/admin/pricing/flights", start: Rule[] = []) {
  const rules = [...start];
  const sent: { method: string; body: unknown }[] = [];
  await page.setViewportSize({ width, height: 900 });
  await page.route("**/*", async route => {
    const request = route.request();
    const url = gatewayView(request.url());
    if (isGateway(url) || url.pathname.startsWith("/v1/")) {
      if (url.pathname === "/v1/admin/flight-pricing/suppliers") return route.fulfill({ json: SUPPLIERS });
      if (url.pathname === "/v1/admin/flight-pricing/rules" && request.method() === "GET") return route.fulfill({ json: { rules } });
      if (url.pathname === "/v1/admin/flight-pricing/rules" && request.method() === "POST") {
        const body = request.postDataJSON();
        sent.push({ method: "POST", body });
        const rule = { ...body, id: `r${rules.length + 1}`, updated_at: "2026-11-27T12:00:00Z" };
        rules.push(rule);
        return route.fulfill({ status: 201, json: rule });
      }
      const match = url.pathname.match(/^\/v1\/admin\/flight-pricing\/rules\/(.+)$/);
      if (match && request.method() === "PUT") {
        const body = request.postDataJSON();
        sent.push({ method: "PUT", body });
        const index = rules.findIndex(rule => rule.id === match[1]);
        rules[index] = { ...rules[index], ...body };
        return route.fulfill({ json: rules[index] });
      }
      if (match && request.method() === "DELETE") {
        sent.push({ method: "DELETE", body: match[1] });
        rules.splice(rules.findIndex(rule => rule.id === match[1]), 1);
        return route.fulfill({ json: { id: match[1], deleted: true } });
      }
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return isLocal(url) ? route.continue() : route.fulfill({ json: {} });
  });
  await page.addInitScript(() => localStorage.setItem("travelian.session.v1", JSON.stringify({
    email: "layout-test@travelian.com", groups: ["super_admin"], name: "Layout Test", createdAt: new Date().toISOString(),
    accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
  })));
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Flight Pricing & Rules");
  return { rules, sent };
}

const noSideScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test("the old /admin/flights link opens the new address", async ({ page }) => {
  await open(page, 1440, "/admin/flights");
  await expect(page).toHaveURL(/\/admin\/pricing\/flights$/);
});

for (const width of [390, 768, 1024, 1440]) {
  test(`${width}px: suppliers listed; add, edit and delete a -100 rule`, async ({ page }) => {
    const { sent } = await open(page, width);
    const suppliers = page.getByTestId("flight-supplier");
    await expect(suppliers).toHaveCount(3);
    await expect(suppliers.nth(0)).toContainText("Southair");
    await expect(suppliers.nth(0)).toContainText("Live");
    await expect(suppliers.nth(1)).toContainText("Sources: PIA, Airblue, AirSial, OneAPI (Fly Jinnah), South Air, Sabre (GDS)");
    await expect(suppliers.nth(2)).toContainText("Staff searches only");
    await expect(page.getByText("No rules yet")).toBeVisible();
    // Old tabs on the old system are hidden.
    for (const tab of ["Deals & Promotions", "Supplier Priority", "API Health", "Failed Searches", "Fare Simulator"]) {
      await expect(page.getByRole("tab", { name: tab })).toHaveCount(0);
    }
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/empty-${width}.png`, fullPage: true });

    // Add: SooperFare, source PIA, airline PIA, -100.
    await page.getByRole("button", { name: "Add rule for SooperFare" }).click();
    await page.getByLabel("Source").click();
    await page.getByRole("option", { name: "PIA" }).click();
    await page.getByRole("combobox", { name: "Airline" }).click();
    await page.getByPlaceholder("Search airline or code").fill("PK");
    await page.getByRole("option", { name: /PIA/ }).first().click();
    await page.getByLabel("Rs per passenger").fill("-100");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/form-${width}.png`, fullPage: true });
    await page.getByRole("button", { name: "Save rule" }).click();
    expect(sent[0]).toEqual({ method: "POST", body: { supplier: "sooperfare", source: "PK", airline_code: "PK", amount_minor: -10_000, active: true } });
    const rule = page.getByTestId("flight-rule");
    await expect(rule).toHaveCount(1);
    await expect(rule).toContainText("SooperFare · Source: PIA · Airline: PIA (PK)");
    await expect(rule).toContainText("-Rs 100 per passenger");
    await expect(rule).toContainText("Active");
    await expect(page.getByTestId("flight-supplier").nth(1)).toContainText("1 rule");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/saved-${width}.png`, fullPage: true });
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);

    // Edit: Rs 200 off, switched off.
    await rule.getByRole("button", { name: /^Edit rule/ }).click();
    await expect(page.getByRole("heading", { name: "Edit rule" })).toBeVisible();
    await page.getByLabel("Rs per passenger").fill("-200");
    await page.getByRole("switch").click();
    await page.getByRole("button", { name: "Update rule" }).click();
    expect(sent[1]).toEqual({ method: "PUT", body: { supplier: "sooperfare", source: "PK", airline_code: "PK", amount_minor: -20_000, active: false } });
    await expect(rule).toContainText("-Rs 200 per passenger");
    await expect(rule).toContainText("Off");

    // Delete, after confirming.
    await rule.getByRole("button", { name: /^Delete rule/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Delete this rule?");
    await dialog.getByRole("button", { name: "Delete" }).click();
    expect(sent[2]).toEqual({ method: "DELETE", body: "r1" });
    await expect(page.getByTestId("flight-rule")).toHaveCount(0);
  });
}

test("an amount of 0 or with paisa is refused before sending", async ({ page }) => {
  const { sent } = await open(page, 1440);
  await page.getByRole("button", { name: "Add rule for Southair" }).click();
  await page.getByLabel("Rs per passenger").fill("0");
  await page.getByRole("button", { name: "Save rule" }).click();
  await expect(page.getByRole("alert")).toContainText("whole rupees");
  expect(sent).toHaveLength(0);
});
