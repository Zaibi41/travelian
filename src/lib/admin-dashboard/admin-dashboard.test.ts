import { describe, expect, it, vi } from "vitest";
import { cn } from "@/lib/utils";
import { GatewayError, gatewayGet } from "@/lib/gateway/client";
import { severityForCount, SEVERITY_LABEL } from "./severity";
import { formatBucket, formatRs } from "./format";
import { parseDashboardQuery, serializeDashboardQuery } from "./query-params";
import { ATTENTION_QUEUE_PLACEHOLDER, attentionRowHref, needsActionLinks } from "./links";
import { fetchAttentionQueue, fetchDashboardSummary } from "./api";

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" as const });
const okJson = (body: unknown) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));

describe("cn() with admin type scale", () => {
  it("keeps the font size next to a status text color", () => {
    expect(cn("text-kpi", "text-status-action-text")).toBe("text-kpi text-status-action-text");
    expect(cn("text-label", "text-status-fine-text")).toBe("text-label text-status-fine-text");
    expect(cn("text-body", "text-label")).toBe("text-label");
  });
});

describe("severity", () => {
  it("is fine at zero and keeps a text label", () => {
    expect(severityForCount(0, "action")).toBe("fine");
    expect(severityForCount(3, "action")).toBe("action");
    expect(SEVERITY_LABEL).toEqual({ critical: "Critical", action: "Needs action", fine: "Fine" });
  });
});

describe("formatting (display only; amounts arrive as paisa)", () => {
  it("uses the Rs label", () => {
    expect(formatRs(rs(1_284_500))).toBe("Rs 1,284,500");
    expect(formatRs({ amount_minor: 10_649_550, currency: "PKR" })).toBe("Rs 106,496");
    expect(formatRs(rs(167_900))).toBe("Rs 167,900");
  });
  it("labels report buckets by granularity", () => {
    expect(formatBucket("2026-11-05", "day")).toBe("Thu 5 Nov");
    expect(formatBucket("2026-11-02", "week")).toBe("2 Nov");
    expect(formatBucket("2026-11-01", "month")).toBe("Nov 2026");
  });
});

describe("URL filters", () => {
  it("defaults to All and ignores unknown values", () => {
    expect(parseDashboardQuery(new URLSearchParams(""))).toEqual({ period: "all", product: undefined, provider: undefined });
    expect(parseDashboardQuery(new URLSearchParams("period=bogus&product=visa"))).toEqual({ period: "all", product: undefined, provider: undefined });
  });
  it("round-trips non-default filters only", () => {
    const query = parseDashboardQuery(new URLSearchParams("period=today&product=flight&provider=SooperFare"));
    expect(query).toEqual({ period: "today", product: "flight", provider: "sooperfare" });
    expect(serializeDashboardQuery(query).toString()).toBe("period=today&product=flight&provider=sooperfare");
    expect(serializeDashboardQuery({ period: "all" }).toString()).toBe("");
  });
});

describe("card links: only to lists whose counts match", () => {
  it("opens Bookings > Flights with the matching card picked", () => {
    expect(needsActionLinks({ period: "all" })).toEqual({
      pendingIssuance: "/admin/bookings/flights?card=awaiting_issuance",
      paymentPending: "/admin/bookings/flights?card=payment_pending",
      expiringHolds: "/admin/bookings/flights?card=expiring_soon",
    });
    // Needs-action cards ignore the date filter; the list defaults to all dates.
    expect(needsActionLinks({ period: "today", product: "flight" }).pendingIssuance).toBe("/admin/bookings/flights?card=awaiting_issuance");
    expect(needsActionLinks({ period: "all", provider: "airsial" }).pendingIssuance).toBe("/admin/bookings/flights?card=awaiting_issuance&provider=airsial");
  });
  it("falls back to the placeholder for another product", () => {
    expect(needsActionLinks({ period: "all", product: "hotel" })).toEqual({
      pendingIssuance: ATTENTION_QUEUE_PLACEHOLDER, paymentPending: ATTENTION_QUEUE_PLACEHOLDER, expiringHolds: ATTENTION_QUEUE_PLACEHOLDER,
    });
  });
  it("opens the row's booking", () => {
    expect(attentionRowHref({ booking_id: "b 1", reference: "TR7K2P", type: "hold_expiring" })).toBe("/admin/bookings/b%201");
  });
});

describe("gateway client", () => {
  it("calls the generated path with filters and the bearer token", async () => {
    const fetchImpl = okJson({});
    await fetchDashboardSummary({ period: "today", product: "flight", provider: "sooperfare" }, { baseUrl: "http://localhost:8000/", accessToken: "tok", fetchImpl });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("http://localhost:8000/v1/admin/dashboard/summary?period=today&product=flight&provider=sooperfare");
    expect(init.headers.Authorization).toBe("Bearer tok");
  });
  it("omits empty filters", async () => {
    const fetchImpl = okJson({ total: 0, items: [] });
    await fetchAttentionQueue({ period: "all" }, 6, { baseUrl: "http://gw", accessToken: "t", fetchImpl });
    expect(fetchImpl.mock.calls[0][0]).toBe("http://gw/v1/admin/attention-queue?limit=6");
  });
  it("maps configuration and HTTP errors to clear messages", async () => {
    const call = (fetchImpl?: typeof fetch, baseUrl = "http://gw", accessToken = "t") =>
      gatewayGet("/v1/admin/dashboard/filter-options", undefined, { baseUrl, accessToken, fetchImpl });
    const status = (code: number) => vi.fn().mockResolvedValue(new Response("{}", { status: code }));
    await expect(call(undefined, "")).rejects.toMatchObject({ kind: "not_configured" });
    await expect(call(undefined, "http://gw", "")).rejects.toMatchObject({ kind: "unauthorized" });
    await expect(call(status(401))).rejects.toMatchObject({ kind: "unauthorized" });
    await expect(call(status(403))).rejects.toMatchObject({ kind: "forbidden" });
    await expect(call(status(503))).rejects.toMatchObject({ kind: "unavailable", message: expect.stringMatching(/booking source/) });
    // A 503 shows the gateway's own reason when it gives one.
    const detail = (text: string) => vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: text }), { status: 503 }));
    for (const reason of ["Agency service unavailable.", "Authentication is not configured.", "Identity verification is temporarily unavailable."]) {
      await expect(call(detail(reason))).rejects.toMatchObject({ kind: "unavailable", message: reason });
    }
    // Non-text or oversized details are ignored.
    await expect(call(vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: [{ msg: "x" }] }), { status: 503 }))))
      .rejects.toMatchObject({ message: expect.stringMatching(/booking source/) });
    await expect(call(status(500))).rejects.toBeInstanceOf(GatewayError);
    await expect(call(vi.fn().mockRejectedValue(new TypeError("Failed to fetch")))).rejects.toMatchObject({ kind: "unavailable" });
  });
});
