import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// The gateway is answered here: the flight fare calendar is unavailable (any future date can be picked, as on the live
// site when prices can't load), everything else is empty.
async function mockGateway(page: Page) {
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (isGateway(url) && url.pathname.endsWith("/flights/calendar")) return route.fulfill({ status: 503, json: { detail: "test" } });
    return isLocal(url) && !isGateway(url) ? route.continue() : route.fulfill({ json: { items: [], groups: [], results: [] } });
  });
}

for (const [width, height] of [[1366, 768], [1440, 900], [1920, 1080], [1024, 768], [768, 1024], [640, 900], [375, 812], [320, 740]]) {
  test(`homepage prioritizes stable search and route discovery at ${width}px`, async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width, height });
    await mockGateway(page);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: width < 640 ? "Book travel with Travelian" : "Book Flights, Group Tickets & Hotels", exact: true })).toBeVisible();
    const pills = page.getByRole("list", { name: "Travelian value highlights" });
    await expect(pills.getByRole("listitem")).toHaveCount(3);
    await expect(pills).toContainText("Secure Payments");
    await expect(pills).toContainText("WhatsApp Support");
    await expect(pills).toContainText("Live + Group Fares");
    await expect(pills).not.toContainText(/B2B|Transparent fare/);
    const confidence = page.getByRole("region", { name: "Booking confidence" });
    await expect(confidence.getByRole("listitem")).toHaveCount(3);
    const popular = page.getByRole("region", { name: "Popular routes", exact: true });
    await expect(popular.getByRole("link")).toHaveCount(10);
    await expect(popular.getByText("Popular route", { exact: true })).toHaveCount(0);
    await expect(popular).not.toContainText(/PKR|Rs\.|\$/);
    await expect(popular.getByRole("link", { name: /Lahore.*Dubai.*Search Flights/i })).toHaveAttribute("href", /^\/flights-search\?from=LHE&to=DXB&depart=\d{4}-\d{2}-\d{2}$/);
    const tops = await page.evaluate(() => [
      document.querySelector('[aria-label="Booking confidence"]')!,
      document.getElementById("popular-routes-heading")!,
      [...document.querySelectorAll("h2")].find(element => element.textContent?.trim() === "Why book with Travelian?")!,
      [...document.querySelectorAll("h2")].find(element => element.textContent?.includes("How Travelian"))!,
    ].map(element => element.getBoundingClientRect().top + scrollY));
    expect(tops).toEqual([...tops].sort((a, b) => a - b));
    // The product tabs open each product's page; the search card stays in the same place (and, from 640px, the same
    // height: on phones the Group form is shorter, #161). Umrah is hidden (D39).
    const tabs = page.getByRole("group", { name: "Travelian products" });
    const geometry = () => page.locator(".travelian-search-card").evaluate(card => {
      const rect = card.getBoundingClientRect();
      return window.innerWidth >= 640 ? { top: rect.top + scrollY, height: rect.height } : { top: rect.top + scrollY };
    });
    await page.waitForTimeout(150);
    const baseline = await geometry();
    for (const name of ["Group Ticketing", "Hotels", "Flights", "Hotels", "Flights"]) {
      await tabs.getByRole("button", { name, exact: true }).click();
      await expect(tabs.getByRole("button", { name, exact: true })).toHaveAttribute("aria-pressed", "true");
      await expect.poll(geometry).toEqual(baseline);
    }
    // Search is never disabled: it explains what's missing at the fields (#151).
    const search = page.locator(".home-search .unified-search-submit");
    await expect(search).toBeEnabled();
    const origin = page.getByRole("combobox", { name: "Origin" });
    if (width >= 768) {
      // Desktop: From → To → departure date (#157).
      await page.keyboard.press("Tab");
      await origin.focus();
      await origin.click();
      await page.getByRole("option", { name: /LHE/ }).first().click();
      await expect(page.getByRole("combobox", { name: "Destination" })).toBeFocused();
      await page.getByRole("option", { name: /DXB/ }).first().click();
    } else {
      // Phones: the full-screen picker (#148), then To, then the date.
      await origin.click();
      await page.getByRole("dialog", { name: "Where from?" }).getByRole("combobox").fill("lhe");
      await page.getByRole("dialog", { name: "Where from?" }).getByRole("option", { name: /LHE/ }).first().click();
      await page.getByRole("dialog", { name: "Where to?" }).getByRole("combobox").fill("dxb");
      await page.getByRole("dialog", { name: "Where to?" }).getByRole("option", { name: /DXB/ }).first().click();
    }
    const calendar = page.getByRole("dialog", { name: "Select departure date" });
    await expect(calendar).toBeVisible();
    await calendar.getByRole("button", { name: /fare not checked yet|loading fare|no fares found/ }).first().click();
    await expect(calendar).toHaveCount(0);
    await expect(search).toBeEnabled();
    expect(await search.evaluate(element => getComputedStyle(element).backgroundImage)).toBe("none");
    expect(await search.evaluate(element => getComputedStyle(element).opacity)).toBe("1");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    expect(errors).toEqual([]);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(250);
    await page.screenshot({ path: `/tmp/travelian-home-top-${width}.png` });
  });
}

for (const width of [1440, 1024, 320]) {
  test(`homepage controls remain usable across flight modes and products at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mockGateway(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Round-trip", exact: true }).click();
    await page.getByRole("button", { name: "Return Date", exact: true }).click();
    await expect(page.getByRole("grid").first()).toBeVisible();
    await page.getByRole("grid").first().locator("button:not([disabled])").first().click();
    await expect(page.getByRole("grid")).toHaveCount(0);
    await page.getByRole("button", { name: "Multi-city", exact: true }).click();
    await page.getByRole("button", { name: "Add Flight", exact: true }).click();
    await expect(page.locator(".unified-search-segment-grid")).toHaveCount(3);
    const tabs = page.getByRole("group", { name: "Travelian products" });
    await tabs.getByRole("button", { name: "Hotels", exact: true }).click();
    await page.getByRole("button", { name: "Check-in", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    // Umrah is hidden while its switch is off (D39).
    await expect(tabs.getByRole("button", { name: "Umrah", exact: true })).toHaveCount(0);
    await tabs.getByRole("button", { name: "Group Ticketing", exact: true }).click();
    if (width >= 640) {
      await page.getByRole("combobox", { name: "Select available sector", exact: true }).click();
      const sectors = page.getByRole("listbox");
      const bounds = await sectors.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      await page.getByRole("option", { name: "LHE → JED", exact: true }).click();
    } else {
      // Phones show the sectors once, as chips (#161).
      await expect(page.getByRole("combobox", { name: "Select available sector", exact: true })).toBeHidden();
      await page.getByRole("button", { name: "LHE → JED", exact: true }).first().click();
    }
    await expect(page.getByRole("combobox", { name: "Origin" })).toHaveValue(/LHE/);
    await expect(page).toHaveURL(/\/group-ticketing$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  });
}
