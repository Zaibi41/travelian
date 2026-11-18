import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { countryCode, getPublicBooking, searchPublicGroups, toGatewayPassenger, GATEWAY_GROUP_PROVIDER, isPayFastReturn, PublicBookingError } from "./public-booking";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubEnv("VITE_TRAVELIAN_GATEWAY_BASE_URL", "https://api.example.test");
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));

describe("public booking client", () => {
  it("turns the form's country names and titles into what the gateway needs", () => {
    expect(countryCode("Pakistan")).toBe("PAK");
    expect(countryCode("pak")).toBe("PAK");
    expect(countryCode("")).toBeUndefined();
    const passenger = toGatewayPassenger({ title: "ms", firstName: " Sara ", lastName: "Khan", gender: "female", dob: "1990-01-01",
      docNumber: "ab 1234567", nationality: "Pakistan", expiryDate: "2030-01-01" });
    expect(passenger).toMatchObject({ type: "ADT", title: "MISS", first_name: "Sara", gender: "F", document_number: "AB1234567",
      nationality: "PAK", document_country: "PAK", id_type: "PSPT" });
  });

  it("maps the gateway's public group fares to the existing group ticket shape, prices from the gateway", async () => {
    fetchMock.mockReturnValueOnce(json({ data: [{ id: "g1", sector: "ISB - JED", airline: "Fly Jinnah", logo_url: "/v1/logos/abc", tickets: [{
      id: "t-1", sector: "ISB - JED", flight_number: "9P700", departure_date: "2026-12-02", baggage: "20", hand_carry: "10",
      legs: [{ direction: "outbound", flight_number: "9P700", origin: "ISB", destination: "JED", departure_date: "2026-12-02", departure_time: "06:40", arrival_time: "10:05" },
             { direction: "return", flight_number: "9P701", origin: "JED", destination: "ISB", departure_date: "2026-12-21", departure_time: "11:05", arrival_time: "18:05" }],
      selling_price: { amount_minor: 17800000, currency: "PKR" },
    }, { id: "t-unpriced", legs: [] }] }] }));
    const tickets = await searchPublicGroups({ origin: "ISB", adults: 2 });
    const [request] = fetchMock.mock.calls;
    expect(request[0]).toBe("https://api.example.test/v1/public/group-ticketing/search");
    expect(JSON.parse(request[1].body)).toEqual({ origin: "ISB", destination: null, departure_date: null, adults: 2 });
    expect(request[1].headers.Authorization).toBeUndefined(); // no login on the public site
    expect(tickets).toHaveLength(1); // a fare without a price is not offered
    expect(tickets[0]).toMatchObject({ id: "t-1", provider: GATEWAY_GROUP_PROVIDER, fare: 178000, tripType: "round-trip", returnDate: "2026-12-21",
      baggage: "20+10 kg", airlineLogo: "https://api.example.test/v1/logos/abc" });
  });

  it("opens a booking only with its private token and reports the gateway's message", async () => {
    fetchMock.mockReturnValueOnce(json({ detail: "Booking not found.", code: "not_found" }, 404));
    await expect(getPublicBooking("TRV-G-1", "secret-token")).rejects.toMatchObject({ status: 404, message: "Booking not found.", code: "not_found" });
    expect(fetchMock.mock.calls[0][1].headers["X-Booking-Token"]).toBe("secret-token");
    expect(new PublicBookingError("x", 0)).toBeInstanceOf(Error);
  });

  it("recognises PayFast's return parameters", () => {
    expect(isPayFastReturn(new URLSearchParams("ref=TRV-G-1&basket_id=B&err_code=000&validation_hash=h"))).toBe(true);
    expect(isPayFastReturn(new URLSearchParams("ref=TRV-G-1"))).toBe(false);
  });
});
