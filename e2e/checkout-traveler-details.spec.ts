import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// #155: traveler details check names, passport and date of birth as they are typed; the title sets the gender; the
// Review step lists every traveler's full name with the "names match the passport" check (no separate dialog).
const FLIGHT = {
  type: "flight", flightId: "f1", airline: "Example Air", flightNo: "EX786", from: "LHE", to: "DXB", date: "Dec 08, 2026",
  cabin: "Economy", trip: "oneway", adults: "2", children: "1", infants: "1", price: "45000", currency: "PKR", fare: "Value",
  searchId: "s-1", fareIds: "fare-1",
};
const query = new URLSearchParams(FLIGHT).toString();

async function mockGateway(page: Page) {
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (isGateway(url)) {
      if (url.pathname.endsWith("/payment-methods")) return route.fulfill({ json: { card: false, bank_transfer: false, jazzcash: false, flights: false } });
      if (url.pathname.includes("/documents")) return route.fulfill({ json: { documents: [] } });
      return route.fulfill({ json: {} });
    }
    return isLocal(route.request().url()) ? route.continue() : route.fulfill({ json: { items: [], groups: [], results: [] } });
  });
}

async function chooseTitle(page: Page, index: number, title: string) {
  const trigger = page.locator(`#passenger-${index}-title`);
  await trigger.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("option", { name: title, exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveText(title);
}

async function fillTraveler(page: Page, index: number, t: { title?: string; first: string; last: string; dob: string; passport: string }) {
  if (t.title) await chooseTitle(page, index, t.title);
  await page.locator(`#passenger-${index}-firstName`).fill(t.first);
  await page.locator(`#passenger-${index}-lastName`).fill(t.last);
  await page.locator(`#passenger-${index}-dob`).fill(t.dob);
  await page.locator(`#passenger-${index}-docNumber`).fill(t.passport);
  const expiry = page.locator(`#passenger-${index}-expiryDate`);
  await expiry.evaluate(el => el.scrollIntoView({ block: "center" }));
  await expiry.click();
  const calendar = page.getByRole("dialog");
  await calendar.locator("select").nth(1).selectOption("2032");
  await calendar.getByRole("gridcell", { name: "15" }).first().click();
}

for (const [width, height] of [[390, 844], [768, 1024], [1440, 900]]) {
  test(`traveler details and review at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await mockGateway(page);
    await page.goto(`/booking?${query}`);

    // Names: letters only, inline; long names warned.
    const first = page.locator("#passenger-0-firstName");
    await first.fill("Ali123 @#");
    await expect(page.locator("#passenger-0-firstName-error")).toHaveText("Use letters only, as on the passport");
    await expect(first).toHaveAttribute("aria-invalid", "true");
    await expect(first).toHaveCSS("border-top-color", await page.locator("#passenger-0-firstName-error").evaluate(el => getComputedStyle(el).color));
    await first.fill("A".repeat(30));
    await page.locator("#passenger-0-lastName").fill("B".repeat(25));
    await expect(page.getByText(/Airlines may shorten long names/).first()).toBeVisible();

    // Passport typed with spaces.
    await page.locator("#passenger-0-docNumber").fill("ab 1234567");
    await expect(page.locator("#passenger-0-docNumber")).toHaveValue("AB1234567");

    // Gender follows the title, still editable.
    await expect(page.locator("#passenger-1-gender")).toHaveText("Male");
    await chooseTitle(page, 1, "Mrs");
    await expect(page.locator("#passenger-1-gender")).toHaveText("Female");

    // Date of birth: typed DD/MM/YYYY; the calendar opens about 30 years back for an adult, about 6 for a child.
    await page.locator("#passenger-0-dob").fill("14031990");
    await expect(page.locator("#passenger-0-dob")).toHaveValue("14/03/1990");
    const year = new Date().getFullYear();
    await page.locator('[data-error-key="passenger-1-dob"]').getByRole("button", { name: "Open calendar" }).click();
    await expect(page.getByRole("dialog").locator("select").nth(1)).toHaveValue(String(year - 30));
    await page.keyboard.press("Escape");
    await page.locator('[data-error-key="passenger-2-dob"]').getByRole("button", { name: "Open calendar" }).click();
    await expect(page.getByRole("dialog").locator("select").nth(1)).toHaveValue(String(year - 6));
    await page.keyboard.press("Escape");

    // 2 adults + 1 child + 1 infant, then Review shows every full name.
    await fillTraveler(page, 0, { first: "Ali", last: "Khan", dob: "01/01/1990", passport: "AB1234567" });
    await fillTraveler(page, 1, { first: "Ayesha", last: "Khan", dob: "05/05/1992", passport: "AB1234568" });
    await fillTraveler(page, 2, { first: "Omar", last: "Khan", dob: "03/03/2019", passport: "AB1234569" });
    await fillTraveler(page, 3, { title: "Miss", first: "Sara", last: "Khan", dob: "10/01/2026", passport: "AB1234560" });
    await page.locator("#contact-phone").fill("3001234567");
    await page.locator("#contact-phone").blur(); // phones: the keyboard closes and the bottom bar is back
    await page.getByRole("button", { name: /^Continue/ }).filter({ visible: true }).first().click();
    await expect(page.getByRole("heading", { name: "Review Booking" })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const names = page.getByTestId("review-travelers").getByRole("listitem");
    await expect(names).toHaveCount(4);
    for (const name of ["Mr Ali KHAN", "Mrs Ayesha KHAN", "Mstr Omar KHAN", "Miss Sara KHAN"]) await expect(page.getByTestId("review-travelers").getByText(name)).toBeVisible();
    await page.getByRole("button", { name: /^Continue/ }).filter({ visible: true }).first().click();
    await expect(page.getByText("Tick the box to confirm the names before you continue.")).toBeVisible();
    await page.getByRole("checkbox", { name: /match the passport/ }).click();
    await page.getByRole("button", { name: /^Continue/ }).filter({ visible: true }).first().click();
    await expect(page.getByRole("heading", { name: "Payment Method" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  });
}
