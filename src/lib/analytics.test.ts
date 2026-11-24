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
    expect(config?.[2]).toMatchObject({ send_page_view: false, page_path: "/flights-search" });
    const views = events.filter((e) => e[0] === "event" && e[1] === "page_view");
    expect(views.map((v) => (v[2] as { page_path: string }).page_path)).toEqual(["/flights-search", "/faq"]);
    for (const v of views) expect((v[2] as { page_location: string }).page_location).not.toContain("?");
  });

  it("sets masked page fields for GA's automatic events, never the real URL, referrer or title", () => {
    document.title = "Bookings | Travelian Admin";
    expect(trackPageView("/my-bookings/view/secret-token", "G-TEST1234")).toBe(false);
    expect(window.gtag).toBeUndefined();
    trackPageView("/faq", "G-TEST1234");
    trackPageView("/admin/bookings", "G-TEST1234");
    expect((window as unknown as Record<string, unknown>)["ga-disable-G-TEST1234"]).toBe(true);
    trackPageView("/my-bookings/view/secret-token", "G-TEST1234");
    trackPageView("/", "G-TEST1234");
    expect((window as unknown as Record<string, unknown>)["ga-disable-G-TEST1234"]).toBe(false);
    const events = (window.dataLayer ?? []).map((a) => Array.from(a as ArrayLike<unknown>));
    const sent = JSON.stringify(events);
    expect(sent).not.toContain("secret-token");
    expect(sent).not.toContain("/admin/bookings");
    expect(sent).not.toContain("Travelian Admin");
    const sets = events.filter((e) => e[0] === "set").map((e) => e[1] as Record<string, string>);
    expect(sets.map((x) => x.page_path)).toEqual(["/faq", "/admin", "/my-bookings/view/:token", "/"]);
    expect(sets[3].page_referrer).toBe(`${window.location.origin}/my-bookings/view/:token`);
    const views = events.filter((e) => e[0] === "event").map((e) => (e[2] as Record<string, string>).page_path);
    expect(views).toEqual(["/faq", "/"]);
  });

  it("switches GA off before a history change to a blocked page", () => {
    trackPageView("/faq", "G-TEST1234");
    window.history.pushState({}, "", "/admin/bookings");
    expect((window as unknown as Record<string, unknown>)["ga-disable-G-TEST1234"]).toBe(true);
    window.history.pushState({}, "", "/");
    expect((window as unknown as Record<string, unknown>)["ga-disable-G-TEST1234"]).toBe(false);
  });
});
