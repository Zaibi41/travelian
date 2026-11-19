// Finance > Accounts & Ledgers, "Bank and cash book": Travelian's receiving accounts (where customer
// payments arrive). travelian-api-gateway /v1/admin/finance/payment-accounts: Super Admin only (and
// Finance once that role exists); the gateway validates names and refuses other roles with 403.
import { gatewayGet, gatewayPatch, gatewayPost, type GatewayOptions, type GetResponse } from "@/lib/gateway/client";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL } from "@/lib/admin-bookings/payments";
import type { PaymentMethod } from "@/lib/admin-bookings/types";

export type ReceivingAccount = GetResponse<"/v1/admin/finance/payment-accounts">["accounts"][number];
export { PAYMENT_METHODS, PAYMENT_METHOD_LABEL };
export type { PaymentMethod };

/** Every account, active and inactive. */
export const fetchReceivingAccounts = (options?: GatewayOptions) =>
  gatewayGet("/v1/admin/finance/payment-accounts", undefined, { ...options, unavailableMessage: "The receiving accounts couldn't be loaded." });

export interface BankDetails {
  bank_name?: string | null;
  account_title?: string | null;
  /** The full account number customers pay into (D40: never masked). */
  account_number?: string | null;
  iban?: string | null;
  qr_asset_key?: string | null;
  /** Edit only: remove the QR image (customers stop seeing it at checkout). */
  remove_qr?: boolean;
}

export const addReceivingAccount = (method: PaymentMethod, label: string, details: BankDetails = {}, options?: GatewayOptions) =>
  gatewayPost("/v1/admin/finance/payment-accounts", { method, label, ...details }, {
    ...options, unavailableMessage: "The account couldn't be saved right now. Nothing was saved.",
  });

export const deactivateReceivingAccount = (accountId: string, options?: GatewayOptions) =>
  gatewayPost("/v1/admin/finance/payment-accounts/{account_id}/deactivate", undefined as never, {
    ...options, pathParams: { account_id: accountId }, unavailableMessage: "The account couldn't be deactivated right now. Nothing was changed.",
  });

/** The method filter from the URL (?method=), or null for All. */
export function methodFromParam(value: string | null): PaymentMethod | null {
  return PAYMENT_METHODS.some(method => method.value === value) ? value as PaymentMethod : null;
}

export const updateReceivingAccount = (accountId: string, details: BankDetails, options?: GatewayOptions) =>
  gatewayPatch("/v1/admin/finance/payment-accounts/{account_id}", { ...details, remove_qr: details.remove_qr ?? false }, {
    ...options, pathParams: { account_id: accountId }, unavailableMessage: "The account couldn't be updated right now. Nothing was changed.",
  });

export const activateReceivingAccount = (accountId: string, options?: GatewayOptions) =>
  gatewayPost("/v1/admin/finance/payment-accounts/{account_id}/activate", undefined as never, {
    ...options, pathParams: { account_id: accountId }, unavailableMessage: "The account couldn't be activated right now. Nothing was changed.",
  });
