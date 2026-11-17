import { expect, test, type Page, type Request } from "@playwright/test";
import { gatewayView } from "./support/gateway";
import { expectReadableText } from "./support/type-scale";

// Search > Group Ticketing: same form as Flights (shared parts), From/To limited to available
// sectors, Suggested routes from real sectors, day-first date. Local-only session and
// intercepted gateway answers (made-up inventory).
if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

const ticket = (id: string, sector: string, count = 1) => Array.from({ length: count }, (_, index) => ({
  id: `${id}-${index}`, sector, departure_date: "2026-11-24", departure_time: "09:45", airline: "Airblue",
  selling_price: { amount_minor: 9_975_000, currency: "PKR" }, remaining: 9, baggage: "20 KG",
}));
const INVENTORY = { data: [{ id: "g1", sector: "mixed", airline: "Airblue", tickets: [
  ...ticket("a", "LHE - JED", 5), ...ticket("b", "ISB - JED", 4), ...ticket("c", "KHI - JED", 3), ...ticket("d", "LHE - MED", 2), ...ticket("e", "LHE - ZZQ", 1),
] }] };

async function open(page: Page, width = 1440, { empty = false, query = "" } = {}) {
  const searches: Request[] = [];
  await page.setViewportSize({ width, height: 900 });
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (url.port === "8000") {
      if (url.pathname === "/v1/group-ticketing/inventory") return route.fulfill({ json: empty ? { data: [] } : INVENTORY });
      if (url.pathname === "/v1/group-ticketing/search") {
        searches.push(route.request());
        return route.fulfill({ json: INVENTORY });
      }
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return ["localhost", "127.0.0.1"].includes(url.hostname) ? route.continue() : route.fulfill({ json: {} });
  });
  await page.addInitScript(() => localStorage.setItem("travelian.session.v1", JSON.stringify({
    email: "layout-test@travelian.com", name: "Layout Test", createdAt: new Date().toISOString(),
    accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
  })));
  await page.goto(`/admin/search?tab=group-ticketing${query}`);
  await expect(page.getByRole("region", { name: "Search group fares" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  return searches;
}

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const chips = (page: Page) => page.locator("[data-route-chip]");

test("tabs carry the public icons; Group Ticketing is active", async ({ page }) => {
  await open(page);
  const tabs = page.getByRole("navigation", { name: "Search products" }).getByRole("link");
  await expect(tabs).toHaveText(["Flights", "Group Ticketing", "Hotels"]);  // Umrah is hidden from the site
  await expect(page.locator("[data-tab-icon]")).toHaveCount(3);
  await expect(page.getByRole("link", { name: "Group Ticketing" })).toHaveAttribute("aria-current", "page");
});

test("Suggested routes: the 4 sectors with the most departures; a chip fills From and To without searching", async ({ page }) => {
  const searches = await open(page);
  await expect(chips(page)).toHaveText(["LHE → JED (5)", "ISB → JED (4)", "KHI → JED (3)", "LHE → MED (2)"]);
  await chips(page).nth(1).click();
  await expect(page.getByRole("button", { name: "From Islamabad – ISB" })).toBeVisible();
  await expect(page.getByRole("button", { name: "To Jeddah – JED" })).toBeVisible();
  await expect(chips(page).nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Select available sector")).toContainText("ISB → JED (4)");
  expect(searches).toHaveLength(0);                                    // a chip never searches by itself
});

test("no sector data: the chips row is hidden and the form says so", async ({ page }) => {
  await open(page, 1440, { empty: true });
  await expect(chips(page)).toHaveCount(0);
  await expect(page.getByText("Suggested routes:")).toHaveCount(0);
  await expect(page.getByText("No group sectors are available right now.")).toBeVisible();
});

test("From and To list only the available sectors; keyboard; a code not in the airport list shows alone", async ({ page }) => {
  await open(page);
  const from = page.getByRole("combobox", { name: "From", exact: true });
  await from.focus();
  await page.keyboard.press("ArrowDown");
  const fromList = page.getByRole("listbox", { name: "From airports" });
  await expect(fromList.getByRole("option")).toHaveCount(3);          // ISB, KHI, LHE
  await expect(fromList).toContainText("LHE - Lahore");
  await expect(fromList).toContainText("Allama Iqbal International Airport, Pakistan");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "From Karachi – KHI" })).toBeVisible();

  await page.getByRole("combobox", { name: "To", exact: true }).click();
  const toList = page.getByRole("listbox", { name: "To airports" });
  await expect(toList.getByRole("option")).toHaveText([/JED - Jeddah/, /MED - Madinah|MED - Medina/, "ZZQ"]);
  await toList.getByRole("option", { name: "ZZQ" }).click();
  await expect(page.getByRole("button", { name: /^To ZZQ$/ })).toBeVisible();
  await page.keyboard.press("Escape");
});

