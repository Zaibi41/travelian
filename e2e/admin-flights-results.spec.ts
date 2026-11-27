import { expect, test, type Page } from "@playwright/test";
import { gatewayView, isGateway, isLocal } from "./support/gateway";

// Admin Search > Flights results: the fare rows, the flight line and Flight details, on intercepted gateway
// responses shaped like the gateway's output (nothing reaches a real gateway or supplier).
// Non-stop, 1 stop (with each flight and the stay), 2 stops with a long airline name, a stop known only by its
// airport, missing baggage and meal, several fares, restricted airlines (request to book), one-way and round trip.
// SHOTS_DIR=<folder>: also saves full-page screenshots at 390 and 1440px.

if (process.env.PLAYWRIGHT_CHANNEL) test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const fare = (id: string, name: string, price: number, extra: Record<string, unknown> = {}) =>
  ({ id, name, selling_price: rs(price), supplier: "sooperfare", supplier_cost: rs(price - 900), booking_mode: "hold", ...extra });

const OUTBOUND = {
  direction: "outbound", origin: "LHE", destination: "DXB",
  flights: [
    { id: "f1", airline_code: "PA", airline_name: "Airblue", flight_number: "PA410",
      departure_local: "2026-12-05T03:00", arrival_local: "2026-12-05T05:30", duration_minutes: 210, stops: 0, stop_cities: [],
      segments: [{ flight_number: "PA410", origin: "LHE", destination: "DXB", departure_local: "2026-12-05T03:00", arrival_local: "2026-12-05T05:30", duration_minutes: 210 }],
      fares: [
        fare("a", "Value", 85_000, { baggage: "7+20 kg", baggage_detail: "7 kg hand carry + 20 kg checked", meal: "Meal included" }),
        fare("b", "Flex", 95_000),
        fare("c", "Extra", 105_000, { baggage: "7+40 kg" }),
      ] },
    { id: "f2", airline_code: "QR", airline_name: "Qatar Airways", flight_number: "QR629",
      departure_local: "2026-12-05T04:10", arrival_local: "2026-12-05T11:00", duration_minutes: 470, stops: 1, stop_cities: ["DOH"],
      segments: [
        { flight_number: "QR629", origin: "LHE", destination: "DOH", departure_local: "2026-12-05T04:10", arrival_local: "2026-12-05T06:00", duration_minutes: 230 },
        { flight_number: "QR1018", origin: "DOH", destination: "DXB", departure_local: "2026-12-05T08:45", arrival_local: "2026-12-05T11:00", duration_minutes: 75, layover_minutes: 165 },
      ],
      fares: [fare("q", "Economy Classic", 132_400, { baggage: "7+30 kg", meal: "Meal included", booking_mode: "request" })] },
    { id: "f3", airline_code: "Z8", airline_name: "South Air International Regional Airways Limited", flight_number: "Z8266",
      departure_local: "2026-12-05T06:00", arrival_local: "2026-12-05T16:40", duration_minutes: 700, stops: 2, stop_cities: ["ISB", "KHI"],
      segments: [
        { flight_number: "Z8266", origin: "LHE", destination: "ISB", departure_local: "2026-12-05T06:00", arrival_local: "2026-12-05T07:00", duration_minutes: 60 },
        { flight_number: "Z8150", origin: "ISB", destination: "KHI", departure_local: "2026-12-05T08:00", arrival_local: "2026-12-05T10:00", duration_minutes: 120, layover_minutes: 60 },
        { flight_number: "Z8501", origin: "KHI", destination: "DXB", departure_local: "2026-12-05T14:00", arrival_local: "2026-12-05T16:40", duration_minutes: 220, layover_minutes: 240 },
      ],
      fares: [fare("z", "EB", 71_000, { baggage: "Subject to supplier rules" })] },
    { id: "f4", airline_code: "EY", airline_name: "Etihad Airways", flight_number: "EY242",
      departure_local: "2026-12-05T09:30", arrival_local: "2026-12-05T15:15", duration_minutes: 405, stops: 1, stop_cities: ["AUH"],
      fares: [fare("e", "Economy Saver", 128_000, { baggage: "7+25 kg", booking_mode: "request" })] },
  ],
};
const RETURN = {
  direction: "return", origin: "DXB", destination: "LHE",
  flights: [
    { id: "r1", airline_code: "EK", airline_name: "Emirates", flight_number: "EK624",
      departure_local: "2026-12-12T22:00", arrival_local: "2026-12-13T02:30", duration_minutes: 210, stops: 0, stop_cities: [],
      fares: [fare("r", "Saver", 90_000, { baggage: "7+25 kg", meal: "Meal included" })] },
  ],
};
const search = (round: boolean) => ({
  search_id: "s-results", expires_at: new Date(Date.now() + 15 * 60_000).toISOString(), status: "complete",
  providers: [{ name: "sooperfare", status: "responded" }],
  journeys: round ? [OUTBOUND, RETURN] : [OUTBOUND],
});
const QUOTE = {
  quote_id: "q-results", expires_at: new Date(Date.now() + 10 * 60_000).toISOString(), selling_total: rs(85_000), new_total: rs(85_000),
  old_total: rs(85_000), new_price_per_adult: rs(85_000), passengers: [{ type: "ADT", count: 1, selling_each: rs(85_000) }],
  price_changed: false, booking_enabled: true, booking_mode: "hold", supplier_total: rs(84_100), documents: [],
};

