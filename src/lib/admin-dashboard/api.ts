import { gatewayGet, type GatewayOptions } from "@/lib/gateway/client";
import type { DashboardQuery } from "./types";

const filters = (query: DashboardQuery) => ({ product: query.product, provider: query.provider });

export const fetchDashboardSummary = (query: DashboardQuery, options?: GatewayOptions) =>
  gatewayGet("/v1/admin/dashboard/summary", { period: query.period, ...filters(query) }, options);

/** Follows the date filter only. */
export const fetchBookingReport = (query: DashboardQuery, options?: GatewayOptions) =>
  gatewayGet("/v1/admin/dashboard/booking-report", { period: query.period }, options);

/** Ignores the date filter. */
export const fetchAttentionQueue = (query: DashboardQuery, limit: number, options?: GatewayOptions) =>
  gatewayGet("/v1/admin/attention-queue", { limit, ...filters(query) }, options);

export const fetchDashboardFilterOptions = (options?: GatewayOptions) =>
  gatewayGet("/v1/admin/dashboard/filter-options", undefined, options);

/** gateway#87: the latest booking events across bookings (back office only; ignores every filter). */
export const fetchRecentActivity = (limit: number, options?: GatewayOptions) =>
  gatewayGet("/v1/admin/recent-activity", { limit }, options);
