import { expect, test, type Page, type Request } from "@playwright/test";
import { gatewayView } from "./support/gateway";
import { docsShot } from "./support/docs-shot";
import { expectReadableText } from "./support/type-scale";

// Customers & Travelers: search, detail, add person, duplicate choice, merge, permissions and
// no horizontal page scroll. Local-only session and intercepted gateway answers (made-up,
// full values); nothing reaches a real gateway.
if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

const LONG = { first_name: "Muhammad Abdullah Rehman", last_name: "Rehmanullah Khan Durrani" };
const DOCS = [
  { id: "d-1", id_type: "PSPT", document_country: "PAK", document_number: "AB1234567", document_expiry: "2031-01-01", document_validity: "valid" },
  { id: "d-2", id_type: "NATI", document_country: "PAK", document_number: "3520212345671" },
];
const ONE = { id: "p-00000001", title: "MR", ...LONG, date_of_birth: "1990-01-31", nationality: "PAK", phone: "+92 3001234567",
  email: "abdullah@a-very-long-company-domain-name.example.invalid", documents: DOCS, last_booking_at: "2026-11-09T13:28:58Z", match: "name" };
const TWO = { id: "p-00000002", title: "MR", first_name: "Muhammad", last_name: "Durrani", date_of_birth: "1990-01-31", phone: "+92 3001111111", documents: [], match: "name" };
const DETAIL = { ...ONE, match: undefined, date_of_birth: "1990-01-31", can_manage: true, can_merge: true,
  bookings: [
    { booking_id: "TRV-PE49ZP", created_at: "2026-11-09T13:28:58Z", role: "traveler", pnr: "63B55C", product: "flight", route: "LHE → IST → YYZ → IST → LHE",
      departure_local: "2026-11-19T00:25", statuses: { booking: "ticket_issued", payment: "paid", issuance: "issued" },
      ticket_numbers: ["2142345678901", "2142345678902"], selling_price: { amount_minor: 46_700_000, currency: "PKR" },
      supplier_cost: { amount_minor: 45_770_000, currency: "PKR" }, profit: { amount_minor: 930_000, currency: "PKR" } },
    { booking_id: "TRV-GR0UP1", created_at: "2026-11-10T09:00:00Z", role: "customer", product: "group", route: "LHE → JED",
      departure_local: "2026-12-02T03:10", statuses: { booking: "held", payment: "unpaid", issuance: "not_issued" }, ticket_numbers: [],
      selling_price: { amount_minor: 19_000_000, currency: "PKR" }, cost_unknown: true },
  ] };

interface Options { canManage?: boolean; canMerge?: boolean; forbidden?: boolean }

