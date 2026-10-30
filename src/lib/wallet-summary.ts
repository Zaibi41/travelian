import type { Agency, UserRole, WalletDepositRequest, WalletLedgerEntry } from "@/data/models";

export function getWalletSummary(
  agencies: Agency[],
  ledger: WalletLedgerEntry[],
  deposits: WalletDepositRequest[],
  role: UserRole,
  agencyId?: string,
) {
  const isAgency = role === "agency_owner" || role === "agency_staff";
  const allowedIds = new Set(isAgency
    ? agencyId ? [agencyId] : []
    : agencies.filter(agency => agency.status === "active").map(agency => agency.agencyId));
  const credits = ledger.filter(entry => allowedIds.has(entry.agencyId) && entry.type === "credit" && entry.status === "approved").reduce((sum, entry) => sum + entry.amount, 0);
  const debits = ledger.filter(entry => allowedIds.has(entry.agencyId) && entry.type === "debit" && entry.status === "approved").reduce((sum, entry) => sum + entry.amount, 0);
  const pending = deposits.filter(deposit => allowedIds.has(deposit.agencyId) && deposit.status === "pending").reduce((sum, deposit) => sum + deposit.amount, 0);
  return { available: credits - debits, pending };
}

export function formatPkr(amount: number) {
  return `PKR ${Math.max(0, Math.round(amount)).toLocaleString()}`;
}
