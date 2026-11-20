/** Browser keys written by retired browser-only screens (#73): the fake Finance → Wallets / Payments data and the
 *  device-only admin announcements. Cleared on load, so nothing stale stays in a browser; the real data will come from
 *  the gateway (#68, #69, and a real announcements feature). */
export const RETIRED_FINANCE_KEYS = ["travelian:wallet-ledger", "travelian:wallet-deposits", "travelian:payment-webhook-events",
  "travelian.admin.announcements.v1"];

export function clearRetiredFinanceData() {
  try {
    for (const key of RETIRED_FINANCE_KEYS) window.localStorage.removeItem(key);
  } catch {
    // storage blocked: nothing to clear
  }
}
