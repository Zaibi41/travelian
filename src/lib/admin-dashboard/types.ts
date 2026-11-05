// Admin Dashboard types, generated from the gateway OpenAPI schema
// (src/lib/gateway/schema.d.ts; regenerate with `npm run api:types`).
// Hidden elements and what they still need: docs/backend-todo.md.

import type { components } from "@/lib/gateway/schema";

type Schemas = components["schemas"];

export type DashboardSummary = Schemas["DashboardSummary"];
export type NeedsAction = Schemas["NeedsAction"];
export type BusinessResults = Schemas["BusinessResults"];
export type Money = Schemas["Money"];
export type BookingReport = Schemas["BookingReport"];
export type AttentionQueue = Schemas["AttentionQueue"];
export type AttentionItem = Schemas["AttentionItem"];
export type DashboardFilterOptions = Schemas["DashboardFilterOptions"];

export type DashboardPeriod = NonNullable<NonNullable<import("@/lib/gateway/schema").operations["dashboard_summary_v1_admin_dashboard_summary_get"]["parameters"]["query"]>["period"]>;
export type DashboardProduct = "flight" | "hotel" | "umrah";

export interface DashboardQuery {
  /** Default "all" (decided 2026-10-31). */
  period: DashboardPeriod;
  product?: DashboardProduct;
  /** Lower-case provider name. */
  provider?: string;
}

/** red = critical, amber = needs action, green = fine. Always shown with a text label. */
export type Severity = "critical" | "action" | "fine";
