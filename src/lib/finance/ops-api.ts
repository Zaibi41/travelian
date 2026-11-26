// Finance operations (Overview, Supplier Balances, Ticket Sale Entry, Supplier Refunds, Customer Dues, account split,
// and the booking-detail Supplier payment / payment difference / sold-through actions): travelian-api-gateway
// /v1/admin/finance/* and /v1/admin/bookings/{reference}/*. The gateway checks permissions, works out every figure
// (profit, balances, what an entry will do) and enforces the negative-balance block (D52). This file fetches and sends.
import {
  gatewayGet, gatewayPatch, gatewayPost, gatewayPut, type GatewayOptions, type GetQuery, type GetResponse, type PostBody,
} from "@/lib/gateway/client";

export type FinanceOverview = GetResponse<"/v1/admin/finance/overview">;
export type OverviewQuery = NonNullable<GetQuery<"/v1/admin/finance/overview">>;
export type SupplierRow = GetResponse<"/v1/admin/finance/suppliers">["suppliers"][number];
export type SupplierLedger = GetResponse<"/v1/admin/finance/suppliers/{supplier_id}/ledger">;
export type LedgerItem = SupplierLedger["items"][number];
export type SaleRequest = PostBody<"/v1/admin/finance/ticket-sales">;
export type SalePreview = Awaited<ReturnType<typeof previewTicketSale>>;
export type TicketSale = GetResponse<"/v1/admin/finance/ticket-sales">["items"][number];
export type SaleOptions = GetResponse<"/v1/admin/finance/ticket-sales/options">;
export type SupplierRefundList = GetResponse<"/v1/admin/finance/supplier-refunds">;
export type SupplierRefund = SupplierRefundList["items"][number];
export type CustomerDues = GetResponse<"/v1/admin/finance/customer-dues">;
export type FinanceAccounts = GetResponse<"/v1/admin/finance/accounts">;
export type FinanceAccount = FinanceAccounts["business"][number];

const supplier = (supplierId: string, options?: GatewayOptions): GatewayOptions => ({ ...options, pathParams: { supplier_id: supplierId } });
const booking = (reference: string, message: string): GatewayOptions => ({ pathParams: { reference }, unavailableMessage: message });

export const fetchFinanceOverview = (query: OverviewQuery, options?: GatewayOptions) =>
  gatewayGet("/v1/admin/finance/overview", query, { ...options, unavailableMessage: "The Finance overview couldn't be loaded. Try again in a moment." });

// ------------------------------------------------------------------ Supplier Balances
export const fetchSuppliers = (options?: GatewayOptions) =>
  gatewayGet("/v1/admin/finance/suppliers", undefined, { ...options, unavailableMessage: "Supplier balances couldn't be loaded. Try again in a moment." });

export const fetchSupplierLedger = (supplierId: string, options?: GatewayOptions) =>
  gatewayGet("/v1/admin/finance/suppliers/{supplier_id}/ledger", undefined, supplier(supplierId, { ...options, unavailableMessage: "The ledger couldn't be loaded." }));

export const addSupplier = (body: PostBody<"/v1/admin/finance/suppliers">) =>
  gatewayPost("/v1/admin/finance/suppliers", body, { unavailableMessage: "The supplier couldn't be added right now. Nothing was saved." });

export const setSupplierThreshold = (supplierId: string, lowThresholdMinor: number | null) =>
  gatewayPatch("/v1/admin/finance/suppliers/{supplier_id}", { low_threshold_minor: lowThresholdMinor, fields: ["low_threshold_minor"] },
    supplier(supplierId, { unavailableMessage: "The threshold couldn't be saved right now. Nothing was changed." }));

export const setSupplierOpening = (supplierId: string, body: PostBody<"/v1/admin/finance/suppliers/{supplier_id}/opening">) =>
  gatewayPost("/v1/admin/finance/suppliers/{supplier_id}/opening", body,
    supplier(supplierId, { unavailableMessage: "The opening balance couldn't be saved right now. Nothing was saved." }));

export const addSupplierTopUp = (supplierId: string, body: PostBody<"/v1/admin/finance/suppliers/{supplier_id}/top-ups">) =>
  gatewayPost("/v1/admin/finance/suppliers/{supplier_id}/top-ups", body,
    supplier(supplierId, { unavailableMessage: "The top-up couldn't be saved right now. Nothing was saved." }));

// ------------------------------------------------------------------ Ticket Sale Entry
export const fetchSaleOptions = (options?: GatewayOptions) =>
  gatewayGet("/v1/admin/finance/ticket-sales/options", undefined, { ...options, unavailableMessage: "The form's lists couldn't be loaded." });

