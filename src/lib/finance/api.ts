// Finance (travelian#91 and the Finance issues): travelian-api-gateway /v1/admin/finance/*.
// The gateway checks the Finance permission on every call and does all money maths (integer paisa);
// this file only fetches and sends. Nothing here moves money.
import { gatewayGet, gatewayGetFile, gatewayPost, gatewayPut, type GatewayOptions, type GetQuery, type GetResponse } from "@/lib/gateway/client";

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
  payment_slip_confirmed: "Payment slip confirmed",
  payment_slip_rejected: "Payment slip rejected",
  payments_exported: "Payments exported",
  supplier_balance_checked: "Supplier balance checked",
  supplier_top_up_recorded: "Supplier top-up recorded",
  supplier_adjustment_recorded: "Supplier balance adjusted",
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

// ---------------------------------------------------------------- Finance > Payments (#69, #74, #76, gateway#56)

export type PaymentList = GetResponse<"/v1/admin/finance/payments">;
export type FinancePayment = PaymentList["payments"][number];
export type PaymentListQuery = NonNullable<GetQuery<"/v1/admin/finance/payments">>;
export type RefundsDue = GetResponse<"/v1/admin/finance/refunds-due">;
export type PaymentSettings = GetResponse<"/v1/admin/finance/settings/payments">;

export const fetchFinancePayments = (query: PaymentListQuery, options?: GatewayOptions) =>
  gatewayGet("/v1/admin/finance/payments", query, { ...options, unavailableMessage: "Payments couldn't be loaded. Try again in a moment." });

export const exportFinancePayments = (query: Omit<PaymentListQuery, "limit" | "offset">) =>
  gatewayGetFile("/v1/admin/finance/payments.csv", "text/csv", { unavailableMessage: "The export couldn't be made right now." }, query);

export const fetchSlipLink = (slipId: string) =>
  gatewayGet("/v1/admin/finance/slips/{slip_id}/link", undefined, {
    pathParams: { slip_id: slipId }, unavailableMessage: "The slip can't be opened right now. Try again in a moment.",
  });

export const confirmSlip = (slipId: string, body: { amount_minor: number; account_id: string; payer_reference?: string | null; received_at: string }) =>
  gatewayPost("/v1/admin/finance/slips/{slip_id}/confirm", body, {
    pathParams: { slip_id: slipId }, unavailableMessage: "The payment couldn't be confirmed right now. Nothing was recorded.",
  });

export const rejectSlip = (slipId: string, reason: string) =>
  gatewayPost("/v1/admin/finance/slips/{slip_id}/reject", { reason }, {
    pathParams: { slip_id: slipId }, unavailableMessage: "The slip couldn't be rejected right now. Nothing was changed.",
  });

export const fetchRefundsDue = (options?: GatewayOptions) =>
  gatewayGet("/v1/admin/finance/refunds-due", undefined, { ...options, unavailableMessage: "Refunds due couldn't be loaded." });

export const fetchPaymentSettings = (options?: GatewayOptions) =>
  gatewayGet("/v1/admin/finance/settings/payments", undefined, { ...options, unavailableMessage: "Payment settings couldn't be loaded." });

export const updatePaymentSettings = (body: { card_fee_bps?: number | null; card_fee_on_group?: boolean | null; reason?: string | null }) =>
  gatewayPut("/v1/admin/finance/settings/payments", body, { unavailableMessage: "The setting couldn't be saved. Nothing was changed." });

/** "3" or "2.5" percent -> basis points (300, 250); null when not 0–10 with up to 2 decimals. Text parsing only. */
export function percentToBps(text: string): number | null {
  const match = /^(\d{1,2})(?:\.(\d{1,2}))?$/.exec(text.trim());
  if (!match) return null;
  const bps = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return bps <= 1000 ? bps : null;
}

export const bpsLabel = (bps: number) => `${(bps / 100).toFixed(2).replace(/\.?0+$/, "")}%`;

// ---------------------------------------------------------------- Finance > Wallets (#68)
export type SupplierWallet = GetResponse<"/v1/admin/finance/supplier-balances">["wallets"][number];
export type WalletHistoryItem = GetResponse<"/v1/admin/finance/supplier-balances/{provider}/history">["items"][number];

export const fetchSupplierWallets = (options?: GatewayOptions) =>
  gatewayGet("/v1/admin/finance/supplier-balances", undefined, { ...options, unavailableMessage: "Supplier balances couldn't be loaded. Try again in a moment." });

export const refreshSouthair = () =>
  gatewayPost("/v1/admin/finance/supplier-balances/southair/refresh", undefined as never, { unavailableMessage: "Southair couldn't be read right now." });

export const recordWalletEntry = (provider: string, kind: "top-ups" | "adjustments",
                                  body: { amount_minor: number; reference?: string | null; reason?: string | null; occurred_at: string }) =>
  gatewayPost(kind === "top-ups" ? "/v1/admin/finance/supplier-balances/{provider}/top-ups" : "/v1/admin/finance/supplier-balances/{provider}/adjustments",
    body, { pathParams: { provider }, unavailableMessage: "It couldn't be saved right now. Nothing was recorded." });

export const setWalletThreshold = (provider: string, thresholdMinor: number | null) =>
  gatewayPut("/v1/admin/finance/supplier-balances/{provider}/threshold", { threshold_minor: thresholdMinor }, {
    pathParams: { provider }, unavailableMessage: "The alert level couldn't be saved. Nothing was changed.",
  });

export const fetchWalletHistory = (provider: string, options?: GatewayOptions) =>
  gatewayGet("/v1/admin/finance/supplier-balances/{provider}/history", undefined, {
    ...options, pathParams: { provider }, unavailableMessage: "The history couldn't be loaded.",
  });
