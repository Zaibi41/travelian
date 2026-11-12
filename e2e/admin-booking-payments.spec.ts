import { expect, test, type Page, type Request } from "@playwright/test";
import { gatewayView } from "./support/gateway";
import { expectReadableText } from "./support/type-scale";

// Booking detail > Payments: record the customer's payment, then issue the ticket (confirm, once),
// ticket numbers on the result and the Tickets tab; layout at 1280, 1440 and 390px. Local-only
// session and intercepted gateway answers (made-up values); nothing reaches a real gateway.
if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const SOON = () => new Date(Date.now() + 3 * 3_600_000).toISOString();
const traveler = (position: number, first: string, ticket?: string) => ({
  position, type: "ADT", title: "MR", first_name: first, last_name: "Rehmanullah Khan Durrani", date_of_birth_masked: "1990-••-••", id_type: "PSPT",
  ...(ticket ? { ticket_number: ticket } : {}),
});

function detail(paid: boolean, issued: boolean) {
  return {
    source: "gateway_bookings", sample: false, booking_id: "TRV-O5QZB5", pnr: "CAEDEC", product: "flight", customer_or_agency: "Muhammad Abdullah",
    statuses: { booking: issued ? "confirmed" : "held", payment: paid ? "paid" : "unpaid", issuance: issued ? "issued" : "not_issued" },
    amount: rs(15_316), amount_paid: rs(paid ? 15_316 : 0), amount_due: rs(paid ? 0 : 15_316), deadline: SOON(), created_at: "2026-11-11T08:00:00Z",
    fare: { billable_price: rs(15_316) }, sections_not_available: ["itinerary", "servicing"], can_reveal_identity: false,
    can_record_payments: true, can_issue_tickets: true,
    passengers: [traveler(1, "Muhammad Abdullah", issued ? "214-0000000001" : undefined), traveler(2, "Ayesha", issued ? "214-0000000002" : undefined)],
    payments: paid ? [{ id: "p1", amount: rs(15_316), method: "bank_transfer", received_into: "Meezan current account", reference: "IBFT-778899",
      received_at: "2026-11-11T09:05:00Z", recorded_at: "2026-11-11T09:06:00Z", recorded_by_role: "super_admin" }] : undefined,
  };
}

function checklist(paid: boolean, issued: boolean) {
  return {
    issuance_status: issued ? "issued" : "not_issued", blockers: paid ? [] : ["Full payment isn't recorded yet."], full_payment_recorded: paid,
    amount_paid: rs(paid ? 15_316 : 0), amount_due: rs(paid ? 0 : 15_316), hold_expires_at: SOON(), ticketing_enabled: true,
    can_request: paid && !issued, can_issue: paid && !issued,
  };
}

async function open(page: Page, width: number, tab = "payments") {
  const state = { paid: false, issued: false };
  const posts: Request[] = [];
  await page.setViewportSize({ width, height: 900 });
  await page.route("**/*", route => {
    const request = route.request();
    const url = gatewayView(request.url());
    if (url.port === "8000") {
      if (request.method() === "POST") posts.push(request);
      if (url.pathname === "/v1/admin/bookings/TRV-O5QZB5") return route.fulfill({ json: detail(state.paid, state.issued) });
      if (url.pathname === "/v1/admin/bookings/TRV-O5QZB5/issuance") return route.fulfill({ json: checklist(state.paid, state.issued) });
      if (url.pathname === "/v1/admin/bookings/TRV-O5QZB5/payments") {
        state.paid = true;
        const body = request.postDataJSON();
        return route.fulfill({ status: 201, json: { payment: { id: "p1", ...body, recorded_at: new Date().toISOString() }, payment_status: "paid" } });
      }
      if (url.pathname === "/v1/admin/bookings/TRV-O5QZB5/issuance/issue") {
        state.issued = true;
        return route.fulfill({ json: { result: "issued", issuance_status: "issued", message: "Tickets issued.",
          tickets: [{ position: 1, ticket_number: "214-0000000001" }, { position: 2, ticket_number: "214-0000000002" }] } });
      }
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return ["localhost", "127.0.0.1"].includes(url.hostname) ? route.continue() : route.fulfill({ json: {} });
  });
  await page.addInitScript(() => localStorage.setItem("travelian.session.v1", JSON.stringify({
    email: "layout-test@travelian.com", name: "Layout Test", createdAt: new Date().toISOString(),
    accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
  })));
  await page.goto(`/admin/bookings/TRV-O5QZB5/${tab}`);
  return { posts, state };
}

test("record the payment, then issue once: ticket numbers on the result and the Tickets tab", async ({ page }) => {
  const { posts } = await open(page, 1440);
  const record = page.getByRole("region", { name: "1 · Record the customer's payment" });
  const issue = page.getByRole("region", { name: "2 · Issue the ticket" });
  await expect(issue.getByRole("button", { name: "Issue ticket" })).toBeDisabled();
  await expect(issue).toContainText("Full payment isn't recorded yet.");

  await record.getByLabel("Received into").fill("Meezan current account");
  await record.getByLabel("Reference or transaction ID").fill("IBFT-778899");
  await record.getByRole("button", { name: "Record payment" }).click();
  await expect(record).toContainText("Paid in full. Nothing more to record.");
  const payment = posts.find(post => post.url().endsWith("/payments"))!.postDataJSON();
  expect(payment).toMatchObject({ amount: { amount_minor: 1_531_600, currency: "PKR" }, method: "bank_transfer", received_into: "Meezan current account", reference: "IBFT-778899" });
  await expect(record.getByRole("table", { name: "Payments recorded" })).toContainText("IBFT-778899");

  await expect(issue.getByRole("button", { name: "Issue ticket" })).toBeEnabled();
  await issue.getByRole("button", { name: "Issue ticket" }).click();
  const dialog = page.getByRole("dialog", { name: "Issue ticket now?" });
  await expect(dialog).toContainText("This sends 2 travelers to the airline for ticketing for Rs 15,316");
  await dialog.getByRole("button", { name: "Issue now" }).click();
  const issued = page.getByRole("region", { name: "Tickets issued" });
  await expect(issued).toContainText("214-0000000001");
  await expect(issued).toContainText("214-0000000002");
  expect(posts.filter(post => post.url().endsWith("/issuance/issue"))).toHaveLength(1);

  await issued.getByRole("link", { name: "View tickets" }).click();
  await expect(page).toHaveURL(/\/admin\/bookings\/TRV-O5QZB5\/tickets$/);
  await expect(page.getByRole("region", { name: "Tickets" })).toContainText("214-0000000002");
});

for (const width of [1280, 1440, 390]) {
  test(`payments tab fits at ${width}px; the confirm dialog stays in view`, async ({ page }) => {
    const { state } = await open(page, width);
    await expect(page.getByRole("region", { name: "2 · Issue the ticket" })).toContainText("Payment recorded in full");
    await expectReadableText(page, `payments at ${width}px`);
    state.paid = true;
    await page.reload();
    const button = page.getByRole("button", { name: "Issue ticket" });
    await expect(button).toBeEnabled();
    await button.click();
    const dialog = page.getByRole("dialog", { name: "Issue ticket now?" });
    await expect(dialog).toBeVisible();
    const box = (await dialog.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(900);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
}
