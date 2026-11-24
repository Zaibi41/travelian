import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// travelian#202: a SooperFare booking settled and ticketed outside Travelian. Payments: settle the rest with a reason,
// Mark as issued (ticket numbers, ticket document, supplier payment for admins); Tickets: issue time and the document;
// Supplier payment: paid from, reference, time sent. Local-only session and intercepted gateway answers (made-up
// names, the issue's amounts); nothing reaches a real gateway or storage.
if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });

const SHOTS = process.env.SHOTS;
const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const SOON = () => new Date(Date.now() + 3 * 3_600_000).toISOString();
const LONG = "Rehmanullah Khan Durrani Abbasi Siddiqui";
const traveler = (position: number, first: string, ticket?: string) => ({
  position, type: "ADT", title: "MR", first_name: first, last_name: LONG, date_of_birth: "1990-01-31", id_type: "PSPT",
  ...(ticket ? { ticket_number: ticket } : {}),
});

type State = { settled: boolean; issued: boolean };

function detail(state: State) {
  return {
    source: "gateway_bookings", sample: false, booking_id: "TRV-277WKE", pnr: "ZWHLZG", product: "flight", provider: "sooperfare",
    customer_or_agency: "Muhammad Azam Reseller Travel and Tours International",
    statuses: { booking: state.issued ? "ticket_issued" : "held", payment: state.settled ? "paid" : "part_paid", issuance: state.issued ? "issued" : "not_issued" },
    amount: rs(state.settled ? 75_000 : 76_006), amount_paid: rs(75_000), amount_due: rs(state.settled ? 0 : 1_006),
    deadline: SOON(), created_at: "2026-11-23T08:00:00Z", fare: { billable_price: rs(76_006), supplier_cost: rs(76_006), margin: rs(0) },
    supplier_payment: { amount_due: rs(76_006), hold_deadline: SOON(),
      ...(state.issued ? { billed: rs(74_886), paid_from: "credit", transfer_reference: "SOOPERFARE-REFUND-CREDIT-2026-11-0077-OFFSET", time_sent: "2026-11-23T10:00:00Z" } : {}) },
    sections_not_available: ["itinerary", "servicing"], can_record_payments: true, can_issue_tickets: true, can_set_selling_price: false,
    can_edit_group_tickets: false, itinerary_available: true, can_settle_due: !state.settled, ticket_document: state.issued,
    ...(state.issued ? { issued_at: "2026-11-23T10:05:00Z" } : {}),
    ...(state.settled ? { settlement: { original_total: rs(76_006), waived: rs(1_006), settled_at: "2026-11-23T09:30:00Z",
      reason: "Quoted Rs 75,000 to the reseller on WhatsApp; the owner agreed to waive the difference for this PIA fare" } } : {}),
    passengers: [traveler(1, "Muhammad Azam", state.issued ? "2142345678901" : undefined), traveler(2, "Ayesha Bibi", state.issued ? "2142345678902" : undefined)],
    payments: [{ id: "p1", amount: rs(75_000), method: "bank_transfer", received_into: "Meezan Bank, Travelian current account", reference: "IBFT-RESELLER-75000",
      received_at: "2026-11-23T09:05:00Z", recorded_at: "2026-11-23T09:06:00Z", recorded_by_role: "super_admin" }],
  };
}

const checklist = (state: State) => ({
  issuance_status: state.issued ? "issued" : "not_issued", blockers: state.settled ? [] : ["Full payment isn't recorded yet."],
  full_payment_recorded: state.settled, amount_paid: rs(75_000), amount_due: rs(state.settled ? 0 : 1_006), hold_expires_at: SOON(),
  ticketing_enabled: false, can_request: state.settled && !state.issued, can_issue: false, can_check: false, can_record_issue: !state.issued,
  ticketing_note: "SooperFare ticketing from Travelian isn't switched on yet (SOOPERFARE_CONFIRM_ENABLED: waiting for the owner to approve the first confirm). Issue in SooperFare's portal, then record the ticket numbers.",
});

