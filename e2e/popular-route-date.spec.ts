import { expect, test } from "@playwright/test";
import { format } from "date-fns";
import { parseDateOnly } from "../src/lib/date-only";
import { isLocal } from "./support/gateway";

for (const [today, tomorrow] of [["2026-10-29", "2026-10-30"], ["2026-10-31", "2026-11-01"], ["2026-12-31", "2027-01-01"]]) {
  test(`Popular Routes searches ${tomorrow} when local today is ${today}`, async ({ browser }) => {
    const context = await browser.newContext({ timezoneId: "Asia/Karachi" });
    const page = await context.newPage();
    await page.clock.setFixedTime(new Date(`${today}T23:30:00+05:00`));
    await page.route("**/*", route => isLocal(route.request().url())
      ? route.continue() : route.fulfill({ json: { items: [], groups: [], results: [] } }));
    await page.goto("/");
    const routes = page.getByRole("region", { name: "Popular routes", exact: true });
    await expect(routes.getByRole("link")).toHaveCount(10);
    const departures = await routes.getByRole("link").evaluateAll(links => links.map(link => new URL((link as HTMLAnchorElement).href).searchParams.get("depart")));
    expect(departures).toEqual(Array(10).fill(tomorrow));
    await routes.getByRole("link", { name: "Search flights from Lahore to Dubai", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/flights-search\\?from=LHE&to=DXB&depart=${tomorrow}$`));
    await expect(page.locator(".travelian-search-card").getByText(format(parseDateOnly(tomorrow)!, "EEE, MMM d"), { exact: true })).toBeVisible();
    await context.close();
  });
}
