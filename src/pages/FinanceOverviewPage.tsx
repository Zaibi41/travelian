import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ArrowUpCircle, Ticket } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { EmptyState, LoadingCards, Notice, Panel, PanelHeader } from "@/components/admin/ui/feedback";
import { FilterSelect } from "@/components/admin/ui/FilterSelect";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { StatusKpiCard } from "@/components/admin/StatusKpiCard";
import { FinanceForbidden, FinancePageHeader, isForbidden, moneyOrDash } from "@/components/admin/finance/FinanceShared";
import { formatDateTime } from "@/lib/admin-bookings/format";
import { DATE_FILTERS, dateFilterFromParam, dateRange } from "@/lib/finance/date-range";
import { fetchFinanceOverview, roleName } from "@/lib/finance/ops-api";

// Finance overview (D50: the page "Finance" opens). Tiles, the suppliers needing action, a quick way into Ticket Sale
// Entry and the latest top-ups and ticket sales. Filters live in the URL; every figure is the gateway's.
const ALL = "all";

export default function FinanceOverviewPage() {
  const [params, setParams] = useSearchParams();
  const date = dateFilterFromParam(params.get("date"));
  const accountType = params.get("accounts") === "all" ? "all" : "business";
  const supplierId = params.get("supplier") ?? undefined;
  const overview = useQuery({
    queryKey: ["finance", "overview", date, accountType, supplierId ?? ALL],
    queryFn: ({ signal }) => fetchFinanceOverview({ ...dateRange(date), account_type: accountType, supplier_id: supplierId }, { signal }),
  });
  const setParam = (key: string, value: string, fallback: string) =>
    setParams(current => { const next = new URLSearchParams(current); if (value === fallback) next.delete(key); else next.set(key, value); return next; }, { replace: true });
  const data = overview.data;
  const attention = data?.suppliers_attention_count ?? 0;
  return (
    <div className="min-w-0 space-y-6 animate-fade-in">
      <FinancePageHeader title="Finance" description="Supplier balances, bank balances, what customers owe, profit and pending supplier refunds in one place."
        action={!isForbidden(overview.error) && (
          <Button asChild variant="primary"><Link to="/admin/finance/ticket-sales"><Ticket aria-hidden="true" /> New Ticket Sale Entry</Link></Button>
        )} />
      {isForbidden(overview.error) ? <FinanceForbidden /> : (
        <>
          <div role="group" aria-label="Finance filters" className="flex flex-wrap gap-2">
            <FilterSelect id="finance-date" label="Date" value={date} onChange={value => setParam("date", value, ALL)}
              options={DATE_FILTERS.map(option => ({ value: option.value, label: option.label }))} />
            <FilterSelect id="finance-accounts" label="Accounts" value={accountType} onChange={value => setParam("accounts", value, "business")}
              options={[{ value: "business", label: "Business only" }, { value: "all", label: "Business + personal" }]} />
            {!!data?.suppliers.length && (
              <FilterSelect id="finance-supplier" label="Supplier" value={supplierId ?? ALL} onChange={value => setParam("supplier", value, ALL)}
                options={[{ value: ALL, label: "All" }, ...data.suppliers.map(s => ({ value: s.id, label: s.name }))]} />
            )}
          </div>
          {overview.error && <Notice tone="critical">{overview.error.message}</Notice>}
          {overview.isPending && <LoadingCards count={5} label="Loading the Finance overview" className="grid grid-cols-2 gap-card-gap lg:grid-cols-5" itemClassName="h-24" />}
          {data && (
            <div className="grid grid-cols-2 gap-card-gap lg:grid-cols-5">
              {data.total_supplier_balance && (
                <StatusKpiCard size="sm" label="Total Supplier Balance" value={moneyOrDash(data.total_supplier_balance)} to="/admin/finance/supplier-balances"
                  severity={data.suppliers_negative_count ? "critical" : attention ? "action" : "fine"}
                  hint={attention ? `${attention} supplier${attention === 1 ? "" : "s"} ${data.suppliers_negative_count ? "negative or low" : "below threshold"}` : "All suppliers above threshold"} />
              )}
              <StatusKpiCard size="sm" label="Total Bank Balance" value={moneyOrDash(data.total_bank_balance)} to="/admin/finance/accounts-ledgers"
                hint={data.include_personal ? "Business and personal accounts" : "Business accounts only"} />
              <StatusKpiCard size="sm" label="Total Customer Dues" value={moneyOrDash(data.total_customer_dues)} to="/admin/finance/customer-dues"
                hint={`${data.customer_dues_count} open`} />
              {data.total_profit && (
                <StatusKpiCard size="sm" label="Total Profit" value={moneyOrDash(data.total_profit)}
                  hint={data.profit_not_known ? `${data.profit_not_known} booking${data.profit_not_known === 1 ? "" : "s"}: profit not known` : DATE_FILTERS.find(option => option.value === date)?.label} />
              )}
              <StatusKpiCard size="sm" label="Pending Supplier Refunds" value={moneyOrDash(data.pending_refunds_total)} to="/admin/finance/supplier-refunds"
                hint={`${data.pending_refunds_count} open`} />
            </div>
          )}
          {data && data.pending_sales_count > 0 && (
            <Notice tone="action" title={`${data.pending_sales_count} Ticket Sale Entr${data.pending_sales_count === 1 ? "y is" : "ies are"} waiting for Finance`}>
              <Link to="/admin/finance/ticket-sales?state=pending" className="font-medium text-primary underline-offset-2 hover:underline">Review them</Link>
            </Notice>
          )}
          {data && (
            <div className="grid gap-card-gap lg:grid-cols-2">
              {data.total_supplier_balance && (
                <Panel as="section" aria-labelledby="finance-attention" className="flex flex-col gap-3">
                  <PanelHeader id="finance-attention" title="Suppliers needing action" />
                  {data.attention.length === 0 ? <p className="text-body text-muted-foreground">No supplier is negative or below its threshold.</p> : (
                    <ul className="flex flex-col divide-y divide-border">
                      {data.attention.map(item => (
                        <li key={item.supplier_id} className="flex items-center justify-between gap-3 py-2">
                          <span className="min-w-0">
                            <span className="block truncate font-medium" title={item.supplier_name}>{item.supplier_name}</span>
                            <span className="text-label text-muted-foreground">
                              {moneyOrDash(item.current_balance)}{item.low_threshold ? ` · low below ${moneyOrDash(item.low_threshold)}` : ""}
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            <StatusBadge severity={item.status === "negative" ? "critical" : "action"}>{item.status === "negative" ? "Negative" : "Low"}</StatusBadge>
                            <Button asChild size="sm" variant="outline"><Link to="/admin/finance/supplier-balances" aria-label={`Top up ${item.supplier_name}`}>Top up <ArrowRight aria-hidden="true" /></Link></Button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              )}
              <Panel as="section" aria-labelledby="finance-activity" className="flex flex-col gap-3">
                <PanelHeader id="finance-activity" title="Recent activity" />
                {data.activity.length === 0 ? <EmptyState title="No top-ups or ticket sales yet." className="border-0 shadow-none" /> : (
                  <ul className="flex flex-col divide-y divide-border">
                    {data.activity.map((item, index) => (
                      <li key={index} className="flex items-start justify-between gap-3 py-2">
                        <span className="flex min-w-0 items-start gap-2">
                          {item.kind === "top_up" ? <ArrowUpCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-fine" aria-hidden="true" /> : <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
                          <span className="min-w-0">
                            {item.link ? <Link to={item.link} className="block truncate font-medium hover:underline" title={item.title}>{item.title}</Link>
                              : <span className="block truncate font-medium" title={item.title}>{item.title}</span>}
                            <span className="text-label text-muted-foreground">{formatDateTime(item.at)} · {roleName(item.by_role)}</span>
                          </span>
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums">{moneyOrDash(item.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          )}
        </>
      )}
    </div>
  );
}