test("swap keeps today's behaviour: a reverse pair with no sector is allowed and finds nothing", async ({ page }) => {
  const searches = await open(page, 1440, { query: "&from=LHE&to=JED&date=2026-11-24" });
  await page.getByRole("button", { name: "Swap origin and destination" }).click();
  await expect(page.getByRole("button", { name: "From Jeddah – JED" })).toBeVisible();
  await expect(page.getByRole("button", { name: "To Lahore – LHE" })).toBeVisible();
  await expect(page.getByLabel("Select available sector")).toContainText("All available sectors");
  await page.getByRole("button", { name: "Search group fares" }).click();
  await expect.poll(() => searches.at(-1)?.postDataJSON()).toMatchObject({ origin: "JED", destination: "LHE", departure_date: "2026-11-24" });
});

test.describe("month-first browser language", () => {
  test.use({ locale: "en-US" });
  test("day-first date; the request keeps the ISO date", async ({ page }) => {
  const searches = await open(page, 1440, { query: "&from=LHE&to=JED" });
  const date = page.getByLabel("Departure Date", { exact: true });
  await date.fill("24/11/2026");
  await date.blur();
  await expect(date).toHaveValue("24 Nov 2026");
  await page.getByRole("button", { name: "Search group fares" }).click();
  await expect.poll(() => searches.at(-1)?.postDataJSON()?.departure_date).toBe("2026-11-24");
  });
});

for (const width of [1280, 1440, 390]) {
  test(`same layout as Flights at ${width}px`, async ({ page }) => {
    await open(page, width, { query: "&from=LHE&to=JED&date=2026-11-24" });
    const fromCard = (await page.locator("#group-from").locator("..").boundingBox())!;
    const toCard = (await page.locator("#group-to").locator("..").boundingBox())!;
    const swap = page.getByRole("button", { name: "Swap origin and destination" });
    const button = (await swap.boundingBox())!;
    const cx = button.x + button.width / 2;
    const cy = button.y + button.height / 2;
    if (width >= 900) {
      expect(Math.abs(fromCard.y - toCard.y)).toBeLessThan(2);
      expect(Math.abs(fromCard.width - toCard.width)).toBeLessThan(2);
      expect(Math.abs(cx - (fromCard.x + fromCard.width + toCard.x) / 2)).toBeLessThan(2);
    } else {
      expect(toCard.y).toBeGreaterThan(fromCard.y + fromCard.height);
      expect(cy).toBeGreaterThan(fromCard.y + fromCard.height);
      expect(cy).toBeLessThan(toCard.y);
    }
    // A chosen airport is one line, "Lahore – LHE": the field is exactly the search-field height.
    expect(Math.round(fromCard.height)).toBe(56);
    expect(Math.round(toCard.height)).toBe(56);
    await expect(page.locator("#group-from")).toHaveText("Lahore – LHE");
    // Leading icons: take-off, landing, calendar (as on the public site).
    await expect(page.locator("#group-from svg.lucide-plane-takeoff")).toHaveCount(1);
    await expect(page.locator("#group-to svg.lucide-plane-landing")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Choose from calendar" })).toBeVisible();
    expect(await overflow(page)).toBe(0);
    await expectReadableText(page, `Group Ticketing at ${width}px`);

    await page.getByRole("button", { name: "From Lahore – LHE" }).click();
    const panel = page.locator("[data-radix-popper-content-wrapper] > *").filter({ has: page.getByRole("listbox") });
    await expect.poll(async () => (await panel.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(Math.min(360, width - 24) - 1);
    expect(await overflow(page)).toBe(0);
  });
}