const ONE_WAY = "from=LHE&to=DXB&date=2026-12-05";
const ROUND_TRIP = "trip=roundtrip&from=LHE&to=DXB&date=2026-12-05&return=2026-12-12";

async function openFlights(page: Page, width: number, query = ONE_WAY) {
  await page.setViewportSize({ width, height: 900 });
  await page.route("**/*", route => {
    const url = gatewayView(route.request().url());
    if (isGateway(url)) {
      if (url.pathname === "/v1/live-ticketing/flights/search") return route.fulfill({ json: search(query.includes("roundtrip")) });
      if (url.pathname === "/v1/live-ticketing/flights/reprice") return route.fulfill({ json: QUOTE });
      return route.fulfill({ status: 404, json: { detail: "Not found." } });
    }
    return isLocal(url) ? route.continue() : route.fulfill({ json: {} });
  });
  await page.addInitScript(() => {
    localStorage.setItem("travelian.session.v1", JSON.stringify({
      email: "layout-test@travelian.com", groups: ["super_admin"], name: "Layout Test", createdAt: new Date().toISOString(),
      accessToken: "local-test-only", idToken: "local-test-only", expiresAt: Date.now() + 3_600_000,
    }));
  });
  await page.goto(`/admin/bookings/new?tab=flights&${query}`);
  await expect(page.getByRole("region", { name: "Results" })).toBeVisible();
}

const card = (page: Page, flightNumber: string) => page.getByRole("article", { name: new RegExp(`${flightNumber}$`) });
const noPageScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test("screenshots at 390 and 1440px (SHOTS_DIR only)", async ({ page }) => {
  const dir = process.env.SHOTS_DIR;
  test.skip(!dir, "only when SHOTS_DIR is set");
  for (const width of [1440, 390]) {
    for (const [name, query] of [["oneway", ONE_WAY], ["roundtrip", ROUND_TRIP]] as const) {
      await openFlights(page, width, query);
      await expect(card(page, "PA410")).toBeVisible();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${dir}/results-${name}-${width}.png`, fullPage: true });
    }
    await openFlights(page, width);
    for (const flight of ["QR629", "Z8266", "EY242"]) {
      await card(page, flight).getByRole("button", { name: "Flight details" }).click();
      const dialog = page.getByRole("dialog", { name: "Flight details" });
      await expect(dialog).toBeVisible();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${dir}/details-${flight}-${width}.png` });
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
    }
  }
});

