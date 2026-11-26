import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Google Analytics (#20)", () => {
  beforeEach(() => { vi.resetModules(); document.head.innerHTML = ""; delete window.gtag; delete window.dataLayer; });
  afterEach(() => vi.unstubAllEnvs());

  it("does nothing without a measurement id", async () => {
    vi.stubEnv("VITE_GA_MEASUREMENT_ID", "");
    const { trackPageView, analyticsId } = await import("./analytics");
    trackPageView("/flights-search");
    expect(analyticsId()).toBeNull();
    expect(document.querySelector("script[src*='googletagmanager']")).toBeNull();
  });

  it("counts public pages only, never private ones", async () => {
    vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-TEST12345");
    const { trackPageView } = await import("./analytics");
    trackPageView("/admin/bookings");
    trackPageView("/booking", "?type=flight");
    expect(document.querySelector("script[src*='googletagmanager']")).toBeNull(); // private pages don't even load it
    trackPageView("/group-ticketing", "?from=LHE");
    expect(document.querySelector("script[src*='googletagmanager.com/gtag/js?id=G-TEST12345']")).not.toBeNull();
    const events = (window.dataLayer as IArguments[]).map(entry => Array.from(entry));
    expect(events.find(e => e[0] === "config")?.[2]).toMatchObject({ send_page_view: false, anonymize_ip: true });
    expect(events.filter(e => e[0] === "event").map(e => (e[2] as { page_path: string }).page_path)).toEqual(["/group-ticketing?from=LHE"]);
  });

  it("ignores a malformed id", async () => {
    vi.stubEnv("VITE_GA_MEASUREMENT_ID", "UA-123<script>");
    const { analyticsId } = await import("./analytics");
    expect(analyticsId()).toBeNull();
  });
});
