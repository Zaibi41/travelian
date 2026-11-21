import { expect, test, type Page, type Request } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";
import { expectReadableText } from "./support/type-scale";

// gateway#44: a SooperFare booking whose hold ran out shows one message (the "Hold expired" card) and offers
// Re-hold at SooperFare, which asks first, shows a changed price before anything is held, and shows the gateway's own
// words when it fails. Local-only session and intercepted gateway answers (made-up values); nothing reaches a real
// gateway or SooperFare.
if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const PAST = () => new Date(Date.now() - 2 * 3_600_000).toISOString();
const LATER = () => new Date(Date.now() + 20 * 3_600_000).toISOString();

type Answer = { status: number; json: object };
const PRICE_CHANGED: Answer = { status: 409, json: {
  detail: "The same fare now costs Rs 25,100 instead of Rs 24,685. Nothing was held. Accept the new price to hold it.", code: "price_changed",
  new_total: rs(25_100), old_total: rs(24_685) } };
const STILL_ACTIVE: Answer = { status: 409, json: {
  detail: "SooperFare shows PNR VFTATB as 'active', not expired or cancelled. Check with SooperFare before holding again, so the travelers aren't booked twice. Nothing was held.",
  code: "still_active" } };

function detail(held: boolean, total: number) {
  return {
    source: "gateway_bookings", sample: false, booking_id: "TRV-G6CMP6", pnr: held ? "NEWPNR" : "VFTATB", product: "flight",
    customer_or_agency: "Muhammad Abdullah Rehmanullah Khan Durrani",
    statuses: { booking: held ? "held" : "paid_not_ticketed", payment: "paid", issuance: "not_issued" },
    amount: rs(total), amount_paid: rs(24_685), amount_due: rs(Math.max(total - 24_685, 0)), deadline: held ? LATER() : PAST(), created_at: "2026-11-19T08:00:00Z",
    fare: { billable_price: rs(total) }, sections_not_available: ["servicing"], can_reveal_identity: false, can_record_payments: true, can_issue_tickets: true,
    passengers: [{ position: 0, type: "ADT", title: "MR", first_name: "Muhammad Abdullah", last_name: "Rehmanullah Khan Durrani", date_of_birth: "1990-01-31", id_type: "NATI" }],
    supplier_booking: { supplier: "SooperFare", booking_id: held ? "83948930-3b71-4df4-99df-9a144a9dee3f" : "3801e825-ccc9-421e-a441-222d8740612a",
      order_ref: "spa-zrc-vps", cancel_state: "none", can_cancel: held, can_rehold: !held, status_at_supplier: held ? undefined : "expired" },
  };
}

function checklist(held: boolean, total: number) {
  const due = Math.max(total - 24_685, 0);
  return held
    ? { issuance_status: "not_issued", blockers: due ? ["Full payment isn't recorded yet."] : [], full_payment_recorded: !due, amount_paid: rs(24_685), amount_due: rs(due),
        hold_expires_at: LATER(), ticketing_enabled: true, can_request: !due, can_issue: !due }
    // What the gateway answers since #44: one hold reason, no ticketing note while the hold is gone.
    : { issuance_status: "not_issued", blockers: ["The hold has expired."], full_payment_recorded: true, amount_paid: rs(24_685), amount_due: rs(0),
        hold_expires_at: PAST(), ticketing_enabled: true, can_request: false, can_issue: false };
}

