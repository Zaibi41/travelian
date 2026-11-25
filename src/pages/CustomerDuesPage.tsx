import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { EmptyState, LoadingCards, Notice } from "@/components/admin/ui/feedback";
import { Tag } from "@/components/admin/ui/StatusBadge";
import { TABLE } from "@/components/admin/ui/classes";
import { StatusKpiCard } from "@/components/admin/StatusKpiCard";
import { FinanceForbidden, FinancePageHeader, isForbidden, moneyOrDash } from "@/components/admin/finance/FinanceShared";
import { fetchCustomerDues } from "@/lib/finance/ops-api";
import { cn } from "@/lib/utils";

// Finance > Customer Dues: what customers still owe, on open bookings (less any accepted payment difference, D57) and on
// confirmed Ticket Sale Entries. Worked out by the gateway; longest outstanding first.
export default function CustomerDuesPage() {
  const dues = useQuery({ queryKey: ["finance", "customer-dues"], queryFn: ({ signal }) => fetchCustomerDues({ signal }) });
  const items = [...(dues.data?.items ?? [])].sort((a, b) => b.days_outstanding - a.days_outstanding);
  return (
    <div className="min-w-0 space-y-6 animate-fade-in">
      <FinancePageHeader title="Customer Dues" description="What customers still owe Travelian, longest outstanding first. A booking leaves this list when it's fully paid or a difference is accepted." />
      {isForbidden(dues.error) ? <FinanceForbidden /> : (
        <>
          {dues.data && (
            <div className="grid grid-cols-2 gap-card-gap sm:max-w-lg">
              <StatusKpiCard size="sm" label="Total due" value={moneyOrDash(dues.data.total_due)} severity={items.length ? "action" : "fine"} showBadge={false} />
              <StatusKpiCard size="sm" label="Customers owing" value={String(items.length)} severity={items.length ? "action" : "fine"} />
            </div>
          )}
          {dues.isPending && <LoadingCards count={3} label="Loading customer dues" itemClassName="h-12" />}
          {dues.error && <Notice tone="critical">{dues.error.message}</Notice>}
          {dues.data && items.length === 0 && <EmptyState title="Nothing is due.">Every booking and ticket sale is paid.</EmptyState>}
          {items.length > 0 && (
            <div className={cn(TABLE.wrap, "relative")}>
              <table className={cn(TABLE.table, "min-w-[48rem]")}>
                <thead>
                  <tr className={TABLE.headRow}>
                    {["Customer", "Reference", "Total", "Received", "Amount due", "Days outstanding", "Paid into"].map(column => (
                      <th key={column} scope="col" className={cn(TABLE.th, ["Total", "Received", "Amount due", "Days outstanding"].includes(column) && "text-right")}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map(due => (
                    <tr key={`${due.kind}-${due.reference}`} className={TABLE.row}>
                      <td className={cn(TABLE.td, "max-w-[14rem] truncate font-medium")} title={due.customer ?? undefined}>{due.customer ?? "—"}</td>
                      <td className={cn(TABLE.td, "whitespace-nowrap")}>
                        {due.kind === "booking"
                          ? <Link to={`/admin/bookings/${encodeURIComponent(due.reference)}`} className="text-primary underline-offset-2 hover:underline">{due.reference}</Link>
                          : <Link to={`/admin/finance/ticket-sales?entry=${encodeURIComponent(due.reference.replace(/^TSE-/, ""))}`} className="text-primary underline-offset-2 hover:underline">
                              Ticket Sale Entry #{due.reference.replace(/^TSE-/, "")}
                            </Link>}
                      </td>
                      <td className={cn(TABLE.td, "whitespace-nowrap text-right tabular-nums")}>{moneyOrDash(due.total)}</td>
                      <td className={cn(TABLE.td, "whitespace-nowrap text-right tabular-nums")}>{moneyOrDash(due.received)}</td>
                      <td className={cn(TABLE.td, "whitespace-nowrap text-right font-semibold tabular-nums")}>{moneyOrDash(due.due)}</td>
                      <td className={cn(TABLE.td, "text-right tabular-nums")}>{due.days_outstanding}</td>
                      <td className={cn(TABLE.td, "max-w-[12rem] truncate")} title={due.payment_account ?? undefined}>
                        {due.payment_account ?? (due.received.amount_minor > 0 ? "—" : <Tag>Not paid</Tag>)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
