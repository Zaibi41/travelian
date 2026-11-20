// Finance (travelian#91 and the Finance issues): travelian-api-gateway /v1/admin/finance/*.
// The gateway checks the Finance permission on every call and does all money maths (integer paisa);
// this file only fetches and sends. Nothing here moves money.
import { gatewayGet, gatewayPost, type GatewayOptions, type GetQuery, type GetResponse } from "@/lib/gateway/client";

export type AuditLogPage = GetResponse<"/v1/admin/finance/audit-log">;
export type AuditEntry = AuditLogPage["entries"][number];
export type AuditLogQuery = NonNullable<GetQuery<"/v1/admin/finance/audit-log">>;
export type BookingFinance = GetResponse<"/v1/admin/finance/bookings/{reference}">;
export type Refund = BookingFinance["refunds"][number];

export const fetchFinanceAccess = (options?: GatewayOptions) =>
  gatewayGet("/v1/admin/finance/access", undefined, { ...options, unavailableMessage: "Finance access couldn't be checked." });

export const fetchAuditLog = (query: AuditLogQuery, options?: GatewayOptions) =>
  gatewayGet("/v1/admin/finance/audit-log", query, { ...options, unavailableMessage: "The audit log couldn't be loaded. Try again in a moment." });

export const fetchBookingFinance = (reference: string, options?: GatewayOptions) =>
  gatewayGet("/v1/admin/finance/bookings/{reference}", undefined, {
    ...options, pathParams: { reference }, unavailableMessage: "The booking's finance details couldn't be loaded.",
  });

export const addSupplierCharge = (reference: string, body: { amount_minor: number; reason: string; traveler_position?: number | null; supplier_reference?: string | null }) =>
  gatewayPost("/v1/admin/finance/bookings/{reference}/supplier-charges", body, {
    pathParams: { reference }, unavailableMessage: "The charge couldn't be saved right now. Nothing was saved.",
  });

export const requestRefund = (reference: string, body: { amount_minor: number; method: Refund["method"]; reason: string }) =>
  gatewayPost("/v1/admin/finance/bookings/{reference}/refunds", body, {
    pathParams: { reference }, unavailableMessage: "The refund couldn't be recorded right now. Nothing was saved.",
  });

export const approveRefund = (refundId: string) =>
  gatewayPost("/v1/admin/finance/refunds/{refund_id}/approve", undefined as never, {
    pathParams: { refund_id: refundId }, unavailableMessage: "The refund couldn't be approved right now. Nothing was changed.",
  });

export const rejectRefund = (refundId: string, reason: string) =>
  gatewayPost("/v1/admin/finance/refunds/{refund_id}/reject", { reason }, {
    pathParams: { refund_id: refundId }, unavailableMessage: "The refund couldn't be rejected right now. Nothing was changed.",
  });

export const markRefundPaid = (refundId: string, body: { payout_reference: string; paid_at: string }) =>
  gatewayPost("/v1/admin/finance/refunds/{refund_id}/paid", body, {
    pathParams: { refund_id: refundId }, unavailableMessage: "The payout couldn't be recorded right now. Nothing was changed.",
  });

/** Plain-language names for audit actions (unknown ones are shown as written). */
export const AUDIT_ACTION_LABEL: Record<string, string> = {
  supplier_charge_recorded: "Supplier charge recorded",
  payment_fee_recorded: "Payment fee recorded",
  refund_requested: "Refund requested",
  refund_approved: "Refund approved",
  refund_rejected: "Refund rejected",
  refund_paid: "Refund marked paid",
  setting_changed: "Setting changed",
};

export const auditActionLabel = (action: string) => AUDIT_ACTION_LABEL[action] ?? action.replace(/_/g, " ");

/** "amount_minor: 45770 → 43770"-style lines, money in rupees for *_minor keys. */
export function describeChange(before: unknown, after: unknown): string[] {
  const asRecord = (value: unknown) => (value && typeof value === "object" ? value as Record<string, unknown> : {});
  const b = asRecord(before), a = asRecord(after);
  const show = (key: string, value: unknown) => {
    if (value === null || value === undefined) return "—";
    if (key.endsWith("_minor") && typeof value === "number") return `Rs ${(value / 100).toLocaleString("en-PK", { maximumFractionDigits: 2 })}`;
    return String(value);
  };
  const label = (key: string) => key.replace(/_minor$/, "").replace(/_/g, " ");
  return [...new Set([...Object.keys(b), ...Object.keys(a)])].map(key =>
    key in b && key in a ? `${label(key)}: ${show(key, b[key])} → ${show(key, a[key])}`
      : key in a ? `${label(key)}: ${show(key, a[key])}` : `${label(key)} was ${show(key, b[key])}`);
}