async function open(page: Page, width: number, tab: string, state: State) {
  const bodies: Record<string, unknown> = {};
  await page.setViewportSize({ width, height: 900 });
  await page.route("**/*", route => {
    const request = route.request();
    const url = gatewayView(request.url());
    if (url.hostname === "storage.invalid") return route.fulfill({ status: 204, body: "" });
    if (isGateway(url)) {
      const path = url.pathname.replace("/v1/admin/bookings/TRV-277WKE", "");
      if (request.method() !== "GET") bodies[path] = request.postDataJSON();
      if (url.pathname === "/v1/admin/payment-accounts") return route.fulfill({ json: { accounts: [{ id: "a1", method: "bank_transfer", label: "Meezan Bank" }] } });
      if (path === "") return route.fulfill({ json: detail(state) });
      if (path === "/issuance") return route.fulfill({ json: checklist(state) });
      if (path === "/settle-due") { state.settled = true; return route.fulfill({ json: { waived: rs(1_006), total: rs(75_000) } }); }
      if (path === "/ticket-document/upload") {
        return route.fulfill({ json: { url: "https://storage.invalid/upload", fields: { key: "ticket-documents/x.pdf" },
          asset_key: "ticket-documents/0f8fad5b-d9cb-469f-a165-70867728950e.pdf", max_bytes: 10_485_760 } });
      }
      if (path === "/issuance/record") {
        state.issued = true;
        return route.fulfill({ json: { result: "issued", issuance_status: "issued", message: "Marked as issued.",
          tickets: [{ position: 1, ticket_number: "2142345678901" }, { position: 2, ticket_number: "2142345678902" }] } });
      }
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return isLocal(url) ? route.continue() : route.fulfill({ json: {} });
  });
  await page.addInitScript(() => localStorage.setItem("travelian.session.v1", JSON.stringify({
    email: "layout-test@travelian.com", groups: ["super_admin"], name: "Layout Test", createdAt: new Date().toISOString(),
    accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
  })));
  await page.goto(`/admin/bookings/TRV-277WKE/${tab}`);
  return bodies;
}

const noHorizontalScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

for (const width of [1440, 1024, 768, 390]) {
  test(`settle the rest, mark as issued, then tickets and supplier payment at ${width}px`, async ({ page }) => {
    const state = { settled: false, issued: false };
    const bodies = await open(page, width, "payments", state);
    const record = page.getByRole("region", { name: "1 · Record the customer's payment" });
    await expect(record).toContainText("Still to receiveRs 1,006");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/payments-due-${width}.png`, fullPage: true });

    await record.getByRole("button", { name: "Settle the rest" }).click();
    const settle = page.getByRole("dialog", { name: "Settle the rest" });
    await settle.getByLabel("Reason").fill("Quoted Rs 75,000 to the reseller; the owner agreed");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/settle-dialog-${width}.png` });
    await settle.getByRole("button", { name: "Waive Rs 1,006" }).click();
    await expect(settle).toBeHidden();
    expect(bodies["/settle-due"]).toEqual({ reason: "Quoted Rs 75,000 to the reseller; the owner agreed" });
    await expect(record).toContainText("Waived by agreementRs 1,006");
    expect(await noHorizontalScroll(page)).toBe(true);

    await page.getByRole("button", { name: "Mark as issued" }).click();
    const dialog = page.getByRole("dialog", { name: "Mark as issued" });
    await dialog.getByLabel(`Ticket number, Mr Muhammad Azam ${LONG}`).fill("2142345678901");
    await dialog.getByLabel(`Ticket number, Mr Ayesha Bibi ${LONG}`).fill("2142345678902");
    await dialog.getByLabel("Ticket document (optional)").setInputFiles({ name: "TRV-277WKE.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
    await dialog.getByLabel("Amount due").fill("74,886");
    await dialog.getByRole("combobox", { name: "Paid from" }).click();
    await page.getByRole("option", { name: "Credit" }).click();
    await dialog.getByLabel("Transfer reference").fill("SOOPERFARE-REFUND-CREDIT-2026-11-0077-OFFSET");
    // The dialog fits the viewport and scrolls inside; its buttons stay reachable.
    const box = await dialog.boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(900);
    await expect(dialog.getByRole("button", { name: "Mark as issued" })).toBeInViewport();
    await expect(dialog.getByRole("button", { name: "Close" })).toBeInViewport();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/mark-issued-dialog-${width}.png` });
    await dialog.getByRole("button", { name: "Mark as issued" }).click();
    await expect(dialog).toBeHidden();
    expect(bodies["/issuance/record"]).toMatchObject({
      ticket_document_key: "ticket-documents/0f8fad5b-d9cb-469f-a165-70867728950e.pdf", supplier_billed: rs(74_886), paid_from: "credit",
      supplier_reference: "SOOPERFARE-REFUND-CREDIT-2026-11-0077-OFFSET",
    });
    await expect(page.getByRole("region", { name: "Tickets issued" })).toBeVisible();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/payments-issued-${width}.png`, fullPage: true });

    await page.getByRole("link", { name: "Tickets", exact: true }).click();
    await expect(page.getByRole("columnheader", { name: "Issue time" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open ticket document" })).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/tickets-${width}.png`, fullPage: true });

    await page.getByRole("link", { name: /Supplier payment/ }).click();
    const supplier = page.getByRole("region", { name: "Supplier payment" });
    await expect(supplier).toContainText("Amount dueRs 74,886");
    await expect(supplier).toContainText("Paid fromCredit");
    expect(await noHorizontalScroll(page)).toBe(true);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/supplier-payment-${width}.png`, fullPage: true });
  });
}
