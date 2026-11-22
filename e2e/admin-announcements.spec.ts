import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// #92: admin announcements come from the gateway (mocked here: an in-memory list). Super Admin posts, ends and deletes
// them on Website & CMS > Announcements; every staff role sees the live ones in the top bar. ANNOUNCE_SHOTS=<dir> saves
// screenshots.
if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
const SHOTS = process.env.ANNOUNCE_SHOTS;

type Item = { id: string; message: string; created_at: string; starts_at: string | null; ends_at: string | null; status: string; ended_at: string | null };

function mockGateway(page: Page, items: Item[], options: { failList?: boolean } = {}) {
  const calls: { method: string; path: string; body?: unknown }[] = [];
  let next = 1;
  const live = () => items.filter(item => item.status === "active").map(({ id, message, created_at, starts_at, ends_at }) => ({ id, message, created_at, starts_at, ends_at }));
  return page.route("**/*", async route => {
    const request = route.request();
    const url = gatewayView(request.url());
    if (!isGateway(url)) return isLocal(url) ? route.continue() : route.fulfill({ json: {} });
    const method = request.method();
    const path = url.pathname;
    if (!path.startsWith("/v1/admin/announcements")) return route.fulfill({ status: 404, json: { detail: "Not found." } });
    calls.push({ method, path, body: request.postDataJSON?.() ?? undefined });
    if (options.failList) return route.fulfill({ status: 503, json: { detail: "Agency service unavailable." } });
    if (method === "GET" && path === "/v1/admin/announcements") return route.fulfill({ json: { items: live() } });
    if (method === "GET" && path === "/v1/admin/announcements/all") return route.fulfill({ json: { items } });
    if (method === "POST" && path === "/v1/admin/announcements") {
      const body = request.postDataJSON() as { message: string };
      const created = { id: `id-${next++}`, message: body.message, created_at: new Date().toISOString(), starts_at: null, ends_at: null, status: "active", ended_at: null };
      items.unshift(created);
      return route.fulfill({ status: 201, json: created });
    }
    const end = path.match(/^\/v1\/admin\/announcements\/([^/]+)\/end$/);
    if (method === "POST" && end) {
      const item = items.find(entry => entry.id === end[1])!;
      Object.assign(item, { status: "ended", ended_at: new Date().toISOString() });
      return route.fulfill({ json: item });
    }
    const one = path.match(/^\/v1\/admin\/announcements\/([^/]+)$/);
    if (method === "DELETE" && one) {
      items.splice(items.findIndex(entry => entry.id === one[1]), 1);
      return route.fulfill({ json: { id: one[1], deleted: true } });
    }
    return route.fulfill({ status: 404, json: { detail: "Not found." } });
  }).then(() => calls);
}

async function signIn(page: Page, role: string, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.addInitScript(group => localStorage.setItem("travelian.session.v1", JSON.stringify({
    email: "announce-test@travelian.com", groups: [group], name: "Announce Test", createdAt: new Date().toISOString(),
    accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
  })), role);
}

const shot = async (page: Page, name: string) => {
  if (!SHOTS) return;
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
};

