import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/admin/ui/button";
import { Card, CardContent } from "@/components/admin/ui/card";
import { EmptyState, LoadingCards, Notice } from "@/components/admin/ui/feedback";
import { FilterSelect } from "@/components/admin/ui/FilterSelect";
import { Tag } from "@/components/admin/ui/StatusBadge";
import { TABLE } from "@/components/admin/ui/classes";
import { NotAvailableNotice } from "@/components/admin/bookings/NotAvailable";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatDateTime, formatMoney } from "@/lib/admin-bookings/format";
import { PAYMENT_METHOD_LABEL } from "@/lib/admin-bookings/payments";
import { DATE_FILTERS, dateFilterFromParam, dateRange } from "@/lib/finance/date-range";
import {
  REPORT_SECTIONS, exportReportCsv, exportReportXlsx, fetchFinanceReport, saveBlob, type FinanceReport, type FinanceReportQuery,
} from "@/lib/finance/api";
import { GatewayError } from "@/lib/gateway/client";
import { cn } from "@/lib/utils";

// Reports (menu 12; travelian#70): sales and profit per day / week / month, profit by booking, receivables, refunds
// due, supplier spend, payments by method and account. Every number comes from the gateway, with the same profit
// formula as the booking and the dashboard. Filters in the URL; Date defaults to All.
const GRANULARITY = [{ value: "day", label: "Day" }, { value: "week", label: "Week" }, { value: "month", label: "Month" }];
const PRODUCTS = [{ value: "all", label: "All" }, { value: "flight", label: "Flights" }, { value: "group", label: "Group Ticketing" },
  { value: "hotel", label: "Hotels" }, { value: "umrah", label: "Umrah" }];
const SECTIONS = [
  { value: "profit_by_booking", label: "Profit by booking" }, { value: "receivables", label: "Receivables" },
  { value: "supplier_spend", label: "Supplier spend" }, { value: "payments_by_method", label: "Payments by method" },
] as const;
type Section = (typeof SECTIONS)[number]["value"];
const chartConfig = { sales: { label: "Sales", color: "hsl(var(--chart-1))" }, profit: { label: "Profit", color: "hsl(var(--chart-2))" } };
const rupees = (minor: number) => Math.round(minor / 100);

