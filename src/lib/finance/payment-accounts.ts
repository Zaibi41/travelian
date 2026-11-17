// Finance > Accounts & Ledgers, "Bank and cash book": Travelian's receiving accounts (where customer
// payments arrive). travelian-api-gateway /v1/admin/finance/payment-accounts: Super Admin only (and
// Finance once that role exists); the gateway validates names and refuses other roles with 403.
import { gatewayGet, gatewayPost, type GatewayOptions, type GetResponse } from "@/lib/gateway/client";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL } from "@/lib/admin-bookings/payments";
import type { PaymentMethod } from "@/lib/admin-bookings/types";

export type ReceivingAccount = GetResponse<"/v1/admin/finance/payment-accounts">["accounts"][number];
export { PAYMENT_METHODS, PAYMENT_METHOD_LABEL };
export type { PaymentMethod };

/** Every account, active and inactive. */
export const fetchReceivingAccounts = (options?: GatewayOptions) =>
  gatewayGet("/v1/admin/finance/payment-accounts", undefined, { ...options, unavailableMessage: "The receiving accounts couldn't be loaded." });

export const addReceivingAccount = (method: PaymentMethod, label: string, options?: GatewayOptions) =>
  gatewayPost("/v1/admin/finance/payment-accounts", { method, label }, {
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
