import { expect, test } from "@playwright/test";

for (const [width, height] of [[1366, 768], [1440, 900], [1920, 1080], [1024, 768], [768, 1024], [640, 900], [375, 812], [320, 740]]) {
  test(`product switching preserves hero geometry at ${width}px`, async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width, height });
    await page.route("**/*", route => {
      const host = new URL(route.request().url()).hostname;
      if (host === "localhost" || host === "127.0.0.1") return route.continue();
      return route.fulfill({ json: { items: [], groups: [], results: [] } });
    });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("/");
    const tabs = page.getByRole("group", { name: "Travelian products" });
    const measure = () => tabs.evaluate(element => {
      const card = element.parentElement!;
      const hero = card.closest("section")!;
      const rect = (node: Element) => {
        const box = node.getBoundingClientRect();
        return { top: box.top + window.scrollY, height: box.height };
      };
      const action = [...card.querySelectorAll("button")].find(button => /^(Search|Search Flights)$/.test(button.textContent?.trim() || button.getAttribute("aria-label")?.replace("flights", "Flights") || ""))!;
      return {
        card: rect(card), hero: rect(hero), tabs: rect(element),
        heading: rect(hero.querySelector("h1")!),
        trust: rect(hero.querySelector(".mt-4")!),
        next: rect(hero.nextElementSibling!), action: rect(action),
        overflow: document.documentElement.scrollWidth > window.innerWidth,
        controlsClearAction: window.innerWidth >= 1024 || [...card.querySelectorAll(".unified-search-content button, .unified-search-content input")]
          .filter(control => control !== action && control.getBoundingClientRect().width > 0 && control.getBoundingClientRect().height > 0)
          .every(control => control.getBoundingClientRect().bottom <= action.getBoundingClientRect().top),
      };
    });
    const baseline = await measure();
    expect(baseline.overflow).toBe(false);
    expect(baseline.controlsClearAction).toBe(true);
    for (const name of ["Group Ticketing", "Hotels", "Umrah", "Flights", "Umrah", "Hotels", "Flights"]) {
      await tabs.getByRole("button", { name, exact: true }).click();
      await expect.poll(measure).toEqual(baseline);
    }
    await tabs.getByRole("button", { name: "Hotels", exact: true }).click();
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    expect(await measure()).toEqual(baseline);
    await page.getByRole("button", { name: "Check-in", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await tabs.getByRole("button", { name: "Umrah", exact: true }).click();
    await page.getByRole("combobox", { name: "Departure City", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("listbox")).toBeVisible();
    await page.keyboard.press("Escape");
    await tabs.getByRole("button", { name: "Flights", exact: true }).click();
    await page.locator(".unified-search-content").getByRole("combobox").first().click();
    const airports = page.getByRole("listbox");
    await expect(airports).toBeVisible();
    const airportBounds = await page.getByRole("dialog").filter({ has: airports }).boundingBox();
    expect(airportBounds!.width).toBeGreaterThanOrEqual(Math.min(288, width - 32));
    expect(airportBounds!.x).toBeGreaterThanOrEqual(0);
    expect(airportBounds!.x + airportBounds!.width).toBeLessThanOrEqual(width);
    await page.getByRole("option").first().click();
    await expect(airports).toHaveCount(0);
    await page.getByRole("button", { name: "Round-trip", exact: true }).click();
    expect(await measure()).toEqual(baseline);
    await page.getByRole("button", { name: "Multi-city", exact: true }).click();
    await page.getByRole("button", { name: "Add Flight", exact: true }).click();
    // Additional legs can grow the form; switching products must retain that space.
    await page.waitForTimeout(100);
    const expanded = await measure();
    await tabs.getByRole("button", { name: "Hotels", exact: true }).click();
    expect(await measure()).toEqual(expanded);
    expect(errors).toEqual([]);
  });
}