const ticker = (page: Page) => page.getByRole("region", { name: "Announcements", exact: true });
const noSidewaysScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test("Super Admin: empty state, post, show in the top bar, end, delete", async ({ page }) => {
  const items: Item[] = [];
  const calls = await mockGateway(page, items);
  await signIn(page, "super_admin", 1440);
  await page.goto("/admin/announcements");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Announcements");
  await expect(page.getByText("No announcements yet")).toBeVisible();
  await expect(ticker(page)).toHaveCount(0);                                  // no bar when there are none
  await expect(page.getByRole("button", { name: "Post announcement" })).toBeDisabled();
  await shot(page, "after-page-empty-1440");

  await page.getByLabel("Announcement text").fill("  New group seats on LHE-JED for 12 Dec  ");
  await page.getByRole("button", { name: "Post announcement" }).click();
  await expect(page.getByText("Announcement posted. Staff see it in the top bar within a minute.")).toBeVisible();
  expect(calls.find(call => call.method === "POST")?.body).toEqual({ message: "New group seats on LHE-JED for 12 Dec", starts_at: null, ends_at: null });
  await expect(page.getByRole("article").filter({ hasText: "New group seats on LHE-JED for 12 Dec" })).toContainText("In top bar");
  await expect(ticker(page)).toContainText("New group seats on LHE-JED for 12 Dec");
  await expect(page.getByLabel("Announcement text")).toHaveValue("");
  await shot(page, "after-page-posted-1440");

  await page.getByRole("button", { name: "End announcement: New group seats on LHE-JED for 12 Dec" }).click();
  await expect(page.getByRole("article")).toContainText("Ended");
  await expect(ticker(page)).toHaveCount(0);

  await page.getByRole("button", { name: "Delete announcement: New group seats on LHE-JED for 12 Dec" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete this announcement?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Delete" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("No announcements yet")).toBeVisible();
  expect(calls.map(call => `${call.method} ${call.path}`)).toEqual(expect.arrayContaining([
    "POST /v1/admin/announcements", "POST /v1/admin/announcements/id-1/end", "DELETE /v1/admin/announcements/id-1",
  ]));
});

test("the menu has Announcements under Website & CMS for Super Admin", async ({ page }) => {
  await mockGateway(page, []);
  await signIn(page, "super_admin", 1440);
  await page.goto("/admin/bookings");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const menu = page.getByRole("button", { name: /Website & CMS/ });
  if (await menu.count()) await menu.first().click();
  await expect(page.getByRole("link", { name: "Announcements" })).toBeVisible();
});

test("a gateway refusal shows the gateway's message and nothing is listed", async ({ page }) => {
  await mockGateway(page, [], {});
  await page.unrouteAll();
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (!isGateway(url)) return isLocal(url) ? route.continue() : route.fulfill({ json: {} });
    if (url.pathname === "/v1/admin/announcements" && route.request().method() === "POST") {
      return route.fulfill({ status: 422, json: { detail: "Use plain text only: < and > are not allowed." } });
    }
    if (url.pathname.startsWith("/v1/admin/announcements")) return route.fulfill({ json: { items: [] } });
    return route.fulfill({ status: 404, json: { detail: "Not found." } });
  });
  await signIn(page, "super_admin", 390);
  await page.goto("/admin/announcements");
  await page.getByLabel("Announcement text").fill("<b>Fares</b>");
  await page.getByRole("button", { name: "Post announcement" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Use plain text only: < and > are not allowed." })).toBeVisible();
  await expect(page.getByLabel("Announcement text")).toHaveValue("<b>Fares</b>");   // kept, so it can be corrected
});

test("the list can't load: an error, not an empty state", async ({ page }) => {
  await mockGateway(page, [], { failList: true });
  await signIn(page, "super_admin", 1440);
  await page.goto("/admin/announcements");
  await expect(page.getByText("Announcements couldn't be loaded")).toBeVisible();
  await expect(page.getByText("No announcements yet")).toHaveCount(0);
  await expect(ticker(page)).toHaveCount(0);
});

test("staff see the top bar announcements but not the Announcements page or menu", async ({ page }) => {
  await mockGateway(page, [{ id: "a", message: "Airblue fares are Rs 200 less today", created_at: "2026-11-22T08:00:00Z", starts_at: null, ends_at: null, status: "active", ended_at: null }]);
  await signIn(page, "staff", 1440);
  await page.goto("/admin/bookings");
  await expect(ticker(page)).toContainText("Airblue fares are Rs 200 less today");
  await expect(page.getByRole("link", { name: "Announcements" })).toHaveCount(0);
  await page.goto("/admin/announcements");
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Announcements");
});

const LONG = "Fare change: Saudia, PIA and Airblue group fares to Jeddah, Madinah and Riyadh go up by Rs 4,500 per adult from Monday; " +
  "please re-quote every held booking before payment and tell customers before they pay so nobody is surprised.";

for (const width of [390, 768, 1440]) {
  test(`long messages at ${width}px: the top bar keeps its height, the account menu stays in view, no sideways scroll`, async ({ page }) => {
    await mockGateway(page, [
      { id: "b", message: LONG, created_at: "2026-11-22T09:00:00Z", starts_at: null, ends_at: null, status: "active", ended_at: null },
      { id: "a", message: "New group seats on LHE-JED", created_at: "2026-11-22T08:00:00Z", starts_at: null, ends_at: null, status: "active", ended_at: null },
    ]);
    await signIn(page, "staff", width);
    await page.goto("/admin/bookings");
    await expect(ticker(page)).toBeVisible();
    const header = await page.locator("header").first().boundingBox();
    expect(header!.height).toBe(64);
    const account = await page.getByRole("button", { name: /Open account menu/ }).boundingBox();
    expect(account!.x + account!.width).toBeLessThanOrEqual(width);
    expect(account!.y).toBeGreaterThanOrEqual(0);
    expect(await noSidewaysScroll(page)).toBe(0);
    await shot(page, `after-topbar-long-${width}`);
  });
}

test("the ticker pauses on hover and focus", async ({ page }) => {
  await mockGateway(page, [{ id: "b", message: LONG, created_at: "2026-11-22T09:00:00Z", starts_at: null, ends_at: null, status: "active", ended_at: null }]);
  await signIn(page, "staff", 390);
  await page.goto("/admin/bookings");
  const strip = ticker(page).locator("[tabindex='0']");
  await expect(strip).toBeVisible();
  const state = () => page.evaluate(() => document.querySelector(".admin-announcement-scroll")!.getAnimations()[0]?.playState);
  await expect.poll(state).toBe("running");
  await strip.hover();
  await expect.poll(state).toBe("paused");
  await page.mouse.move(0, 800);
  await expect.poll(state).toBe("running");
  await strip.focus();
  await expect.poll(state).toBe("paused");
});

test("with reduced motion nothing moves and the text can be scrolled by hand", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockGateway(page, [{ id: "b", message: LONG, created_at: "2026-11-22T09:00:00Z", starts_at: null, ends_at: null, status: "active", ended_at: null }]);
  await signIn(page, "staff", 390);
  await page.goto("/admin/bookings");
  await expect(ticker(page)).toBeVisible();
  expect(await page.evaluate(() => document.querySelector(".admin-announcement-scroll")!.getAnimations().length)).toBe(0);
  await expect(ticker(page).getByText(LONG)).toHaveCount(1);
  expect(await noSidewaysScroll(page)).toBe(0);
});

test("agency roles don't ask for staff announcements", async ({ page }) => {
  const calls = await mockGateway(page, [{ id: "a", message: "Staff only", created_at: "2026-11-22T08:00:00Z", starts_at: null, ends_at: null, status: "active", ended_at: null }]);
  await signIn(page, "agency_owner", 1440);
  await page.goto("/admin");
  await page.waitForLoadState("networkidle");
  await expect(ticker(page)).toHaveCount(0);
  expect(calls).toEqual([]);
});
