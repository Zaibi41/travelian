import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// #37, #83, #84, #119, #120, #122: where the passenger stays (city and country) and for how long, on the result card
// and in Flight details > Flight Info; "Non-stop" under the duration of a direct flight. Intercepted gateway responses
// only (nothing reaches a real gateway or supplier). STAYS_SHOTS_DIR saves screenshots; STAYS_SHOTS=before only takes
// them (for the page before this change), with no checks.

if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
const BEFORE = process.env.STAYS_SHOTS === "before";
const SHOTS = process.env.STAYS_SHOTS_DIR;

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const fare = (id: string, name: string, price: number, baggage?: [string, string]) =>
  ({ id, name, ...(baggage ? { baggage: baggage[0], baggage_detail: baggage[1] } : {}), selling_price: rs(price) });
const B20: [string, string] = ["7+20 kg", "7 kg hand carry + 20 kg checked"];
const B30: [string, string] = ["7+30 kg", "7 kg hand carry + 30 kg checked"];
const seg = (flight_number: string, origin: string, destination: string, departure_local: string, arrival_local: string, duration_minutes: number, layover_minutes?: number) =>
  ({ flight_number, origin, destination, departure_local, arrival_local, duration_minutes, ...(layover_minutes ? { layover_minutes } : {}) });

const NON_STOP = { id: "f-pk", airline_code: "PK", airline_name: "PIA", flight_number: "PK757",
  departure_local: "2026-12-10T02:00", arrival_local: "2026-12-10T06:30", duration_minutes: 570, stops: 0, stop_cities: [],
  segments: [seg("PK757", "LHE", "LHR", "2026-12-10T02:00", "2026-12-10T06:30", 570)],
  fares: [fare("pk1", "Economy Value", 180_000, B20), fare("pk2", "Economy Flex", 205_000, B30)] };
const ONE_STOP = { id: "f-ey", airline_code: "EY", airline_name: "Etihad Airways", flight_number: "EY254 / EY11",
  departure_local: "2026-12-10T03:00", arrival_local: "2026-12-10T12:30", duration_minutes: 870, stops: 1, stop_cities: ["AUH"],
  segments: [seg("EY254", "LHE", "AUH", "2026-12-10T03:00", "2026-12-10T05:30", 210), seg("EY11", "AUH", "LHR", "2026-12-10T08:15", "2026-12-10T12:30", 495, 165)],
  fares: [fare("ey1", "Economy Saver", 150_000, B20)] };
const TWO_STOPS = { id: "f-qr", airline_code: "QR", airline_name: "Qatar Airways International Regional Connection Partner Airline Limited",
  flight_number: "QR629 / QR1355 / QR1356", departure_local: "2026-12-10T04:10", arrival_local: "2026-12-11T09:45", duration_minutes: 2075, stops: 2, stop_cities: ["DOH", "FIH"],
  segments: [seg("QR629", "LHE", "DOH", "2026-12-10T04:10", "2026-12-10T06:00", 230), seg("QR1355", "DOH", "FIH", "2026-12-10T08:30", "2026-12-10T14:00", 450, 150),
             seg("QR1356", "FIH", "LHR", "2026-12-10T23:40", "2026-12-11T09:45", 665, 580)],
  fares: [fare("qr1", "Economy Classic", 140_000, B30)] };
// A supplier that sends only the stop city (no flight-by-flight detail), and no baggage.
const STOP_CITY_ONLY = { id: "f-z8", airline_code: "Z8", airline_name: "South Air", flight_number: "Z8501",
  departure_local: "2026-12-10T10:00", arrival_local: "2026-12-10T16:00", duration_minutes: 360, stops: 1, stop_cities: ["MUX"],
  fares: [fare("z81", "EV", 160_000)] };

