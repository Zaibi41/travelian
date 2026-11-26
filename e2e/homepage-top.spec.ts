import { expect, test } from "@playwright/test";
import { isLocal } from "./support/gateway";

for (const [width, height] of [[1366, 768], [1440, 900], [1920, 1080], [1024, 768], [768, 1024], [640, 900], [375, 812], [320, 740]]) {
  test(`homepage prioritizes stable search and route discovery at ${width}px`, async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width, height });
    await page.route("**/*", route => {
            return isLocal(route.request().url()) ? route.continue() : route.fulfill({ json: { items: [], groups: [], results: [] } });
    });
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
    // No separate trust strip on the homepage; "Why book with Travelian?" carries those messages.
    await expect(page.getByRole("region", { name: "Booking confidence" })).toHaveCount(0);
    const popular = page.getByRole("region", { name: "Popular routes", exact: true });
    await expect(popular.getByRole("link")).toHaveCount(10);
    await expect(popular.getByText("Popular route", { exact: true })).toHaveCount(0);
    await expect(popular).not.toContainText(/PKR|Rs\.|\$/);
    await expect(popular.getByRole("link", { name: /Lahore.*Dubai.*Search Flights/i })).toHaveAttribute("href", /^\/flights-search\?from=LHE&to=DXB&depart=\d{4}-\d{2}-\d{2}$/);
    const tops = await page.evaluate(() => [
      document.getElementById("popular-routes-heading")!,
      [...document.querySelectorAll("h2")].find(element => element.textContent?.trim() === "Why book with Travelian?")!,
      [...document.querySelectorAll("h2")].find(element => element.textContent?.includes("How Travelian"))!,
    ].map(element => element.getBoundingClientRect().top + scrollY));
    expect(tops).toEqual([...tops].sort((a, b) => a - b));
    const tabs = page.getByRole("group", { name: "Travelian products" });
    const geometry = () => page.locator(".travelian-search-card").evaluate(card => {
      const rect = card.getBoundingClientRect();
      return { top: rect.top + scrollY, height: rect.height };
    });
    await page.waitForTimeout(150);
    const baseline = await geometry();
    // D39: Umrah is hidden while the gateway switch is off.
    // Each product has its own form, so the card's height may differ; it never moves, and Flights comes back exactly.
    for (const name of ["Group Ticketing", "Hotels", "Flights", "Hotels", "Flights"]) {
      await tabs.getByRole("button", { name, exact: true }).click();
      await expect.poll(async () => (await geometry()).top).toBe(baseline.top);
      if (name === "Flights") await expect.poll(geometry).toEqual(baseline);

      await expect(tabs.getByRole("button", { name, exact: true })).toHaveAttribute("aria-pressed", "true");
    }
    // Search stays enabled; with fields missing it says what to fill in (it isn't greyed out).
    const search = page.locator(".home-search .unified-search-submit");
    const origin = page.getByLabel("Origin", { exact: true });
    await page.keyboard.press("Tab");
    await origin.focus();
    // Keyboard focus shows as a brand-blue ring on the field box around the input.
    expect(await origin.evaluate(element => getComputedStyle(element.parentElement!).boxShadow)).toContain("rgb(7, 60, 146)");
    await origin.click();
    await page.getByRole("option", { name: /LHE/ }).first().click();
    // The form moves on by itself: choosing From opens To, and choosing To opens the departure calendar.
    await expect(page.getByLabel("Destination", { exact: true })).toHaveAttribute("aria-expanded", "true");
    await page.getByRole("option", { name: /DXB/ }).first().click();
    await expect(page.getByLabel("Departure Date", { exact: true })).toHaveAttribute("aria-expanded", "true");
    // The fare calendar: each open day is a button named by its date ("Thursday 26 November: …").
    const calendar = page.getByRole("dialog", { name: "Select departure date" });
    await calendar.locator("button:not([disabled])").filter({ hasText: /^\d{1,2}/ }).first().click();
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
    await page.route("**/*", route => {
            return isLocal(route.request().url()) ? route.continue() : route.fulfill({ json: { items: [], groups: [], results: [] } });
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Round-trip", exact: true }).click();
    await page.getByLabel("Return Date", { exact: true }).click();
    // The calendar shows two months side by side on wider screens.
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
    await tabs.getByRole("button", { name: "Group Ticketing", exact: true }).click();
    // Group Ticketing: Origin and Destination everywhere; the "available sector" shortcut is on wider screens only.
    await expect(page.getByLabel("Origin", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Destination", { exact: true })).toBeVisible();
    if (width >= 1024) {
      await page.getByRole("combobox", { name: "Select available sector", exact: true }).click();
      await page.getByRole("option", { name: "LHE → JED", exact: true }).click();
      await expect(page).toHaveURL(/\/group-ticketing$/);
    } else {
      await expect(page.getByRole("combobox", { name: "Select available sector", exact: true })).toHaveCount(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  });
}
