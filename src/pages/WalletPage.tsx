import { FinanceNotBuilt } from "@/components/admin/finance/FinanceNotBuilt";

/** Finance → Wallets. Supplier balances come with #68; until then a notice, never fake numbers (#73). */
export default function WalletPage() {
  return <FinanceNotBuilt title="Wallets" />;
}
