import { Link } from "react-router-dom";
import { ClipboardCheck } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { Notice } from "@/components/admin/ui/feedback";

/** Finance → Wallets and Finance → Payments until the gateway serves them (#73). They ran on fake data kept in the
 *  browser; nothing here shows a number. Supplier balances: #68. All payments: #69. */
export function FinanceNotBuilt({ title }: { title: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-section-gap">
      <h1 className="font-display text-page-title font-bold text-foreground">{title}</h1>
      <Notice title="Not built yet." className="max-w-2xl">
        <ul className="flex flex-col gap-0.5">
          <li>Supplier balances: see #68</li>
          <li>All payments: see #69</li>
          <li>Each booking's Payments tab shows real payments.</li>
        </ul>
        <Button asChild className="mt-3 w-full gap-2 sm:w-auto">
          <Link to="/admin/bookings"><ClipboardCheck aria-hidden="true" className="h-4 w-4" />Go to Bookings</Link>
        </Button>
      </Notice>
    </div>
  );
}
