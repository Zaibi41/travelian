import { expect, test, type Page, type Request } from "@playwright/test";

// Search > Flights origin and destination suggestions: the airport list is in the frontend,
// so typing makes no request. Local-only session and intercepted gateway answers.
if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

const SEARCH = { search_id: "s-e2e", expires_at: new Date(Date.now() + 15 * 60_000).toISOString(), status: "complete", providers: [], journeys: [] };

async function open(page: Page, width = 1440, query = "") {
  const searches: Request[] = [];
  await page.setViewportSize({ width, height: 900 });
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.port === "8000") {
      if (url.pathname === "/v1/live-ticketing/flights/search") {
        searches.push(route.request());
        return route.fulfill({ json: SEARCH });
      }
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return ["localhost", "127.0.0.1"].includes(url.hostname) ? route.continue() : route.fulfill({ json: {} });
  });
  await page.addInitScript(() => localStorage.setItem("travelian.session.v1", JSON.stringify({
    email: "layout-test@travelian.com", name: "Layout Test", createdAt: new Date().toISOString(),
    accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
  })));
  await page.goto(`/admin/search?tab=flights${query}`);
  await expect(page.getByRole("region", { name: "Search flights" })).toBeVisible();
  await page.waitForLoadState("networkidle");                       // the Search page, including the airport list, has loaded
  return searches;
}

const from = (page: Page) => page.getByRole("combobox", { name: "From" });
const to = (page: Page) => page.getByRole("combobox", { name: "To" });
const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test("suggestions appear on the first keystroke with no request", async ({ page }) => {
  await open(page);
  const requests: string[] = [];
  page.on("request", request => requests.push(request.url()));
  await from(page).fill("l");
  await from(page).press("h");                                       // second character: the list opens at once
  await expect(page.getByRole("option", { name: /LHE - Lahore/ })).toBeVisible({ timeout: 500 });
  expect(requests).toEqual([]);
});

test("type lhe and pick Lahore; type kar and see Karachi; clear with the x", async ({ page }) => {
  await open(page);
  await from(page).fill("lhe");
  const lahore = page.getByRole("option").first();
  await expect(lahore).toContainText("LHE - Lahore");
  await expect(lahore).toContainText("Allama Iqbal International Airport, Pakistan");
  await lahore.click();
  const field = page.getByRole("region", { name: "Search flights" });
  await expect(field.getByRole("button", { name: /LHE - Lahore/ })).toBeVisible();

  await to(page).fill("kar");
  await expect(page.getByRole("listbox")).toContainText("KHI - Karachi");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);

  await page.getByRole("button", { name: "Clear from airport" }).click();
  await expect(from(page)).toBeFocused();
  await expect(field.getByRole("button", { name: /LHE - Lahore/ })).toHaveCount(0);
  await from(page).fill("zzzzq");
  await expect(page.getByRole("listbox")).toContainText("No airports found");
});

test("keyboard: arrows and Enter choose, Tab leaves", async ({ page }) => {
  await open(page);
  await from(page).fill("london");
  await expect(page.getByRole("option").first()).toHaveAttribute("aria-selected", "true");
  await from(page).press("ArrowDown");
  await from(page).press("ArrowDown");
  await from(page).press("ArrowUp");
  const second = page.getByRole("option").nth(1);
  await expect(second).toHaveAttribute("aria-selected", "true");
  const code = (await second.innerText()).slice(0, 3);
  await from(page).press("Enter");
  await expect(page.getByRole("button", { name: new RegExp(`^From ${code} - London`) })).toBeVisible();
  await to(page).fill("dxb");
  await to(page).press("Tab");                                        // an exact code typed then Tab keeps working
  await expect(page.getByRole("button", { name: /DXB - Dubai/ })).toBeVisible();
});

test("swap keeps both airports; the same airport is refused; the request carries 3-letter codes", async ({ page }) => {
  const searches = await open(page, 1440, "&from=LHE&to=KHI&date=2026-11-19");
  await expect(page.getByRole("button", { name: /LHE - Lahore/ })).toBeVisible();
  await page.getByRole("button", { name: "Swap origin and destination" }).click();
  const buttons = page.getByRole("region", { name: "Search flights" }).getByRole("button", { name: /^(From|To)/ });
  await expect(buttons.nth(0)).toContainText("KHI - Karachi");
  await expect(buttons.nth(1)).toContainText("LHE - Lahore");
  await page.getByRole("button", { name: "Search flights" }).click();
  await expect.poll(() => searches.length).toBeGreaterThan(1);
  const body = searches[searches.length - 1].postDataJSON();
  expect([body.origin, body.destination]).toEqual(["KHI", "LHE"]);

  await page.getByRole("button", { name: "Clear to airport" }).click();
  await to(page).fill("khi");
  await page.getByRole("option").first().click();
  await expect(page.getByRole("alert")).toHaveText("Origin and destination are the same airport. Choose a different destination.");
  await expect(page.getByRole("button", { name: "Search flights" })).toBeDisabled();
});

for (const width of [390, 768, 1024]) {
  test(`long airport names fit at ${width}px`, async ({ page }) => {
    await open(page, width, "&from=LHE&to=KHI&date=2026-11-19");
    await page.getByRole("button", { name: "Clear to airport" }).click();
    await to(page).fill("international");
    await expect(page.getByRole("option")).toHaveCount(8);
    const list = await page.getByRole("listbox").boundingBox();
    expect(list && list.x >= 0 && list.x + list.width <= width).toBe(true);
    expect(await overflow(page)).toBe(0);
  });
}