async function open(page: Page, width: number, tab: string, answers: Answer[]) {
  const state = { held: false, total: 24_685 };
  const reholds: Request[] = [];
  await page.setViewportSize({ width, height: 900 });
  await page.route("**/*", route => {
    const request = route.request();
    const url = gatewayView(request.url());
    if (isGateway(url)) {
      if (url.pathname === "/v1/admin/bookings/TRV-G6CMP6") return route.fulfill({ json: detail(state.held, state.total) });
      if (url.pathname === "/v1/admin/bookings/TRV-G6CMP6/issuance") return route.fulfill({ json: checklist(state.held, state.total) });
      if (url.pathname === "/v1/admin/payment-accounts") return route.fulfill({ json: { accounts: [] } });
      if (url.pathname === "/v1/admin/bookings/TRV-G6CMP6/supplier-rehold" && request.method() === "POST") {
        reholds.push(request);
        const answer = answers.shift();
        if (answer) return route.fulfill(answer);
        const accepted = (request.postDataJSON() as { accept_total_minor?: number } | null)?.accept_total_minor;
        state.held = true;
        if (accepted) state.total = accepted / 100;
        return route.fulfill({ json: { message: "held again: new PNR NEWPNR, expires 22 Nov 2026 10:00 UTC" } });
      }
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return isLocal(url) ? route.continue() : route.fulfill({ json: {} });
  });
  await page.addInitScript(() => localStorage.setItem("travelian.session.v1", JSON.stringify({
    email: "layout-test@travelian.com", groups: ["super_admin"], name: "Layout Test", createdAt: new Date().toISOString(),
    accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
  })));
  await page.goto(`/admin/bookings/TRV-G6CMP6${tab ? `/${tab}` : ""}`);
  return { reholds, state };
}

test("Payments: one hold message; a changed price is shown first and held only after the OK", async ({ page }) => {
  const { reholds } = await open(page, 1440, "payments", [PRICE_CHANGED]);
  const card = page.getByRole("region", { name: "The hold ran out before issuing" });
  await expect(card).toContainText("SooperFare no longer holds PNR VFTATB");
  const issue = page.getByRole("region", { name: "2 · Issue the ticket" });
  await expect(issue.getByText("Expired")).toBeVisible();
  await expect(issue).not.toContainText("Not ready to issue");
  await expect(page.getByText(/Tickets can't be issued from Travelian|Ticketing is (turned|switched) off/)).toHaveCount(0);

  await card.getByRole("button", { name: "Re-hold at SooperFare" }).click();
  const ask = page.getByRole("dialog", { name: "Re-hold at SooperFare?" });
  await expect(ask).toContainText("at the booking's price of Rs 24,685");
  expect(reholds).toHaveLength(0);   // nothing is sent before the confirmation
  await ask.getByRole("button", { name: "Re-hold at SooperFare" }).click();

  const changed = page.getByRole("dialog", { name: "The price has changed" });
  await expect(changed).toContainText("now cost Rs 25,100 instead of Rs 24,685");
  await expect(changed).toContainText("Nothing has been held yet");
  expect(reholds.map(request => request.postDataJSON())).toEqual([{}]);
  await changed.getByRole("button", { name: "Hold at Rs 25,100" }).click();

  await expect(page.getByText("Held again at SooperFare: new PNR NEWPNR, expires 22 Nov 2026 10:00 UTC.")).toBeVisible();
  expect(reholds.map(request => request.postDataJSON())).toEqual([{}, { accept_total_minor: 2_510_000 }]);
  // The booking changes only after the gateway's answer: now held under the new PNR, the hold-expired card is gone.
  await expect(card).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "PNR NEWPNR" })).toBeVisible();
  await expect(issue).toContainText("Full payment isn't recorded yet.");
});

test("Overview: SooperFare's refusal is shown as it is and nothing changes", async ({ page }) => {
  const { reholds } = await open(page, 1440, "", [STILL_ACTIVE]);
  const card = page.getByRole("region", { name: "SooperFare booking" });
  await expect(card).toContainText("The SooperFare hold is gone");
  await card.getByRole("button", { name: "Re-hold at SooperFare" }).click();
  const ask = page.getByRole("dialog", { name: "Re-hold at SooperFare?" });
  await ask.getByRole("button", { name: "Re-hold at SooperFare" }).click();
  await expect(ask.getByRole("alert")).toContainText("not expired or cancelled");
  expect(reholds).toHaveLength(1);
  await ask.getByRole("button", { name: "Cancel" }).click();
  await expect(ask).toBeHidden();
  await expect(page.getByRole("heading", { name: "PNR VFTATB" })).toBeVisible();
  await expect(card.getByRole("button", { name: "Re-hold at SooperFare" })).toBeEnabled();
});

for (const width of [390, 768, 1024, 1440]) {
  test(`hold-expired card and the Re-hold dialog fit at ${width}px`, async ({ page }) => {
    await open(page, width, "payments", []);
    const card = page.getByRole("region", { name: "The hold ran out before issuing" });
    const button = card.getByRole("button", { name: "Re-hold at SooperFare" });
    await expect(button).toBeVisible();
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(width < 640 ? 44 : 40);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await expectReadableText(page, `hold expired at ${width}px`);
    await button.click();
    const dialog = page.getByRole("dialog", { name: "Re-hold at SooperFare?" });
    await expect(dialog).toBeVisible();
    const box = (await dialog.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(900);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
}
