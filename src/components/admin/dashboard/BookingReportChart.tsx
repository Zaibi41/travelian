import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBucket } from "@/lib/admin-dashboard/format";
import type { BookingReport } from "@/lib/admin-dashboard/types";

const chartConfig = {
  bookings: { label: "Bookings", color: "hsl(var(--chart-1))" },
  issued: { label: "Issued", color: "hsl(var(--chart-2))" },
};

export function BookingReportChart({ data: report, loading }: { data?: BookingReport; loading: boolean }) {
  const data = report && {
    granularity: report.granularity,
    buckets: report.buckets.map(bucket => ({ ...bucket, label: formatBucket(bucket.start, report.granularity) })),
  };
  const empty = !!data && data.buckets.every(bucket => bucket.bookings === 0 && bucket.issued === 0);
  return (
    <section aria-labelledby="dashboard-report" className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card px-card py-3.5 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <h2 id="dashboard-report" className="text-section font-semibold text-foreground">Booking report</h2>
        <p className="text-label text-muted-foreground">Follows date filter</p>
      </div>

      {loading || !data ? (
        <Skeleton className="h-60 rounded-md" aria-busy="true" aria-label="Loading booking report" />
      ) : empty ? (
        <p className="flex h-40 items-center justify-center text-body text-muted-foreground">No bookings were created in this period.</p>
      ) : (
        <>
          <ChartContainer config={chartConfig} className="aspect-auto h-60 w-full">
            <BarChart data={data.buckets} margin={{ top: 8, right: 4, left: -18, bottom: 0 }} accessibilityLayer>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} minTickGap={16} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} width={40} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="bookings" fill="var(--color-bookings)" radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false} />
              <Bar dataKey="issued" fill="var(--color-issued)" radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false} />
            </BarChart>
          </ChartContainer>
          <ul className="flex flex-wrap gap-4 text-label text-foreground" aria-label="Chart legend">
            <li className="flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-chart-1" />Bookings</li>
            <li className="flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-chart-2" />Issued</li>
          </ul>
          <table className="sr-only">
            <caption>Bookings and issued tickets per {data.granularity}</caption>
            <thead><tr><th scope="col">Period</th><th scope="col">Bookings</th><th scope="col">Issued</th></tr></thead>
            <tbody>{data.buckets.map(bucket => <tr key={bucket.start}><td>{bucket.label}</td><td>{bucket.bookings}</td><td>{bucket.issued}</td></tr>)}</tbody>
          </table>
        </>
      )}
    </section>
  );
}
