import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// Ticket Sale Entry: Super Admin edit and delete (the gateway says can_edit). Local-only session and made-up gateway answers.
if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const LONG_SUPPLIER = "Fly Jinnah / Air Arabia Pakistan regional office direct airline ID (Lahore and Karachi)";
const OPTIONS = { is_finance: true, suppliers: [{ id: "sooperfare", name: "Sooperfare" }, { id: "flyjinnah", name: LONG_SUPPLIER }],
  accounts: [{ id: "a1", name: "UBL Business", detail: "business" }], partners: [{ id: "p1", name: "Karachi Travels and Tours (Private) Limited, Saddar branch" }] };
const base = { channel: "direct", passenger_name: "Muhammad Azam", customer_person_id: "c1", travel_date: null, supplier_id: "sooperfare", supplier_name: "Sooperfare",
  cost: rs(75_000), sale: rs(75_000), received: rs(75_000), due: rs(0), profit: rs(0), payment_account_id: "a1", payment_account: "UBL Business",
  ticket_status: "issued", submitted_by_role: "super_admin" };
const items = [
  { ...base, id: "s3", number: 3, route: "LHE-JED", pnr: "9Y08DC", cost: rs(70_000), profit: rs(5_000), state: "confirmed", corrects_number: 1, submitted_at: "2026-11-25T13:57:00Z" },
  { ...base, id: "s2", number: 2, route: "LHE-JED", pnr: "9Y08DC", state: "confirmed", submitted_at: "2026-11-25T13:59:00Z" },
  { ...base, id: "s1", number: 1, route: null, pnr: null, state: "reversed", corrected_by_number: 3, correction_reason: "Cost was Rs 70,000, not Rs 75,000", reversed_at: "2026-11-26T10:00:00Z", submitted_at: "2026-11-25T13:57:00Z" },
  { ...base, id: "s4", number: 4, passenger_name: "Muhammad Azam Khan Niazi Abdul Rehman", channel: "b2b", agency_name: OPTIONS.partners[0].name, supplier_id: "flyjinnah",
    supplier_name: LONG_SUPPLIER, route: "KHI-DXB", pnr: "XY9Z8W", state: "pending", submitted_by_role: "staff", submitted_at: "2026-11-26T08:00:00Z" },
];
const CORRECTION_PREVIEW = { profit: rs(0), due: rs(0), problems: [], confirmed_on_save: true, effects: [
  "Reverse entry #2: its Rs 75,000 cost, Rs 75,000 sale and Rs 75,000 received come out of every balance.", "Record a sale of Rs 75,000 for Muhammad Azam.",
  "Deduct Rs 72,000 from Sooperfare's balance (Rs 150,000 → Rs 78,000).", "Add Rs 75,000 to UBL Business (sales received).", "Profit: Rs 3,000." ] };

async function open(page: Page, width: number, canEdit: boolean) {
  await page.setViewportSize({ width, height: 900 });
  const json: Record<string, unknown> = {
    "/v1/admin/finance/ticket-sales/options": OPTIONS, "/v1/admin/finance/ticket-sales": { can_confirm: true, can_edit: canEdit, items },
    "/v1/admin/finance/ticket-sales/preview": CORRECTION_PREVIEW, "/v1/admin/finance/ticket-sales/s2/correct/preview": CORRECTION_PREVIEW,
  };
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (isGateway(url)) {
      const body = json[url.pathname];
      return body ? route.fulfill({ json: body }) : route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return isLocal(url) ? route.continue() : route.fulfill({ json: {} });
  });
  await page.addInitScript(() => localStorage.setItem("travelian.session.v1", JSON.stringify({
    email: "layout-test@travelian.com", groups: ["super_admin"], name: "Layout Test", createdAt: new Date().toISOString(),
    accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
  })));
  await page.goto("/admin/finance/ticket-sales");
  await expect(page.getByRole("heading", { level: 1, name: "Ticket Sale Entry" })).toBeVisible();
  await expect(page.getByText("Replaced by #3")).toBeVisible();
}

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const shot = (width: number, name: string, fullPage = true) =>
  process.env.SHOT_DIR ? { path: `${process.env.SHOT_DIR}/ticket-sale-${width}-${name}.png`, animations: "disabled" as const, fullPage } : {};

for (const width of [1440, 1024, 768, 390]) {
  test(`Ticket Sale edit and delete fit at ${width}px`, async ({ page }) => {
    await open(page, width, false);
    await expect(page.getByRole("button", { name: /^Edit entry/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Delete entry/ })).toHaveCount(0);
    await page.screenshot(shot(width, "no-edit"));

    await open(page, width, true);
    await expect(page.getByRole("button", { name: "Edit entry #1" })).toHaveCount(0); // reversed
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    await page.screenshot(shot(width, "list"));

    await page.getByRole("button", { name: "Edit entry #2" }).click();
    const form = page.getByRole("form", { name: "Edit Ticket Sale Entry #2" });
    await expect(form.getByText("Editing Ticket Sale Entry #2")).toBeInViewport();
    await expect(form.getByLabel("PNR")).toHaveValue("9Y08DC");
    await form.getByLabel("Cost (Rs)").fill("72000");
    await expect(form.getByText(/^Reverse entry #2/)).toBeVisible();
    await form.getByLabel("Reason for the change").fill("Cost was Rs 72,000");
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    await page.screenshot(shot(width, "editing"));
    await form.getByRole("button", { name: "Cancel edit" }).click();
    await expect(page.getByRole("form", { name: "Ticket Sale Entry" })).toBeVisible();
    await expect(page.getByLabel("Cost (Rs)")).toHaveValue("");

    await page.getByRole("button", { name: "Delete entry #4" }).click();
    const dialog = page.getByRole("dialog", { name: "Delete Ticket Sale Entry #4?" });
    await expect(dialog.getByRole("button", { name: "Delete entry" })).toBeInViewport();
    await page.waitForTimeout(300);
    const box = (await dialog.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
    await page.screenshot(shot(width, "delete", false));
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });
}
