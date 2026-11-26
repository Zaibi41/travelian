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

  it("treats differently-cased or encoded private paths as private and switches GA off on them", async () => {
    vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-TEST12345");
    const { trackPageView, normalisePath } = await import("./analytics");
    expect(normalisePath("/Admin/Bookings/")).toBe("/admin/bookings");
    expect(normalisePath("//%41ccount")).toBe("/account");
    trackPageView("/ADMIN");
    trackPageView("/%61dmin/finance");
    expect(document.querySelector("script[src*='googletagmanager']")).toBeNull();
    trackPageView("/flights-search");
    expect((window as unknown as Record<string, unknown>)["ga-disable-G-TEST12345"]).toBe(false);
    trackPageView("/My-Bookings");
    expect((window as unknown as Record<string, unknown>)["ga-disable-G-TEST12345"]).toBe(true);
    const views = (window.dataLayer as IArguments[]).map(e => Array.from(e)).filter(e => e[0] === "event");
    expect(views.map(e => (e[2] as { page_path: string }).page_path)).toEqual(["/flights-search"]);
  });

  it("sends only known search parameters", async () => {
    vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-TEST12345");
    const { safeSearch } = await import("./analytics");
    expect(safeSearch("?from=LHE&to=DXB&token=abc&email=a@b.c&ref=TRV-1")).toBe("?from=LHE&to=DXB");
    expect(safeSearch("?token=abc")).toBe("");
  });

  it("ignores a malformed id", async () => {
    vi.stubEnv("VITE_GA_MEASUREMENT_ID", "UA-123<script>");
    const { analyticsId } = await import("./analytics");
    expect(analyticsId()).toBeNull();
  });
});
