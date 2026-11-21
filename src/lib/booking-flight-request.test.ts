import { afterEach, describe, expect, it, vi } from "vitest";
import { saveBooking } from "./booking-store";
import { getFlightPaymentOptions, PublicBookingError, requestPublicFlight, toGatewayFlightPassenger } from "./public-booking";

// B19 / D43 / D45: the website never makes up a PNR or a confirmed status, and a flight is booked by the gateway's fare
// ids as a request (the gateway prices it; nothing is held, ticketed or charged).
describe("website flight booking", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); localStorage.clear(); });

  it("a booking saved only in the browser has no PNR and keeps the status it was given", () => {
    const saved = saveBooking({
      type: "hotel", status: "requested", travelers: [], contact: { phone: "+923001234567" }, addons: [],
      paymentMethod: "hold", paymentStatus: "unpaid", ticketStatus: "not_issued",
      pricing: { base: 1, addons: 0, taxes: 0, total: 1, currency: "PKR" },
    } as Parameters<typeof saveBooking>[0]);
    expect(saved.pnr).toBe("");
    expect(saved.status).toBe("requested");
    expect(saved.id).toMatch(/^TRV-REQ-/);
  });

  it("sends the fare ids, never a price, and maps passport and CNIC travelers", async () => {
    vi.stubEnv("VITE_TRAVELIAN_GATEWAY_BASE_URL", "https://gw.example.test");
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ reference: "TRV-R-1", access_token: "t".repeat(20),
      booking: { reference: "TRV-R-1", status: "requested", payment_status: "unpaid", live: false, can_pay: false,
        total: { amount_minor: 2207000, currency: "PKR" }, paid: { amount_minor: 0, currency: "PKR" } } }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await requestPublicFlight({
      searchId: "search-123456", fareIds: ["fare-out", "fare-back"],
      contact: { firstName: "Test", lastName: "Guest", phoneCode: "+92", phone: "03001234567", email: "guest@example.invalid" },
      travelers: [
        { passengerType: "adult", title: "Mr", firstName: "Test", lastName: "Guest", dob: "1990-01-01", docType: "cnic", docNumber: "35201-1234567-1", nationality: "Pakistan" },
        { passengerType: "child", title: "Master", firstName: "Kid", lastName: "Guest", dob: "2018-01-01", docType: "passport", docNumber: "ab1234567",
          nationality: "Pakistan", issuanceCountry: "Pakistan", expiryDate: "2030-01-01" },
      ],
    });
    expect(result.booking.status).toBe("requested");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://gw.example.test/v1/public/flights/requests");
    const body = JSON.parse(String(init.body));
    expect(body).not.toHaveProperty("price");
    expect(body.search_id).toBe("search-123456");
    expect(body.fare_ids).toEqual(["fare-out", "fare-back"]);
    expect(body.contact).toMatchObject({ phone_code: "92", phone: "3001234567", email: "guest@example.invalid" });
    expect(body.passengers[0]).toMatchObject({ type: "ADT", id_type: "NATI", document_number: "3520112345671", nationality: "PAK" });
    expect(body.passengers[1]).toMatchObject({ type: "CHD", title: "MASTER", id_type: "PSPT", document_number: "AB1234567", document_country: "PAK" });
    expect(toGatewayFlightPassenger({ title: "Mrs", firstName: "A", lastName: "B" }).type).toBe("ADT");
    expect(body.payment_method).toBe("card"); // the default; the gateway decides whether it is held and payable
  });

  it("sends the chosen payment method and nothing that could confirm or ticket the booking", async () => {
    vi.stubEnv("VITE_TRAVELIAN_GATEWAY_BASE_URL", "https://gw.example.test");
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ reference: "TRV-F-1", access_token: "t".repeat(20),
      booking: { reference: "TRV-F-1", status: "held", payment_status: "unpaid", live: true, can_pay: false,
        total: { amount_minor: 2207000, currency: "PKR" }, paid: { amount_minor: 0, currency: "PKR" } } }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    for (const method of ["bank_transfer", "jazzcash"] as const) {
      await requestPublicFlight({
        searchId: "search-123456", fareIds: ["fare-out"], paymentMethod: method,
        contact: { firstName: "Test", lastName: "Guest", phoneCode: "92", phone: "3001234567", email: "guest@example.invalid" },
        travelers: [{ passengerType: "adult", title: "Mr", firstName: "Test", lastName: "Guest", dob: "1990-01-01", docType: "cnic", docNumber: "3520112345671" }],
      });
    }
    const bodies = fetchMock.mock.calls.map((call) => JSON.parse(String((call as unknown as [string, RequestInit])[1].body)));
    expect(bodies.map((body) => body.payment_method)).toEqual(["bank_transfer", "jazzcash"]);
    for (const body of bodies) {
      for (const field of ["paid", "payment_status", "status", "pnr", "tickets", "price", "total"]) expect(body).not.toHaveProperty(field);
    }
  });

  it("a double booking refused by the gateway (409) reports its plain sentence and code (issue #17)", async () => {
    vi.stubEnv("VITE_TRAVELIAN_GATEWAY_BASE_URL", "https://gw.example.test");
    const sentence = "One of these travelers already has a booking on this route and date, so nothing was booked. If you need help, contact Travelian.";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ detail: sentence, code: "duplicate_booking" }), { status: 409 })));
    const error = await requestPublicFlight({
      searchId: "search-123456", fareIds: ["fare-out"],
      contact: { firstName: "Test", lastName: "Guest", phoneCode: "92", phone: "3001234567", email: "guest@example.invalid" },
      travelers: [{ passengerType: "adult", title: "Mr", firstName: "Test", lastName: "Guest", dob: "1990-01-01", docType: "cnic", docNumber: "3520112345671" }],
    }).catch((problem) => problem);
    expect(error).toBeInstanceOf(PublicBookingError);
    expect([error.status, error.code, error.message]).toEqual([409, "duplicate_booking", sentence]);
  });

  it("asks the gateway which methods a fare takes (no card where it can't be issued) by fare ids only", async () => {
    vi.stubEnv("VITE_TRAVELIAN_GATEWAY_BASE_URL", "https://gw.example.test");
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ held: true, card: false, bank_transfer: true, jazzcash: false }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const options = await getFlightPaymentOptions("search-123456", ["fare-out"]);
    expect(options.card).toBe(false);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://gw.example.test/v1/public/flights/payment-options");
    expect(JSON.parse(String(init.body))).toEqual({ search_id: "search-123456", fare_ids: ["fare-out"] });
  });
});
