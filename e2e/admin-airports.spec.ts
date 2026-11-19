import { expect, test, type Page, type Request } from "@playwright/test";
import { gatewayView } from "./support/gateway";

// Search > Flights origin and destination suggestions: the airport list is in the frontend,
// so typing makes no request. Local-only session and intercepted gateway answers.
if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

const SEARCH = { search_id: "s-e2e", expires_at: new Date(Date.now() + 15 * 60_000).toISOString(), status: "complete", providers: [], journeys: [] };

async function open(page: Page, width = 1440, query = "") {
  const searches: Request[] = [];
  await page.setViewportSize({ width, height: 900 });
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
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
    email: "layout-test@travelian.com", groups: ["super_admin"], name: "Layout Test", createdAt: new Date().toISOString(),
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

test("clicking From lists popular airports before typing; one can be picked", async ({ page }) => {
  await open(page);
  await from(page).click();
  const options = page.getByRole("option");
  await expect(options.first()).toContainText("LHE - Lahore");
  await expect(options.nth(1)).toContainText("KHI - Karachi");
  await expect(options).toHaveCount(21);
  const panel = page.locator("[data-radix-popper-content-wrapper]");
  const box = await panel.boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(900);            // stays inside the viewport, scrolls inside
  await page.getByRole("option", { name: /DXB - Dubai/ }).click();
  await expect(page.getByRole("button", { name: /^From DXB - Dubai/ })).toBeVisible();
  await to(page).click();
  await expect(page.getByRole("option").first()).toContainText("LHE - Lahore");
  await to(page).press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
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

test.describe("dates in a month-first browser language", () => {
  test.use({ locale: "en-US" });
  test("departure and return show day first; the request keeps ISO dates", async ({ page }) => {
    const searches = await open(page, 1440, "&from=LHE&to=KHI&date=2026-11-24&trip=roundtrip&return=2026-12-03");
    await expect(page.getByLabel("Departure date", { exact: true })).toHaveValue("24 Nov 2026");
    await expect(page.getByLabel("Return date", { exact: true })).toHaveValue("3 Dec 2026");
    await page.getByRole("button", { name: "Choose from calendar" }).first().click();
    await page.getByRole("gridcell", { name: "26" }).first().click();
    await expect(page.getByLabel("Departure date", { exact: true })).toHaveValue("26 Nov 2026");
    await page.getByRole("button", { name: "Search flights" }).click();
    await expect.poll(() => searches.at(-1)?.postDataJSON()?.departure_date).toBe("2026-11-26");
    expect(searches.at(-1)?.postDataJSON()?.return_date).toBe("2026-12-03");
  });
});

// Item 4: readable airport fields.
const notClipped = (page: Page, code: string) => page.getByRole("button", { name: new RegExp(`^(From|To) ${code} - `) }).evaluate(button =>
  [...button.querySelectorAll<HTMLElement>("[data-airport-line]")].every(line =>
    line.scrollWidth <= line.clientWidth + 1 && line.scrollHeight <= line.clientHeight + 1));

for (const width of [1280, 1440, 390]) {
  test(`airport names are readable at ${width}px`, async ({ page }) => {
    await open(page, width, "&from=LHE&to=KHI&date=2026-11-24");
    for (const code of ["LHE", "KHI"]) {
      const card = page.getByRole("button", { name: new RegExp(`^(From|To) ${code} - `) });
      await expect(card).toContainText(code === "LHE" ? "Allama Iqbal International Airport, Pakistan" : "Jinnah International Airport, Pakistan");
      expect(await notClipped(page, code)).toBe(true);
    }
    for (const control of [page.getByRole("button", { name: "Clear from airport" }), page.getByRole("button", { name: "Swap origin and destination" }),
      page.getByLabel("Departure date", { exact: true }), page.getByRole("button", { name: "Search flights" })]) {
      expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(40);
    }
    const from = (await page.getByRole("button", { name: /^From LHE/ }).boundingBox())!;
    const to = (await page.getByRole("button", { name: /^To KHI/ }).boundingBox())!;
    if (width >= 900) expect(Math.abs(from.y - to.y)).toBeLessThan(2);   // side by side
    else expect(to.y).toBeGreaterThan(from.y + from.height);             // stacked, Swap between

    // Round swap button (Wego style): icon only, centred on the line between the two cards.
    const swap = page.getByRole("button", { name: "Swap origin and destination" });
    await expect(swap).toHaveText("");
    const fromCard = (await page.locator("#flight-from").locator("..").boundingBox())!;
    const toCard = (await page.locator("#flight-to").locator("..").boundingBox())!;
    const button = (await swap.boundingBox())!;
    const cx = button.x + button.width / 2;
    const cy = button.y + button.height / 2;
    expect(Math.abs(button.width - button.height)).toBeLessThan(1);
    if (width >= 900) {
      expect(Math.abs(cx - (fromCard.x + fromCard.width + toCard.x) / 2)).toBeLessThan(2);
      expect(Math.abs(cy - (fromCard.y + fromCard.height / 2))).toBeLessThan(3);
      expect(Math.abs(fromCard.width - toCard.width)).toBeLessThan(2);              // each half the row
    } else {
      expect(Math.abs(cy - (fromCard.y + fromCard.height + toCard.y) / 2)).toBeLessThan(14); // between, under the To label
      expect(cy).toBeGreaterThan(fromCard.y + fromCard.height);
      expect(cy).toBeLessThan(toCard.y);
      expect(Math.abs(cx - (fromCard.x + fromCard.width / 2))).toBeLessThan(2);
    }
    expect(await overflow(page)).toBe(0);

    await page.getByRole("button", { name: "Clear to airport" }).click();
    await page.getByRole("combobox", { name: "To" }).fill("international");
    const dropdown = page.locator("[data-radix-popper-content-wrapper] > *").filter({ has: page.getByRole("listbox") });
    const field = (await page.getByRole("combobox", { name: "To" }).boundingBox())!;
    // Wait out the opening zoom animation, then measure.
    await expect.poll(async () => (await dropdown.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(Math.max(360, field.width) - 1);
    const list = (await dropdown.boundingBox())!;
    expect(list.x >= 0 && list.x + list.width <= width).toBe(true);
    const row = (await page.getByRole("option").first().boundingBox())!;
    expect(row.height).toBeGreaterThanOrEqual(48);
    await page.mouse.move(0, 0);                                        // keyboard only from here
    await page.keyboard.press("ArrowDown");
    const highlighted = page.locator('[role="option"][aria-selected="true"]');
    const code = (await highlighted.innerText()).slice(0, 3);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: new RegExp(`^To ${code} - `) })).toBeVisible();
    expect(await overflow(page)).toBe(0);
  });
}

test("swap: tooltip, keyboard, and empty fields are harmless", async ({ page }) => {
  await open(page, 1440, "&from=LHE&date=2026-11-24");
  const swap = page.getByRole("button", { name: "Swap origin and destination" });
  await swap.focus();
  await expect(page.getByRole("tooltip")).toContainText("Swap origin and destination");
  await page.keyboard.press("Enter");                                   // LHE moves to To; From is empty
  await expect(page.getByRole("button", { name: /^To LHE - Lahore/ })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "From" })).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: /^From LHE - Lahore/ })).toBeVisible();
});