export const previewTicketSale = (body: SaleRequest, options?: GatewayOptions) =>
  gatewayPost("/v1/admin/finance/ticket-sales/preview", body, { ...options, unavailableMessage: "What this entry will do couldn't be worked out right now." });

export const saveTicketSale = (body: SaleRequest) =>
  gatewayPost("/v1/admin/finance/ticket-sales", body, { unavailableMessage: "The sale couldn't be saved right now. Nothing was saved." });

export const fetchTicketSales = (state?: NonNullable<GetQuery<"/v1/admin/finance/ticket-sales">>["state"], options?: GatewayOptions) =>
  gatewayGet("/v1/admin/finance/ticket-sales", state ? { state } : undefined, { ...options, unavailableMessage: "Ticket sales couldn't be loaded." });

export const confirmTicketSale = (saleId: string) =>
  gatewayPost("/v1/admin/finance/ticket-sales/{sale_id}/confirm", undefined as never,
    { pathParams: { sale_id: saleId }, unavailableMessage: "The sale couldn't be confirmed right now. Nothing was changed." });

export const rejectTicketSale = (saleId: string, reason: string) =>
  gatewayPost("/v1/admin/finance/ticket-sales/{sale_id}/reject", { reason },
    { pathParams: { sale_id: saleId }, unavailableMessage: "The sale couldn't be rejected right now. Nothing was changed." });

// Editing (correcting) and deleting a saved entry: Super Admin only. The gateway refuses anyone else; `can_edit` on the
// list only says whether to show the buttons.
export const previewTicketSaleCorrection = (saleId: string, body: SaleRequest, options?: GatewayOptions) =>
  gatewayPost("/v1/admin/finance/ticket-sales/{sale_id}/correct/preview", body,
    { ...options, pathParams: { sale_id: saleId }, unavailableMessage: "What this edit will do couldn't be worked out right now." });

export const correctTicketSale = (saleId: string, body: PostBody<"/v1/admin/finance/ticket-sales/{sale_id}/correct">) =>
  gatewayPost("/v1/admin/finance/ticket-sales/{sale_id}/correct", body,
    { pathParams: { sale_id: saleId }, unavailableMessage: "The changes couldn't be saved right now. Nothing was changed." });

export const deleteTicketSale = (saleId: string, reason: string) =>
  gatewayPost("/v1/admin/finance/ticket-sales/{sale_id}/delete", { reason },
    { pathParams: { sale_id: saleId }, unavailableMessage: "The entry couldn't be deleted right now. Nothing was changed." });

// ------------------------------------------------------------------ Supplier Refunds, Customer Dues, accounts
export const fetchSupplierRefunds = (query: NonNullable<GetQuery<"/v1/admin/finance/supplier-refunds">>, options?: GatewayOptions) =>
  gatewayGet("/v1/admin/finance/supplier-refunds", query, { ...options, unavailableMessage: "Supplier refunds couldn't be loaded." });

export const openSupplierRefund = (body: PostBody<"/v1/admin/finance/supplier-refunds">) =>
  gatewayPost("/v1/admin/finance/supplier-refunds", body, { unavailableMessage: "The refund couldn't be saved right now. Nothing was saved." });

export const moveSupplierRefund = (refundId: string, body: PostBody<"/v1/admin/finance/supplier-refunds/{refund_id}/status">) =>
  gatewayPost("/v1/admin/finance/supplier-refunds/{refund_id}/status", body,
    { pathParams: { refund_id: refundId }, unavailableMessage: "The status couldn't be changed right now. Nothing was changed." });

export const applySupplierRefund = (refundId: string, body: PostBody<"/v1/admin/finance/supplier-refunds/{refund_id}/apply">) =>
  gatewayPost("/v1/admin/finance/supplier-refunds/{refund_id}/apply", body,
    { pathParams: { refund_id: refundId }, unavailableMessage: "The credit couldn't be applied right now. Nothing was changed." });

export const fetchCustomerDues = (options?: GatewayOptions) =>
  gatewayGet("/v1/admin/finance/customer-dues", undefined, { ...options, unavailableMessage: "Customer dues couldn't be loaded." });

export const fetchFinanceAccounts = (options?: GatewayOptions) =>
  gatewayGet("/v1/admin/finance/accounts", undefined, { ...options, unavailableMessage: "Account balances couldn't be loaded." });