const ONE_WAY = {
  search_id: "s-stays", expires_at: new Date(Date.now() + 15 * 60_000).toISOString(), status: "complete",
  journeys: [{ direction: "outbound", origin: "LHE", destination: "LHR", flights: [NON_STOP, ONE_STOP, TWO_STOPS, STOP_CITY_ONLY] }],
};
const ROUND_TRIP = {
  ...ONE_WAY,
  journeys: [
    { direction: "outbound", origin: "LHE", destination: "LHR", flights: [ONE_STOP, NON_STOP] },
    { direction: "return", origin: "LHR", destination: "LHE", flights: [
      { id: "r-ey", airline_code: "EY", airline_name: "Etihad Airways", flight_number: "EY12 / EY255", departure_local: "2026-12-20T09:00",
        arrival_local: "2026-12-21T01:30", duration_minutes: 690, stops: 1, stop_cities: ["AUH"],
        segments: [seg("EY12", "LHR", "AUH", "2026-12-20T09:00", "2026-12-20T19:00", 360), seg("EY255", "AUH", "LHE", "2026-12-20T21:00", "2026-12-21T01:30", 210, 120)],
        fares: [fare("ey2", "Economy Saver", 140_000, B20)] },
      { id: "r-pk", airline_code: "PK", airline_name: "PIA", flight_number: "PK758", departure_local: "2026-12-20T09:30", arrival_local: "2026-12-20T22:00",
        duration_minutes: 450, stops: 0, stop_cities: [], segments: [seg("PK758", "LHR", "LHE", "2026-12-20T09:30", "2026-12-20T22:00", 450)],
        fares: [fare("pk3", "Economy Value", 170_000, B20)] },
    ] },
  ],
};

async function mock(page: Page, answer: object) {
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (isGateway(url)) {
      if (url.pathname === "/v1/public/flights/search") return route.fulfill({ json: answer });
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return isLocal(url) ? route.continue() : route.fulfill({ json: {} });
  });
}

