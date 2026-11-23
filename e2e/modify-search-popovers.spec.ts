import { expect, test, type Page } from "@playwright/test";
import { addDays, format } from "date-fns";
import { isLocal } from "./support/gateway";

// Issue #114: in Modify Search the Travelers popover (down to Infants) and the Cabin Class popover (down to First) are
// seen whole, with Done on screen: they open above the field when there is more room there, and on a very short
// screen they are capped to the room and scroll inside. Nothing reaches a real gateway.

async function openModify(page: Page, trip: "oneway" | "roundtrip") {
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    if (isLocal(url) && !url.pathname.startsWith("/__gateway")) return route.continue();
    return route.fulfill({ status: 503, json: { detail: "test" } });
  });
  const depart = format(addDays(new Date(), 20), "yyyy-MM-dd");
  await page.goto(`/flights-search?from=LHE&to=DXB&depart=${depart}&trip=${trip}${trip === "roundtrip" ? `&return=${depart}` : ""}&adults=1&children=0&infants=0&cabin=Economy`);
  await page.getByRole("button", { name: /Modify Search/ }).first().click();
  const modal = page.getByRole("dialog", { name: "Modify Search" });
  await expect(modal).toBeVisible();
  return modal;
}

const popover = (page: Page, name: string) => page.locator(`[data-radix-popper-content-wrapper] > [role=dialog][aria-label="${name}"]`);

async function expectOnScreen(page: Page, target: ReturnType<Page["locator"]>) {
  const box = await target.boundingBox();
  const height = page.viewportSize()!.height;
  expect(box, "on screen").not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(height);
}

for (const [width, height] of [[1440, 900], [1024, 768], [768, 1024], [390, 780], [360, 740]] as const) {
  for (const trip of ["oneway", "roundtrip"] as const) {
    test(`Modify Search ${trip}: Travelers and Cabin Class seen whole at ${width}x${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      const modal = await openModify(page, trip);

      await modal.getByRole("button", { name: /Traveler/ }).click();
      const travelers = popover(page, "Travelers");
      await expect(travelers).toBeVisible();
      await page.waitForTimeout(300); // open animation
      for (const row of ["Increase Adults", "Increase Children", "Increase Infants"]) await expectOnScreen(page, travelers.getByRole("button", { name: row }));
      await expectOnScreen(page, travelers.getByRole("button", { name: "Done" }));
      await travelers.getByRole("button", { name: "Increase Infants" }).click();
      await travelers.getByRole("button", { name: "Done" }).click();
      await expect(modal.getByRole("button", { name: /2 Travelers/ })).toBeVisible();

      await modal.getByRole("button", { name: "Economy", exact: true }).click();
      const cabin = popover(page, "Cabin Class");
      await expect(cabin).toBeVisible();
      await page.waitForTimeout(300);
      await expectOnScreen(page, cabin.getByRole("button", { name: "Select First cabin" }));
      await expectOnScreen(page, cabin.getByRole("button", { name: "Done" }));
      await cabin.getByRole("button", { name: "Select First cabin" }).click();
      await cabin.getByRole("button", { name: "Done" }).click();
      await expect(modal.getByRole("button", { name: "First", exact: true })).toBeVisible();
      if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/after-e2e-${trip}-${width}.png` });
    });
  }
}

test("very short screen: the Travelers list scrolls inside, Done stays on screen", async ({ page }) => {
  await page.setViewportSize({ width: 740, height: 420 });
  const modal = await openModify(page, "roundtrip");
  const field = modal.getByRole("button", { name: /Traveler/ });
  await field.scrollIntoViewIfNeeded();
  await field.click();
  const travelers = popover(page, "Travelers");
  await expect(travelers).toBeVisible();
  await page.waitForTimeout(300);
  await expectOnScreen(page, travelers.getByRole("button", { name: "Done" }));
  const infants = travelers.getByRole("button", { name: "Increase Infants" });
  await infants.scrollIntoViewIfNeeded();
  await expectOnScreen(page, infants);
});
