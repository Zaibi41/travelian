import { afterEach, describe, expect, it } from "vitest";
import { analyticsMeasurementId, isTrackedPath, reportedPath, resetAnalyticsForTests, trackPageView } from "./analytics";

afterEach(() => {
  resetAnalyticsForTests();
  document.head.querySelectorAll('script[src*="googletagmanager"]').forEach((s) => s.remove());
});

describe("analytics", () => {
  it("accepts only a GA4 measurement ID", () => {
    expect(analyticsMeasurementId("G-ABC123XYZ")).toBe("G-ABC123XYZ");
    expect(analyticsMeasurementId(" g-abc123xyz ")).toBe("G-ABC123XYZ");
    expect(analyticsMeasurementId("")).toBeNull();
    expect(analyticsMeasurementId(undefined)).toBeNull();
    expect(analyticsMeasurementId("UA-12345-1")).toBeNull();
    expect(analyticsMeasurementId('G-1"><script>')).toBeNull();
  });

  it("never tracks admin pages", () => {
    expect(isTrackedPath("/")).toBe(true);
    expect(isTrackedPath("/flights-search")).toBe(true);
    expect(isTrackedPath("/administration-fees")).toBe(true);
    expect(isTrackedPath("/admin")).toBe(false);
    expect(isTrackedPath("/admin/bookings")).toBe(false);
  });

  it("masks booking access tokens in the path", () => {
    expect(reportedPath("/my-bookings/view/abc123secret")).toBe("/my-bookings/view/:token");
    expect(reportedPath("/my-bookings")).toBe("/my-bookings");
    expect(reportedPath("/faq")).toBe("/faq");
  });

  it("does nothing without a measurement ID", () => {
    expect(trackPageView("/", null)).toBe(false);
    expect(window.gtag).toBeUndefined();
    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();
  });

  it("does not load on admin pages", () => {
    expect(trackPageView("/admin/bookings", "G-TEST1234")).toBe(false);
    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();
  });

  it("loads gtag once and sends page views without the query string", () => {
    expect(trackPageView("/flights-search", "G-TEST1234")).toBe(true);
    expect(trackPageView("/faq", "G-TEST1234")).toBe(true);
    expect(document.querySelectorAll('script[src*="googletagmanager"]')).toHaveLength(1);
    const events = (window.dataLayer ?? []).map((a) => Array.from(a as ArrayLike<unknown>));
    const config = events.find((e) => e[0] === "config");
    expect(config).toEqual(["config", "G-TEST1234", { send_page_view: false }]);
    const views = events.filter((e) => e[0] === "event" && e[1] === "page_view");
    expect(views.map((v) => (v[2] as { page_path: string }).page_path)).toEqual(["/flights-search", "/faq"]);
    for (const v of views) expect((v[2] as { page_location: string }).page_location).not.toContain("?");
  });
});
