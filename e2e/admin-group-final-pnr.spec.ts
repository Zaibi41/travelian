import { expect, test, type Page } from "@playwright/test";
import { docsShot } from "./support/docs-shot";
import { gatewayView } from "./support/gateway";
import { expectReadableText } from "./support/type-scale";

// Group final PNR and tickets: the booking's Tickets tab (staff type the final PNR and each ticket number), the
// downloads kept off until Ticketed, and the Flight Operations list of paid group departures without a final PNR.
// Local-only session and intercepted gateway answers (made-up values).
if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const passenger = (position: number, first: string, last: string) => ({ position, type: "ADT", title: "MR", first_name: first, last_name: last,
  date_of_birth: "1990-01-31", id_type: "PSPT", document_number: `AB12345${position}7`, nationality: "PAK" });
const DETAIL = {
  source: "gateway_bookings", sample: false, booking_id: "TRV-GRP-000123", product: "group", customer_or_agency: "Ali Raza",
  statuses: { booking: "held", payment: "paid", issuance: "not_issued" }, amount: rs(237_000), amount_paid: rs(237_000), amount_due: rs(0),
  deadline: "2099-11-10T13:28:58Z", created_at: "2026-11-09T13:28:58Z", fare: { billable_price: rs(237_000) },
  passengers: [passenger(0, "Muhammad Abdullah Rehman", "Rehmanullah Khan Durrani"), passenger(1, "Sana", "Raza")],
  sections_not_available: ["payments", "servicing", "audit", "tickets"], can_record_payments: true, can_issue_tickets: true, can_set_selling_price: false,
  group_ticketing_status: "awaiting_final_pnr", can_edit_group_tickets: true, itinerary_available: false,
};
const DEPARTURES = { window_hours: 48, total: 2, items: [
  { booking_id: "TRV-GRP-000123", departure_at: "2026-11-16T18:30:00+05:00", route: "LHE → JED → LHE", airline_name: "Fly Jinnah", flight_number: "9P742",
    customer_or_agency: "Muhammad Abdullah Rehman Rehmanullah Khan Durrani Travel and Tours International" },
  { booking_id: "TRV-GRP-000124", departure_at: "2026-11-17T22:00:00+05:00", route: "ISB → DMM", airline_name: "AirSial", flight_number: "PF742", customer_or_agency: "Sana Raza" },
] };

async function open(page: Page, width: number, path: string) {
  await page.setViewportSize({ width, height: 900 });
  const posts: unknown[] = [];
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (url.port === "8000") {
      if (url.pathname === "/v1/admin/bookings/TRV-GRP-000123") return route.fulfill({ json: DETAIL });
      if (url.pathname === "/v1/admin/flight-operations/group-departures-without-final-pnr") return route.fulfill({ json: DEPARTURES });
      if (url.pathname === "/v1/group-ticketing/holds/TRV-GRP-000123/tickets") {
        posts.push(route.request().postDataJSON());
        return route.fulfill({ json: { ticketing_status: "final_pnr_received" } });
      }
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return ["localhost", "127.0.0.1"].includes(url.hostname) ? route.continue() : route.fulfill({ json: {} });
  });
  await page.addInitScript(() => localStorage.setItem("travelian.session.v1", JSON.stringify({
    email: "layout-test@travelian.com", name: "Layout Test", createdAt: new Date().toISOString(),
    accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
  })));
  await page.goto(path);
  return posts;
}

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const width of [1440, 1024, 768, 390]) {
  test(`group Tickets tab: final PNR and ticket numbers, downloads off until Ticketed at ${width}px`, async ({ page }) => {
    const posts = await open(page, width, "/admin/bookings/TRV-GRP-000123/tickets");
    const tab = page.getByRole("region", { name: "Tickets" });
    await expect(tab).toContainText("Paid – awaiting final PNR");
    await expect(page.getByRole("button", { name: "Download itinerary (PDF)" })).toBeDisabled();
    await expect(page.getByText("Available once the tickets are issued (final PNR)")).toBeVisible();
    await tab.getByLabel("Final PNR").fill("K9QX2L");
    await tab.getByLabel("Ticket number, MR Sana Raza").fill("2142345678902");
    expect(await overflow(page)).toBe(0);
    await expectReadableText(page, `group tickets at ${width}px`);
    await docsShot(page, `group-final-pnr-tickets-${width}`);
    await tab.getByRole("button", { name: "Save" }).click();
    await expect.poll(() => posts.length).toBe(1);
    expect(posts[0]).toEqual({ final_pnr: "K9QX2L", tickets: [{ position: 0, ticket_number: null }, { position: 1, ticket_number: "2142345678902" }] });
  });

  test(`Flight Operations: group departures without final PNR at ${width}px`, async ({ page }) => {
    await open(page, width, "/admin/flight-bookings");
    const panel = page.getByRole("region", { name: "Group departures without final PNR" });
    await expect(panel.getByRole("link", { name: "TRV-GRP-000123" })).toHaveAttribute("href", "/admin/bookings/TRV-GRP-000123/tickets");
    await expect(panel).toContainText("2 bookings");
    expect(await overflow(page)).toBe(0);
    await docsShot(page, `flight-operations-group-departures-${width}`);
  });
}