async function open(page: Page, width: number, path: string, { canManage = true, canMerge = true, forbidden = false }: Options = {}) {
  const posts: Request[] = [];
  await page.setViewportSize({ width, height: 900 });
  await page.route("**/*", route => {
    const request = route.request();
    const url = gatewayView(request.url());
    if (url.port === "8000") {
      if (forbidden) return route.fulfill({ status: 403, json: { detail: "Back office only.", code: "not_allowed" } });
      if (request.method() === "POST") posts.push(request);
      if (url.pathname === "/v1/admin/customers" && request.method() === "GET") {
        return route.fulfill({ json: { results: [ONE, TWO], can_manage: canManage, can_merge: canMerge } });
      }
      if (url.pathname === "/v1/admin/customers" && request.method() === "POST") {
        const body = request.postDataJSON();
        if (!body.duplicate_choice) {
          return route.fulfill({ status: 409, json: { detail: "A saved person looks like the same person.", code: "possible_duplicate", possible_duplicate: TWO, reason: "same_phone" } });
        }
        return route.fulfill({ status: 201, json: { person: { ...DETAIL, id: "p-00000003", first_name: "New", last_name: "Person" }, outcome: "created" } });
      }
      if (url.pathname === "/v1/admin/customers/p-00000001/merge") return route.fulfill({ json: { ...DETAIL, id: "p-00000002" } });
      const detail = url.pathname.match(/^\/v1\/admin\/customers\/(p-\d+)$/);
      if (detail) return route.fulfill({ json: { ...DETAIL, id: detail[1], can_manage: canManage, can_merge: canMerge, ...(detail[1] === "p-00000003" ? { first_name: "New", last_name: "Person" } : {}) } });
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

for (const width of [390, 768, 1024, 1440]) {
  test(`search, travelers and detail fit at ${width}px`, async ({ page }) => {
    await open(page, width, "/admin/customers");
    await page.getByLabel("Search", { exact: true }).fill("durrani");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    const table = page.getByRole("region", { name: "Customers" });
    await expect(table).toContainText("+92 3001234567");
    await expect(page).toHaveURL(/q=durrani/);
    expect(await overflow(page)).toBe(0);
    await expectReadableText(page, `customers at ${width}px`);

    await page.getByRole("link", { name: "Travelers", exact: true }).click();
    await expect(page.getByRole("region", { name: "Travelers" })).toContainText("31 Jan 1990");
    await expect(page.getByRole("region", { name: "Travelers" })).toContainText("Passport AB1234567");
    expect(await overflow(page)).toBe(0);
    await expectReadableText(page, `travelers at ${width}px`);

    await page.getByRole("link", { name: `${LONG.first_name} ${LONG.last_name}` }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`${LONG.first_name} ${LONG.last_name}`);
    await expect(page.getByRole("region", { name: "Documents" })).toContainText("3520212345671");
    const history = page.getByRole("region", { name: "Bookings" });
    await expect(history).toContainText("TRV-PE49ZP");
    await expect(history).toContainText("LHE → IST → YYZ → IST → LHE");
    await expect(history).toContainText("2142345678902");
    await expect(history).toContainText("Profit");
    await docsShot(page, `customer-booking-history-${width}`);
    await expect(page.getByText(/reveal/i)).toHaveCount(0);
    expect(await overflow(page)).toBe(0);
    await expectReadableText(page, `person detail at ${width}px`);
  });
}

test("add a person, see the possible duplicate, keep separate", async ({ page }) => {
  const posts = await open(page, 1440, "/admin/customers");
  await page.getByRole("button", { name: "Add Customer" }).click();
  const dialog = page.getByRole("dialog", { name: "Add Customer" });
  await dialog.getByLabel("First name").fill("New");
  await dialog.getByLabel("Last name").fill("Person");
  await dialog.getByLabel("Phone", { exact: true }).fill("3001234567");
  await dialog.getByRole("button", { name: "Save" }).click();
  const notice = dialog.getByRole("region", { name: "Possible duplicate" });
  await expect(notice).toContainText("Possible duplicate: Same phone");
  await expect(notice).toContainText("+92 3001111111");
  await expect(dialog).not.toContainText("possible_duplicate");
  await notice.getByRole("button", { name: "Keep separate" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "New Person" })).toBeVisible();
  const bodies = posts.filter(r => r.url().endsWith("/v1/admin/customers")).map(r => r.postDataJSON());
  expect(bodies[0].duplicate_choice).toBeUndefined();
  expect(bodies[1].duplicate_choice).toEqual({ choice: "keep_separate", person_id: "p-00000002" });
  expect(bodies[1].phone).toBe("3001234567");
});

test("merge needs a person and a reason, then opens the kept record", async ({ page }) => {
  const posts = await open(page, 1024, "/admin/customers?q=durrani");
  await page.getByRole("button", { name: `Merge duplicates of ${LONG.first_name} ${LONG.last_name}` }).click();
  const dialog = page.getByRole("dialog", { name: "Merge duplicates" });
  await expect(dialog.getByRole("button", { name: "Merge", exact: true })).toBeDisabled();
  await dialog.getByLabel("Person to keep").first().fill("muhammad");
  await dialog.getByRole("button", { name: "Search" }).click();
  await dialog.getByRole("radio").first().check();                         // the source itself is not offered
  await expect(dialog.getByRole("radio")).toHaveCount(1);
  await dialog.getByLabel("Reason").fill("Same person, two records");
  const box = await dialog.boundingBox();
  expect(box && box.y >= 0 && box.y + box.height <= 900).toBe(true);
  await dialog.getByRole("button", { name: "Merge", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/customers\/people\/p-00000002$/);
  const merge = posts.find(r => r.url().endsWith("/merge"));
  expect(merge?.postDataJSON()).toEqual({ merge_into_person_id: "p-00000002", reason: "Same person, two records" });
});

test("a role without manage_people or merge_people sees no edit or merge buttons", async ({ page }) => {
  await open(page, 1440, "/admin/customers?q=durrani", { canManage: false, canMerge: false });
  await expect(page.getByRole("region", { name: "Customers" })).toContainText("+92 3001234567");
  await expect(page.getByRole("button", { name: /^Edit/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Merge/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add Customer" })).toHaveCount(0);
  await page.getByRole("link", { name: "View bookings of Muhammad Durrani" }).click();
  await expect(page.getByRole("region", { name: "Documents" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^(Edit|Merge duplicates|Attach document|Remove)/ })).toHaveCount(0);
});

test("agency roles get a plain notice, not data", async ({ page }) => {
  await open(page, 768, "/admin/customers?q=durrani", { forbidden: true });
  await expect(page.getByText("Not available for your role")).toBeVisible();
  await expect(page.getByText("not_allowed")).toHaveCount(0);
  expect(await overflow(page)).toBe(0);
});

test("opens with the 50 most recent people, before any search", async ({ page }) => {
  const asked: URL[] = [];
  page.on("request", request => {
    const url = gatewayView(request.url());
    if (url.port === "8000" && url.pathname === "/v1/admin/customers") asked.push(url);
  });
  await open(page, 1440, "/admin/customers");
  const list = page.getByRole("region", { name: "Customers" });
  await expect(list).toContainText("The 50 most recent people");
  await expect(list.getByRole("row")).toHaveCount(3); // header + the two people the gateway returned
  expect(asked[0].searchParams.get("q")).toBeNull();
  expect(asked[0].searchParams.get("limit")).toBe("50");
});
