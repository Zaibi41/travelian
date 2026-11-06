import { expect, test } from "@playwright/test";

for (const [width, height] of [[1366, 768], [1440, 900], [1920, 1080], [1024, 768], [768, 1024], [640, 900], [375, 812], [320, 740]]) {
  test(`homepage prioritizes stable search and route discovery at ${width}px`, async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width, height });
    await page.route("**/*", route => {
      const host = new URL(route.request().url()).hostname;
      return host === "localhost" || host === "127.0.0.1" ? route.continue() : route.fulfill({ json: { items: [], groups: [], results: [] } });
    });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: width < 640 ? "Book travel with Travelian" : "Book Flights, Hotels & Umrah with Travelian", exact: true })).toBeVisible();
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
    await expect(popular.getByRole("link", { name: "Search flights from Lahore to Dubai" })).toHaveAttribute("href", /^\/flights-search\?from=LHE&to=DXB&depart=\d{4}-\d{2}-\d{2}$/);
    const tops = await page.evaluate(() => [
      document.querySelector('[aria-label="Booking confidence"]')!,
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
    for (const name of ["Group Ticketing", "Hotels", "Umrah", "Flights", "Hotels", "Flights"]) {
      await tabs.getByRole("button", { name, exact: true }).click();
      await expect.poll(geometry).toEqual(baseline);

      await expect(tabs.getByRole("button", { name, exact: true })).toHaveAttribute("aria-pressed", "true");
    }
    const search = page.locator(".home-search .unified-search-submit");
    await expect(search).toBeDisabled();
    const origin = page.getByLabel("From", { exact: true });
    await page.keyboard.press("Tab");
    await origin.focus();
    expect(await origin.evaluate(element => getComputedStyle(element).outlineStyle)).toBe("solid");
    await origin.click();
    await page.getByRole("option", { name: /LHE/ }).first().click();
    await page.getByLabel("To", { exact: true }).click();
    await page.getByRole("option", { name: /DXB/ }).first().click();
    await page.getByLabel("Departure Date", { exact: true }).click();
    await page.getByRole("grid").locator("button:not([disabled])").first().click();
    await expect(page.getByRole("grid")).toHaveCount(0);
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
      const host = new URL(route.request().url()).hostname;
      return host === "localhost" || host === "127.0.0.1" ? route.continue() : route.fulfill({ json: { items: [], groups: [], results: [] } });
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Round-trip", exact: true }).click();
    await page.getByLabel("Return Date", { exact: true }).click();
    await expect(page.getByRole("grid")).toBeVisible();
    await page.getByRole("grid").locator("button:not([disabled])").first().click();
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
    await tabs.getByRole("button", { name: "Umrah", exact: true }).click();
    await page.getByRole("combobox", { name: "Departure City", exact: true }).click();
    const cities = page.getByRole("listbox");
    await expect(cities).toBeVisible();
    const bounds = await cities.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    await page.keyboard.press("Escape");
    await tabs.getByRole("button", { name: "Group Ticketing", exact: true }).click();
    await page.getByRole("combobox", { name: "Select available sector", exact: true }).click();
    await page.getByRole("option", { name: "LHE → JED", exact: true }).click();
    await expect(page).toHaveURL(/\/group-ticketing$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  });
}