export default function ReportsPage() {
  const [params, setParams] = useSearchParams();
  const date = dateFilterFromParam(params.get("date"));
  const granularity = (["day", "week", "month"].includes(params.get("by") ?? "") ? params.get("by") : "day") as "day" | "week" | "month";
  const product = params.get("product") ?? "all";
  const update = (key: string, value: string, fallback: string) => {
    const next = new URLSearchParams(params);
    if (value === fallback) next.delete(key); else next.set(key, value);
    setParams(next, { replace: true });
  };
  const query: FinanceReportQuery = { ...dateRange(date), granularity, product: product === "all" ? undefined : product };
  const report = useQuery({ queryKey: ["finance", "report", query], queryFn: ({ signal }) => fetchFinanceReport(query, { signal }) });
  const forbidden = report.error instanceof GatewayError && report.error.kind === "forbidden";
  const excel = useMutation({
    mutationFn: () => exportReportXlsx(query),
    onSuccess: blob => saveBlob(blob, `travelian-report-${query.date_from ?? "all"}-${query.date_to ?? "all"}.xlsx`),
    onError: error => toast.error(error.message),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-page-title font-bold font-display">Reports</h1>
          <p className="text-body text-muted-foreground">Sales, profit and money owed, for the dates you choose.</p>
        </div>
        {report.data && (
          <Button variant="primary" onClick={() => excel.mutate()} disabled={excel.isPending}>
            <FileSpreadsheet aria-hidden="true" /> {excel.isPending ? "Exporting…" : "Export Excel"}
          </Button>
        )}
      </div>
      {forbidden ? (
        <NotAvailableNotice title="Not available for your role">Finance reports need the Finance permission. A super admin can grant it.</NotAvailableNotice>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <FilterSelect id="report-date" label="Date" value={date} options={[...DATE_FILTERS]} onChange={value => update("date", value, "all")} />
            <FilterSelect id="report-by" label="By" value={granularity} options={GRANULARITY} onChange={value => update("by", value, "day")} />
            <FilterSelect id="report-product" label="Product" value={product} options={PRODUCTS} onChange={value => update("product", value, "all")} />
          </div>
          {report.isPending && <LoadingCards count={4} label="Loading the report" className="grid gap-card-gap sm:grid-cols-2 xl:grid-cols-4" itemClassName="h-24" />}
          {report.error && !forbidden && <Notice tone="critical">{report.error.message}</Notice>}
          {report.data && <Report report={report.data} query={query} />}
        </>
      )}
    </div>
  );
}

function Tile({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "action" | "fine" }) {
  return (
    <div className={cn("rounded-xl border bg-card p-4 shadow-card", tone === "action" && "border-l-4 border-l-status-action", tone === "fine" && "border-l-4 border-l-status-fine")}>
      <p className="text-label text-muted-foreground">{label}</p>
      <p className="text-kpi-sm font-bold tabular-nums">{value}</p>
      {note && <p className="text-label text-muted-foreground">{note}</p>}
    </div>
  );
}

function Report({ report, query }: { report: FinanceReport; query: FinanceReportQuery }) {
  const t = report.totals;
  const [section, setSection] = useState<Section>(report.by_booking ? "profit_by_booking" : "receivables");
  const csv = useMutation({
    mutationFn: (name: (typeof REPORT_SECTIONS)[number]) => exportReportCsv({ ...query, section: name }),
    onSuccess: (blob, name) => saveBlob(blob, `travelian-${name}-${query.date_from ?? "all"}-${query.date_to ?? "all"}.csv`),
    onError: error => toast.error(error.message),
  });
  const notKnown = t.profit_not_known ? `${t.profit_not_known} booking${t.profit_not_known === 1 ? "" : "s"}: profit not known` : undefined;
  const chart = report.periods.map(p => ({ label: p.start, sales: rupees(p.sales.amount_minor), profit: p.profit ? rupees(p.profit.amount_minor) : 0 }));
  const sections = SECTIONS.filter(s => (s.value !== "profit_by_booking" || report.by_booking) && (s.value !== "supplier_spend" || report.supplier_spend));
  return (
    <div className="flex flex-col gap-6">
      <dl className="grid gap-card-gap sm:grid-cols-2 xl:grid-cols-4">
        <Tile label="Sales" value={formatMoney(t.sales)} note={`${t.bookings} booking${t.bookings === 1 ? "" : "s"}${t.fees_charged.amount_minor ? ` · card fees ${formatMoney(t.fees_charged)}` : ""}`} />
        {t.profit && <Tile label="Profit" value={formatMoney(t.profit)} note={notKnown ?? "Selling + fees − supplier charge − payment fees − refunds"} />}
        <Tile label="Receivables" value={formatMoney(report.receivables_total)} note={`${report.receivables.length} booking${report.receivables.length === 1 ? "" : "s"} with money due`}
          tone={report.receivables.length ? "action" : "fine"} />
        <Tile label="Refunds due" value={formatMoney(report.refunds_due)} note={report.refunds_due_count ? `${report.refunds_due_count} to settle` : "None"}
          tone={report.refunds_due_count ? "action" : "fine"} />
      </dl>
      {t.payment_fees_missing > 0 && t.profit && (
        <Notice>{t.payment_fees_missing} card payment{t.payment_fees_missing === 1 ? "" : "s"} have no PayFast fee recorded yet; their profit leaves the fee out until it is recorded.</Notice>
      )}

      <Card className="shadow-card">
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-section-title font-semibold font-display">Sales{t.profit ? " and profit" : ""} by {report.granularity}</h2>
            <Button variant="outline" size="sm" onClick={() => csv.mutate("summary")} disabled={csv.isPending}><Download aria-hidden="true" /> CSV</Button>
          </div>
          {chart.length === 0 ? <EmptyState title="No sales in these dates." /> : (
            <>
              <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
                <BarChart data={chart} margin={{ top: 8, right: 4, left: 8, bottom: 0 }} accessibilityLayer>
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={16} tick={{ className: "text-helper", fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tickLine={false} axisLine={false} width={64} tickFormatter={value => Number(value).toLocaleString("en-PK")}
                    tick={{ className: "text-helper", fill: "hsl(var(--muted-foreground))" }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="sales" fill="var(--color-sales)" radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false} />
                  {t.profit && <Bar dataKey="profit" fill="var(--color-profit)" radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false} />}
                </BarChart>
              </ChartContainer>
              <ul className="flex flex-wrap gap-4 text-label" aria-label="Chart legend">
                <li className="flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-chart-1" />Sales (Rs)</li>
                {t.profit && <li className="flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-chart-2" />Profit (Rs, known only)</li>}
              </ul>
              <PeriodTable report={report} />
            </>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div role="tablist" aria-label="Report sections" className="-mx-1 flex gap-1 overflow-x-auto px-1">
              {sections.map(s => (
                <button key={s.value} type="button" role="tab" aria-selected={section === s.value} onClick={() => setSection(s.value)}
                  className={cn("whitespace-nowrap rounded-md px-3 py-1.5 text-body font-medium", section === s.value ? "bg-accent text-brand-navy" : "text-muted-foreground hover:text-foreground")}>
                  {s.label}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => csv.mutate(section)} disabled={csv.isPending}><Download aria-hidden="true" /> CSV</Button>
          </div>
          {section === "profit_by_booking" && report.by_booking && <ProfitByBooking rows={report.by_booking} />}
          {section === "receivables" && <Receivables rows={report.receivables} />}
          {section === "supplier_spend" && report.supplier_spend && <SupplierSpend rows={report.supplier_spend} />}
          {section === "payments_by_method" && <Methods rows={report.payments_by_method} />}
        </CardContent>
      </Card>
    </div>
  );
}

function SimpleTable({ label, head, rows, empty }: { label: string; head: string[]; rows: React.ReactNode[][]; empty: string }) {
  if (!rows.length) return <EmptyState title={empty} />;
  return (
    <div className={cn(TABLE.wrap, "shadow-none")}>
      <table className={cn(TABLE.table, "min-w-[36rem]")} aria-label={label}>
        <thead><tr className={TABLE.headRow}>{head.map((h, i) => <th key={h} scope="col" className={cn(TABLE.th, i > 0 && /Rs|Amount|Due|Total|Profit|Sales|charge|fees|Payments|Bookings/i.test(h) && "text-right")}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((cells, r) => (
            <tr key={r} className={TABLE.row}>
              {cells.map((cell, c) => <td key={c} className={cn(TABLE.td, c > 0 && typeof cell === "string" && /^-?Rs |^\d+$/.test(cell) && "whitespace-nowrap text-right tabular-nums")}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const money = (value?: { amount_minor: number; currency: string } | null) => (value ? formatMoney(value) : "Not known");
const bookingLink = (reference: string) => <Link to={`/admin/bookings/${encodeURIComponent(reference)}`} className="whitespace-nowrap font-medium text-primary underline-offset-2 hover:underline">{reference}</Link>;

function PeriodTable({ report }: { report: FinanceReport }) {
  const cost = !!report.totals.profit;
  return (
    <SimpleTable label="Sales by period" empty="No sales in these dates."
      head={["Period", "Bookings", "Sales", "Payment fees", "Refunds", ...(cost ? ["Supplier charge", "Profit", "Not known"] : [])]}
      rows={[...report.periods, { ...report.totals, start: "Total" }].map(p => [
        p.start, String(p.bookings), formatMoney(p.sales), formatMoney(p.payment_fees), formatMoney(p.refunds),
        ...(cost ? [money(p.supplier_charge), money(p.profit), String(p.profit_not_known)] : []),
      ])} />
  );
}

const BASIS = { recorded: "Recorded", quoted: "Quoted cost", not_known: "Not known" } as const;

function ProfitByBooking({ rows }: { rows: NonNullable<FinanceReport["by_booking"]> }) {
  return (
    <SimpleTable label="Profit by booking" empty="No sales in these dates."
      head={["Booking", "Made", "Customer", "Sales", "Supplier charge", "Payment fees", "Refunds", "Profit"]}
      rows={rows.map(b => [
        bookingLink(b.booking_reference), formatDateTime(b.created_at), b.customer ?? "—", formatMoney(b.sales),
        <span key="c" className="flex flex-col items-end whitespace-nowrap tabular-nums">{money(b.supplier_charge)}<Tag>{BASIS[b.supplier_charge_basis]}</Tag></span>,
        formatMoney(b.payment_fees), formatMoney(b.refunds), money(b.profit),
      ])} />
  );
}

function Receivables({ rows }: { rows: FinanceReport["receivables"] }) {
  return (
    <SimpleTable label="Receivables" empty="No booking has money still to collect."
      head={["Booking", "Customer", "Status", "Total", "Due", "Hold ends"]}
      rows={rows.map(r => [bookingLink(r.booking_reference), r.customer ?? "—", r.status.replace(/_/g, " "), formatMoney(r.total), formatMoney(r.due),
        r.hold_expires_at ? formatDateTime(r.hold_expires_at) : "—"])} />
  );
}

function SupplierSpend({ rows }: { rows: NonNullable<FinanceReport["supplier_spend"]> }) {
  return (
    <SimpleTable label="Supplier spend" empty="No supplier charges or top-ups in these dates."
      head={["Day", "Supplier", "Ticket charges", "Top-ups"]}
      rows={rows.map(r => [r.day, r.supplier ?? "—", formatMoney(r.ticket_charges), formatMoney(r.top_ups)])} />
  );
}

function Methods({ rows }: { rows: FinanceReport["payments_by_method"] }) {
  return (
    <SimpleTable label="Payments by method" empty="No payments in these dates."
      head={["Method", "Account", "Payments", "Amount", "Card fees"]}
      rows={rows.map(r => [PAYMENT_METHOD_LABEL[r.method as keyof typeof PAYMENT_METHOD_LABEL] ?? r.method, r.account ?? "—", String(r.count),
        formatMoney(r.amount), formatMoney(r.card_fees)])} />
  );
}