export const updateFinanceAccount = (accountId: string, body: { ownership?: "business" | "personal" | null; opening_balance_minor?: number | null }) =>
  gatewayPatch("/v1/admin/finance/accounts/{account_id}", body,
    { pathParams: { account_id: accountId }, unavailableMessage: "The account couldn't be saved right now. Nothing was changed." });

// ------------------------------------------------------------------ Booking detail (issue #202)
export const setSupplierBillable = (reference: string, body: { billable_minor: number; supplier_id?: string | null; note?: string | null }) =>
  gatewayPut("/v1/admin/bookings/{reference}/supplier-billing", body, booking(reference, "The billable amount couldn't be saved right now. Nothing was changed."));

export const settleSupplierBilling = (reference: string, body: { method: "fresh" | "refund_credit"; refund_id?: string | null }) =>
  gatewayPost("/v1/admin/bookings/{reference}/supplier-billing/settle", body, booking(reference, "The settlement couldn't be saved right now. Nothing was changed."));

export const acceptPaymentShortfall = (reference: string, body: { reason_kind: "discount" | "goodwill" | "channel_rate"; note: string }) =>
  gatewayPost("/v1/admin/bookings/{reference}/payment-shortfall", body, booking(reference, "The difference couldn't be accepted right now. Nothing was changed."));

export const setSoldThrough = (reference: string, soldThrough: string | null) =>
  gatewayPut("/v1/admin/bookings/{reference}/sold-through", { sold_through: soldThrough }, booking(reference, "Sold through couldn't be saved right now."));

export const SHORTFALL_REASONS = [
  { value: "discount", label: "Discount given" },
  { value: "goodwill", label: "Goodwill" },
  { value: "channel_rate", label: "Reseller / channel rate" },
] as const;

export const SUPPLIER_STATUS: Record<SupplierRow["status"], { label: string; severity?: "critical" | "action" | "fine" }> = {
  ok: { label: "OK", severity: "fine" },
  low: { label: "Low", severity: "action" },
  negative: { label: "Negative", severity: "critical" },
  not_set_up: { label: "Not set up" },
};

export const REFUND_STATUS: Record<SupplierRefund["status"], string> = {
  requested: "Requested", chased: "Chased", received: "Received", written_off: "Written off",
};

export const CHANNEL_LABEL: Record<TicketSale["channel"], string> = { direct: "Direct Customer", b2b: "B2B Partner", other: "Other / Sub-agent" };

export const LEDGER_KIND: Record<LedgerItem["kind"], string> = {
  opening: "Opening balance", top_up: "Top-up", adjustment: "Adjustment", refund_credit: "Refund credit", booking_charge: "Booking",
  ticket_sale: "Ticket Sale Entry", ticket_sale_reversal: "Ticket Sale Entry reversed", balance_check: "Balance read",
};

/** "super_admin" → "Super Admin"; "system" for automatic actions. */
export const roleName = (role?: string | null) => (role ? role.replace(/_/g, " ").replace(/\b\w/g, letter => letter.toUpperCase()) : "—");

// ------------------------------------------------------------------ Agency wallets (D3: B2B agencies only)
export type AgencyWalletList = GetResponse<"/v1/admin/finance/agency-wallets">;
export type AgencyWallet = AgencyWalletList["wallets"][number];
export type AgencyWalletStatement = GetResponse<"/v1/admin/finance/agency-wallets/{agency_id}">;

const agency = (agencyId: string, options?: GatewayOptions): GatewayOptions => ({ ...options, pathParams: { agency_id: agencyId } });

export const fetchAgencyWallets = (options?: GatewayOptions) =>
  gatewayGet("/v1/admin/finance/agency-wallets", undefined, { ...options, unavailableMessage: "Agency wallets couldn't be loaded. Try again in a moment." });

export const fetchAgencyWalletStatement = (agencyId: string, options?: GatewayOptions) =>
  gatewayGet("/v1/admin/finance/agency-wallets/{agency_id}", undefined, agency(agencyId, { ...options, unavailableMessage: "The statement couldn't be loaded." }));

export const addAgencyWalletEntry = (agencyId: string, body: PostBody<"/v1/admin/finance/agency-wallets/{agency_id}/entries">) =>
  gatewayPost("/v1/admin/finance/agency-wallets/{agency_id}/entries", body, agency(agencyId, { unavailableMessage: "It couldn't be saved right now. Nothing was saved." }));

export const setAgencyWalletLow = (agencyId: string, lowThresholdMinor: number | null) =>
  gatewayPut("/v1/admin/finance/agency-wallets/{agency_id}/low", { low_threshold_minor: lowThresholdMinor },
    agency(agencyId, { unavailableMessage: "The low-balance level couldn't be saved right now." }));
