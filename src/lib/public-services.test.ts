import { describe, expect, it } from "vitest";
import { isPublicPathVisible, isPublicServiceVisible } from "./public-services";

describe("public service visibility", () => {
  it.each(["visa", "visas", "tour", "tours"])("hides standalone %s", service => {
    expect(isPublicServiceVisible(service)).toBe(false);
  });
  it.each(["/visa-services", "/visa/123", "/study-abroad", "/tour-packages", "/tour/123",
    "/booking?type=tour", "/request-booking?category=visa", "/request-booking?type=visa"])("hides public route %s", path => {
    expect(isPublicPathVisible(path)).toBe(false);
  });
  it.each(["/", "/hotels-search", "/umrah-packages", "/about", "/contact", "/admin/visa",
    "/admin/tours", "/booking?type=umrah", "/request-booking?type=umrah", "/my-bookings"])("preserves %s", path => {
    expect(isPublicPathVisible(path)).toBe(true);
  });
});