const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${BEFORE ? "before" : "after"}-${name}.png`, fullPage: false });
};
const noSideScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const card = (page: Page, airline: string) => page.locator("main .shadow-card").filter({ has: page.getByRole("button", { name: airline, exact: true }) }).first();

async function open(page: Page, width: number, query: string, answer: object) {
  await page.setViewportSize({ width, height: width < 600 ? 860 : 900 });
  await mock(page, answer);
  await page.goto(`/flights-search?${query}`);
  await expect(page.getByRole("button", { name: "Flight Details" }).first()).toBeVisible({ timeout: 20_000 });
}
async function details(page: Page, airline: string) {
  await card(page, airline).getByRole("button", { name: "Flight Details" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

for (const width of [1440, 390]) {
  test(`one-way: stops on the card and stays in Flight Info at ${width}px`, async ({ page }) => {
    await open(page, width, "from=LHE&to=LHR&depart=2026-12-10&trip=oneway&adults=1", ONE_WAY);
    await card(page, "PIA").scrollIntoViewIfNeeded();
    await shot(page, `card-nonstop-onestop-${width}`);
    await card(page, "Qatar Airways International Regional Connection Partner Airline Limited").scrollIntoViewIfNeeded();
    await shot(page, `card-twostops-${width}`);

    if (!BEFORE) {
      expect(await noSideScroll(page)).toBe(0);
      // #120: a direct flight says Non-stop under its duration.
      await expect(card(page, "PIA").getByText("Non-stop", { exact: true }).locator("visible=true")).toHaveCount(1);
      // #119: "1 Stop" / "2 Stops" under the duration; each stay in full under the times (how long, city, airport,
      // country), wrapping rather than cut off.
      const ey = card(page, "Etihad Airways");
      await expect(ey.getByText("1 Stop", { exact: true }).locator("visible=true")).toHaveCount(1);
      await expect(ey.getByTestId("card-stay")).toHaveCount(1);
      await expect(ey.getByTestId("card-stay")).toHaveText("2h 45m layover · Abu Dhabi (AUH), United Arab Emirates");
      const qr = card(page, "Qatar Airways International Regional Connection Partner Airline Limited");
      await expect(qr.getByText("2 Stops", { exact: true }).locator("visible=true")).toHaveCount(1);
      await expect(qr.getByTestId("card-stay")).toHaveText(["2h 30m layover · Doha (DOH), Qatar", "9h 40m layover · Kinshasa (FIH), Congo, The Democratic Republic of the"]);
      await qr.getByTestId("card-stay").last().scrollIntoViewIfNeeded();
      const [stayBox, cardBox] = [await qr.getByTestId("card-stay").last().boundingBox(), await qr.boundingBox()];
      expect(stayBox!.x + stayBox!.width).toBeLessThanOrEqual(cardBox!.x + cardBox!.width + 1);
      const z8 = card(page, "South Air");
      await expect(z8.getByTestId("card-stay")).toHaveText("Layover · Multan (MUX), Pakistan"); // no duration is guessed
      await expect(card(page, "PIA").getByTestId("card-stay")).toHaveCount(0);
      await expect(page.locator("main")).not.toContainText(/undefined|null/);
    }

    // A 1-stop flight's details.
    const dialog = await details(page, "Etihad Airways");
    await shot(page, `details-default-${width}`);
    await shot(page, `details-flightinfo-onestop-${width}`);
    if (!BEFORE) {
      const stay = dialog.getByRole("region", { name: "Stop at Abu Dhabi, United Arab Emirates" });
      await expect(stay).toBeVisible();
      // #163: "2h 45m layover • Abu Dhabi (AUH), United Arab Emirates" (#84: with the country).
      await expect(stay.getByText("2h 45m layover", { exact: true })).toBeVisible();
      await expect(stay.getByText("Abu Dhabi (AUH)", { exact: true })).toBeVisible();
      await expect(stay).toContainText("United Arab Emirates");
      await expect(stay).not.toContainText(/EY254|EY11|Etihad/); // #122: no flight name or number in the stay
      // #163: each flight shows its airline and "Economy • flight number"; its flying time on the left.
      await expect(dialog.getByText("Economy • EY254", { exact: true })).toBeVisible();
      await expect(dialog.getByText("Economy • EY11", { exact: true })).toBeVisible();
      await expect(dialog.getByText("3h 30m", { exact: true })).toBeVisible();
      await expect(dialog.getByText("Thu, Dec 10, 2026", { exact: true })).toBeVisible();
      await expect(dialog.getByText("14h 30m · 1 stop", { exact: true })).toBeVisible();
      await expect(dialog.getByText(/· Duration/)).toHaveCount(0); // was "Etihad Airways · EY254 · Duration 3h 30m"
    }
    // Flight Info only on the public site (no Fare Rules or Baggage tab).
    if (!BEFORE) for (const tab of ["Flight Info", "Fare Rules", "Baggage"]) await expect(dialog.getByRole("button", { name: tab, exact: true })).toHaveCount(0);
    await page.keyboard.press("Escape");

    // 2 stops: both stays with country, city and duration; long names stay on one line inside the dialog.
    const qrDialog = await details(page, "Qatar Airways International Regional Connection Partner Airline Limited");
    await shot(page, `details-flightinfo-twostops-${width}`);
    if (!BEFORE) {
      await expect(qrDialog.getByRole("region", { name: /^Stop at / })).toHaveCount(2);
      const doha = qrDialog.getByRole("region", { name: "Stop at Doha, Qatar" });
      await expect(doha.getByText("2h 30m layover", { exact: true })).toBeVisible();
      const kinshasa = qrDialog.getByRole("region", { name: "Stop at Kinshasa, Congo, The Democratic Republic of the" });
      await expect(kinshasa.getByText("9h 40m layover", { exact: true })).toBeVisible();
      const box = await kinshasa.boundingBox();
      const dialogBox = await qrDialog.boundingBox();
      expect(box!.x + box!.width).toBeLessThanOrEqual(dialogBox!.x + dialogBox!.width + 1);
    }
    await page.keyboard.press("Escape");

    // Non-stop: no stay at all. Stop city only (no flight-by-flight detail): the stay, without a guessed duration.
    const pkDialog = await details(page, "PIA");
    await shot(page, `details-flightinfo-nonstop-${width}`);
    if (!BEFORE) await expect(pkDialog.getByRole("region", { name: /^Stop at / })).toHaveCount(0);
    await page.keyboard.press("Escape");
    const z8Dialog = await details(page, "South Air");
    await shot(page, `details-flightinfo-stopcity-${width}`);
    if (!BEFORE) {
      const multan = z8Dialog.getByRole("region", { name: "Stop at Multan, Pakistan" });
      await expect(multan).toContainText("Multan (MUX), Pakistan");
      await expect(multan.getByText("Layover", { exact: true })).toBeVisible(); // no duration is guessed
    }
  });

  test(`round trip: each journey's stops, and no stay between outbound and return at ${width}px`, async ({ page }) => {
    await open(page, width, "from=LHE&to=LHR&depart=2026-12-10&return=2026-12-20&trip=roundtrip&adults=1", ROUND_TRIP);
    await card(page, "Etihad Airways").scrollIntoViewIfNeeded();
    await shot(page, `roundtrip-card-${width}`);
    if (!BEFORE) {
      expect(await noSideScroll(page)).toBe(0);
      const ey = card(page, "Etihad Airways");
      await expect(ey.getByText(/1 Stop/).locator("visible=true")).toHaveCount(2); // outbound and return
      await expect(ey.getByTestId("card-stay")).toHaveText(["Outbound · 2h 45m layover · Abu Dhabi (AUH), United Arab Emirates", "Return · 2h 0m layover · Abu Dhabi (AUH), United Arab Emirates"]);
      await expect(card(page, "PIA").getByText(/^Non-stop$/).locator("visible=true")).toHaveCount(2);
      // Each journey's time from the flights' own flying times and stays (not local clock differences across time zones).
      for (const time of ["14h 30m", "11h 30m"]) await expect(ey.getByText(time, { exact: true }).locator("visible=true")).toHaveCount(1);
      for (const time of ["9h 30m", "7h 30m"]) await expect(card(page, "PIA").getByText(time, { exact: true }).locator("visible=true")).toHaveCount(1);
    }
    const dialog = await details(page, "Etihad Airways");
    await shot(page, `roundtrip-flightinfo-${width}`);
    if (!BEFORE) {
      // Two stays in Abu Dhabi (2h 45m out, 2h 0m back); none at London between the outbound and the return.
      await expect(dialog.getByRole("region", { name: /^Stop at / })).toHaveCount(2);
      await expect(dialog.getByText("2h 45m layover", { exact: true })).toBeVisible();
      await expect(dialog.getByText("2h 0m layover", { exact: true })).toBeVisible();
      // #163: one block per journey, Outbound and Return.
      await expect(dialog.getByRole("region", { name: "Outbound" })).toBeVisible();
      await expect(dialog.getByRole("region", { name: "Return" })).toBeVisible();
      await expect(dialog.getByRole("region", { name: /Stop at London/ })).toHaveCount(0);
    }
  });
}

test("multi-city: the page explains it is not online yet and nothing breaks", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 860 });
  await mock(page, ONE_WAY);
  await page.goto("/flights-search?trip=multicity&segments=" + encodeURIComponent(JSON.stringify([
    { from: "LHE", to: "DXB", date: "2026-12-10" }, { from: "DXB", to: "LHR", date: "2026-12-14" }])) + "&adults=1");
  await shot(page, "multicity-390");
  if (BEFORE) return;
  await expect(page.getByText(/Multi-city search isn't available online yet/).first()).toBeVisible({ timeout: 20_000 });
  expect(await noSideScroll(page)).toBe(0);
});