for (const width of [1440, 1024, 768, 390]) {
  test(`fare rows: no Hold left, price without "per adult", no Revalidate, no page scroll at ${width}px (#78, #80, #81)`, async ({ page }) => {
    for (const query of [ONE_WAY, ROUND_TRIP]) {
      await openFlights(page, width, query);
      const results = page.getByRole("region", { name: "Results" });
      await expect(card(page, "PA410").getByText("Rs 85,000", { exact: true })).toBeVisible();
      await expect(results).not.toContainText(/per adult/i);
      await expect(results.getByRole("button", { name: /^Revalidate/ })).toHaveCount(0);
      await expect(results).not.toContainText("Revalidate");
      // #78: no Hold left column; Provider stays for admins (the gateway sends provider names to them only).
      await expect(results).not.toContainText("Hold left");
      await expect(card(page, "PA410").getByRole("columnheader")).toHaveText(["Fare", "Meal", "Baggage", "Refund", "Provider", "Price", "Actions"]);
      expect(await noPageScroll(page)).toBe(0);
    }
  });
}

for (const width of [1440, 390]) {
  test(`airline logos on the results, in Flight details and on the booking page at ${width}px (#88)`, async ({ page }) => {
    await openFlights(page, width);
    for (const [flight, airline] of [["PA410", "Airblue"], ["QR629", "Qatar Airways"], ["EY242", "Etihad Airways"]]) {
      await expect(card(page, flight).getByRole("img", { name: `${airline} logo` })).toBeVisible();
    }
    // A long airline name keeps its logo and truncates.
    await expect(card(page, "Z8266").getByRole("img", { name: "South Air International Regional Airways Limited logo" })).toBeVisible();
    await card(page, "PA410").getByRole("button", { name: "Flight details" }).click();
    const dialog = page.getByRole("dialog", { name: "Flight details" });
    await expect(dialog.getByRole("img", { name: "Airblue logo" })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Book PA410 Value" }).click();
    await expect(page.getByRole("heading", { name: "Book flight", level: 1 })).toBeVisible();
    const panel = page.getByRole("complementary", { name: "Selected fare" });
    await expect(panel.getByRole("img", { name: "Airblue logo" })).toBeVisible();
    expect(await noPageScroll(page)).toBe(0);
    if (process.env.SHOTS_DIR) await page.screenshot({ path: `${process.env.SHOTS_DIR}/booking-page-${width}.png`, fullPage: true });
  });
}

for (const width of [1440, 1024, 768, 390]) {
  test(`actions: Book and Share on WhatsApp, no Hold; restricted airlines stay Request to book at ${width}px (#112)`, async ({ page }) => {
    await openFlights(page, width, ROUND_TRIP);
    const results = page.getByRole("region", { name: "Results" });
    await expect(results.getByRole("button", { name: /^Hold / })).toHaveCount(0);
    await expect(results.getByRole("button", { name: /^Revalidate/ })).toHaveCount(0);
    for (const [flight, fareName, action] of [["PA410", "Value", "Book"], ["Z8266", "EB", "Book"], ["EK624", "Saver", "Book"],
      ["QR629", "Economy Classic", "Request to book"], ["EY242", "Economy Saver", "Request to book"]]) {
      await expect(card(page, flight).getByRole("button", { name: `${action} ${flight} ${fareName}` })).toBeVisible();
      const share = card(page, flight).getByRole("link", { name: `Share ${flight} ${fareName} on WhatsApp` });
      await expect(share).toHaveAttribute("target", "_blank");
      const href = (await share.getAttribute("href"))!;
      expect(href.startsWith("https://wa.me/?text=")).toBe(true);
      const text = decodeURIComponent(href.slice("https://wa.me/?text=".length));
      expect(text).toContain(`${flight}\n`);
      expect(text).toMatch(/\nPrice: Rs [\d,]+$/);
      expect(text).not.toMatch(/sooperfare|supplier|margin|null|undefined/i);
    }
    const qatar = decodeURIComponent((await card(page, "QR629").getByRole("link", { name: /^Share/ }).getAttribute("href"))!.split("text=")[1]);
    expect(qatar).toContain("Outbound flight\nQatar Airways QR629\nLahore (LHE) to Dubai (DXB)");
    expect(qatar).toContain("Price: Rs 132,400");
    // The share link opens WhatsApp in a new tab; nothing is sent by the page itself.
    await page.context().route("https://wa.me/**", route => route.fulfill({ body: "WhatsApp" }));
    const [popup] = await Promise.all([page.waitForEvent("popup"), card(page, "PA410").getByRole("link", { name: /^Share PA410 Value/ }).click()]);
    await popup.waitForURL(/wa\.me\/\?text=/);
    await popup.close();
    // Round trip: Book on each direction opens the booking page (the hold flow behind it is unchanged).
    await card(page, "PA410").getByRole("button", { name: "Book PA410 Value" }).click();
    await expect(page.getByRole("region", { name: "Selected fare" })).toContainText("Return: choose a fare");
    await card(page, "EK624").getByRole("button", { name: "Book EK624 Saver" }).click();
    await expect(page.getByRole("heading", { name: "Book flight", level: 1 })).toBeVisible();
    expect(await noPageScroll(page)).toBe(0);
  });
}
for (const width of [1440, 1024, 768, 390]) {
  test(`flight line: total duration above, stops and stays below, line from departure to arrival at ${width}px (#89)`, async ({ page }) => {
    await openFlights(page, width, ROUND_TRIP);
    const expected: [string, string, string, number][] = [
      ["PA410", "03h 30m", "Non-stop", 2],
      ["QR629", "07h 50m", "1 stop via Doha (02h 45m)", 3],
      ["Z8266", "11h 40m", "2 stops via Islamabad (01h 00m), Karachi (04h 00m)", 4],
      ["EY242", "06h 45m", "1 stop via Abu Dhabi", 3],  // no segments from the supplier: the stop airport only
      ["EK624", "03h 30m", "Non-stop", 2],
    ];
    for (const [flight, total, below, dots] of expected) {
      const line = card(page, flight).locator("[data-route-line]");
      const [above, track, under] = await line.locator(":scope > span").all();
      await expect(above).toHaveText(total);
      await expect(under).toHaveText(below);
      await expect(track.locator(".rounded-full")).toHaveCount(dots);
      const a = (await above.boundingBox())!, t = (await track.boundingBox())!, u = (await under.boundingBox())!;
      expect(a.y + a.height).toBeLessThanOrEqual(t.y + 1);
      expect(t.y + t.height).toBeLessThanOrEqual(u.y + 1);
      // The line runs from the departure time's column to the arrival time's column.
      const departs = (await card(page, flight).getByText(/^\d{2}:\d{2}$/).first().boundingBox())!;
      const arrives = (await card(page, flight).getByText(/^\d{2}:\d{2}$/).nth(1).boundingBox())!;
      expect(t.x).toBeGreaterThanOrEqual(departs.x + departs.width - 1);
      expect(t.x + t.width).toBeLessThanOrEqual(arrives.x + 1);
      expect(t.width).toBeGreaterThan(40);
    }
    expect(await noPageScroll(page)).toBe(0);
  });

  test(`flight details: each stay with its country, stay time and times at ${width}px (#85)`, async ({ page }) => {
    await openFlights(page, width);
    const open = async (flight: string) => {
      await card(page, flight).getByRole("button", { name: "Flight details" }).click();
      const dialog = page.getByRole("dialog", { name: "Flight details" });
      await expect(dialog).toBeVisible();
      const box = (await dialog.boundingBox())!;
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(900);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      return dialog;
    };
    let dialog = await open("QR629");
    await expect(dialog).toContainText("StayDoha, Qatar (DOH)02h 45m · lands 06:00, leaves 08:45");
    await page.keyboard.press("Escape");
    dialog = await open("Z8266");
    await expect(dialog).toContainText("Stay 1Islamabad, Pakistan (ISB)01h 00m · lands 07:00, leaves 08:00");
    await expect(dialog).toContainText("Stay 2Karachi, Pakistan (KHI)04h 00m · lands 10:00, leaves 14:00");
    await page.keyboard.press("Escape");
    dialog = await open("EY242");
    await expect(dialog).toContainText("StayAbu Dhabi, United Arab Emirates (AUH)Stay time not available");
    await page.getByRole("button", { name: "Close" }).click();
    dialog = await open("PA410");
    await expect(dialog).not.toContainText("Stay");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });
}
