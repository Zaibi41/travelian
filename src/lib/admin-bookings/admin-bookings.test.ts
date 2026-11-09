import { describe, expect, it, vi } from "vitest";
import { fetchBookingDetail, fetchBookings } from "./api";
import { formatMoney, formatTimeLeft } from "./format";
import { parseBookingsFilters, serializeBookingsFilters } from "./query-params";
import { bookingDetailPath } from "./tabs";
import { bookingListParams } from "./use-bookings";

const okJson = (body: unknown) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));

describe("bookings URL filters", () => {
  it("defaults to All and ignores unknown values", () => {
    expect(parseBookingsFilters(new URLSearchParams("period=forever&booking_status=lost&page=-2"))).toEqual({ period: "all", page: 1 });
  });
  it("round-trips non-default filters only", () => {
    const query = "q=ABC123&period=today&booking_status=held&payment_status=unpaid&issuance_status=not_issued&provider=airsial&agency=ag-1&page=2";
    const filters = parseBookingsFilters(new URLSearchParams(query));
    expect(serializeBookingsFilters(filters).toString()).toBe(query);
    expect(serializeBookingsFilters({ period: "all", page: 1 }).toString()).toBe("");
  });
  it("turns the page into an offset", () => {
    expect(bookingListParams("flight", { period: "all", page: 3 })).toMatchObject({ product: "flight", limit: 50, offset: 100 });
  });
});

describe("bookings formatting (display only)", () => {
  it("labels PKR as Rs and keeps other currency codes", () => {
    expect(formatMoney({ amount_minor: 1_250_000, currency: "PKR" })).toBe("Rs 12,500");
    expect(formatMoney({ amount_minor: 400_000, currency: "INR" })).toBe("INR 4,000");
  });
  it("shows time left until a deadline", () => {
    const now = new Date("2026-11-05T12:00:00+05:00");
    expect(formatTimeLeft("2026-11-05T13:30:00+05:00", now)).toBe("1h 30m left");
    expect(formatTimeLeft("2026-11-07T14:00:00+05:00", now)).toBe("2d 2h left");
    expect(formatTimeLeft("2026-11-05T11:00:00+05:00", now)).toBe("Expired");
    expect(formatTimeLeft(null, now)).toBe("—");
  });
  it("puts each booking on its own page URL", () => {
    expect(bookingDetailPath("TRV/1 2")).toBe("/admin/bookings/TRV%2F1%202");
    expect(bookingDetailPath("TRV-1", "fare")).toBe("/admin/bookings/TRV-1/fare");
  });
});

describe("bookings gateway calls", () => {
  it("sends filters to the list endpoint", async () => {
    const fetchImpl = okJson({});
    await fetchBookings({ product: "flight", q: "abc", limit: 50, offset: 0 }, { baseUrl: "http://gw", accessToken: "t", fetchImpl });
    expect(fetchImpl.mock.calls[0][0]).toBe("http://gw/v1/admin/bookings?product=flight&q=abc&limit=50&offset=0");
  });
  it("encodes the booking ID into the detail path and maps 404", async () => {
    const fetchImpl = okJson({});
    await fetchBookingDetail("TRV/1", { baseUrl: "http://gw", accessToken: "t", fetchImpl });
    expect(fetchImpl.mock.calls[0][0]).toBe("http://gw/v1/admin/bookings/TRV%2F1");
    const missing = vi.fn().mockResolvedValue(new Response("{}", { status: 404 }));
    await expect(fetchBookingDetail("X", { baseUrl: "http://gw", accessToken: "t", fetchImpl: missing })).rejects.toMatchObject({ kind: "not_found" });
  });
});
