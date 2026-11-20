/** Browser keys the old fake Finance → Wallets / Payments screens wrote (#73). Cleared on load, so no fake balance or
 *  ledger stays in a browser; the real data will come from the gateway (#68, #69). */
export const RETIRED_FINANCE_KEYS = ["travelian:wallet-ledger", "travelian:wallet-deposits", "travelian:payment-webhook-events"];

export function clearRetiredFinanceData() {
  try {
    for (const key of RETIRED_FINANCE_KEYS) window.localStorage.removeItem(key);
  } catch {
    // storage blocked: nothing to clear
  }
}
