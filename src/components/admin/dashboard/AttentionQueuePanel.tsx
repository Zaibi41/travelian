import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatDue } from "@/lib/admin-dashboard/format";
import { ATTENTION_QUEUE_PLACEHOLDER, attentionRowHref } from "@/lib/admin-dashboard/links";
import type { AttentionItem, AttentionQueue } from "@/lib/admin-dashboard/types";

const TYPE_LABEL: Record<AttentionItem["type"], string> = {
  pending_issuance: "Pending issuance",
  payment_pending: "Payment pending",
  hold_expiring: "Hold expiring",
};

// Owner column is hidden: no case ownership is recorded yet (docs/backend-todo.md).
export function AttentionQueuePanel({ data, loading }: { data?: AttentionQueue; loading: boolean }) {
  return (
    <section aria-labelledby="dashboard-attention" className="flex min-w-0 flex-col gap-2.5 rounded-lg border border-border bg-card px-card py-3.5 shadow-card">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="dashboard-attention" className="text-section font-semibold text-foreground">Attention Queue</h2>
        <Link to={ATTENTION_QUEUE_PLACEHOLDER} className="shrink-0 rounded-sm text-body font-medium text-teal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          View all
        </Link>
      </div>

      {loading || !data ? (
        <div className="flex flex-col gap-1.5" aria-busy="true" aria-label="Loading attention queue">
          {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-table-row rounded-sm" />)}
        </div>
      ) : data.items.length === 0 ? (
        <div className="flex items-center gap-2 py-2 text-body text-muted-foreground">
          <StatusBadge severity="fine" />
          <span>Nothing is waiting in the queue.</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[26rem] border-collapse text-table">
            <thead>
              <tr className="bg-muted text-left">
                <th scope="col" className="h-table-header px-2.5 font-semibold text-foreground">Type</th>
                <th scope="col" className="h-table-header px-2.5 font-semibold text-foreground">Reference</th>
                <th scope="col" className="h-table-header px-2.5 font-semibold text-foreground">Due</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map(item => (
                <tr key={item.booking_id} className="border-b border-border last:border-b-0">
                  <td className="h-table-row px-2.5 py-1"><StatusBadge severity="action">{TYPE_LABEL[item.type]}</StatusBadge></td>
                  <td className="h-table-row max-w-[14rem] px-2.5 py-1">
                    <Link to={attentionRowHref(item)} title={item.reference} className="block truncate font-semibold text-foreground hover:text-teal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      {item.reference}
                    </Link>
                  </td>
                  <td className="h-table-row whitespace-nowrap px-2.5 py-1 tabular-nums text-foreground">{formatDue(item.due_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
