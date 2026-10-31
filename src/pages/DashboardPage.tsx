import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, ClipboardCheck, Clock3, CreditCard, Ticket, TrendingUp, TriangleAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Link } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { listServerBookings } from "@/lib/booking-api";
import type { BookingRecord } from "@/lib/booking-store";
import { bookingReportPeriods, filterBookingsByPeriod, type BookingReportPeriod } from "@/lib/booking-report-period";
import { formatCompactAmount, formatCompactPkr, getBookingBusinessMetrics, isIssuedTicket } from "@/lib/booking-business-metrics";
import { matchesFlightOperation, type FlightOperationQueue } from "@/lib/flight-operation-queues";
import { INITIAL_PROVIDERS } from "@/lib/provider-systems";

const demoBookingReport = [
  { name: "Total", count: 24 },
  { name: "Ticketed", count: 16 },
  { name: "Cancelled / refund", count: 3 },
  { name: "Expired", count: 2 },
];

function useLiveDashboardData() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBookings = async () => {
    setLoading(true);
    setError("");
    try {
      setBookings(await listServerBookings());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Dashboard records are unavailable");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBookings();
  }, []);

  return { bookings, loading, error };
}

export default function DashboardPage() {
  const { currentRole, currentUser } = useRole();
  const { bookings, loading, error } = useLiveDashboardData();
  const [period, setPeriod] = useState<BookingReportPeriod>("all");
  const [provider, setProvider] = useState("all");
  const isAgency = currentRole === "agency_owner" || currentRole === "agency_staff";
  const agencyId = currentUser.agencyId || "";

  const visibleBookings = useMemo(() => bookings.filter((booking) => {
    if (!isAgency) return true;
    return booking.contact?.email === currentUser.email || (!!agencyId && booking.id.includes(agencyId));
  }), [agencyId, bookings, currentUser.email, isAgency]);
  const providerOptions = useMemo(() => {
    const configured = INITIAL_PROVIDERS
      .filter((item) => item.category === "flight")
      .map((item) => ({ value: item.id.toLowerCase(), label: item.name }));
    const configuredIds = new Set(configured.map((item) => item.value));
    const bookingProviders = visibleBookings
      .map((booking) => String(booking.provider || "").trim())
      .filter(Boolean)
      .filter((value, index, values) => values.findIndex((candidate) => candidate.toLowerCase() === value.toLowerCase()) === index)
      .filter((value) => !configuredIds.has(value.toLowerCase()))
      .map((value) => ({ value: value.toLowerCase(), label: value }));
    return [...configured, ...bookingProviders];
  }, [visibleBookings]);
  const filteredBookings = useMemo(() => {
    if (provider === "all") return visibleBookings;
    return visibleBookings.filter((booking) => String(booking.provider || "").toLowerCase() === provider);
  }, [provider, visibleBookings]);
  const reportBookings = filterBookingsByPeriod(filteredBookings, period);
  const periodLabel = bookingReportPeriods.find(option => option.value === period)?.label || "All";

  const metrics = getBookingBusinessMetrics(reportBookings);
  const cards = [
    { title: "Total Bookings", value: metrics.totalBookings, caption: "Created in selected period", icon: CalendarCheck, href: "/admin/flight-bookings?tab=all" },
    { title: "Issued Tickets", value: metrics.issuedTickets, caption: "Successfully issued flights", icon: Ticket, href: "/admin/flight-bookings?tab=issued" },
    { title: "Total Sales", value: formatCompactPkr(metrics.totalSales ?? 0), caption: "Paid or issued bookings · PKR", icon: TrendingUp, href: "/admin/payments" },
    { title: "Gross Profit", value: formatCompactAmount(metrics.grossProfit ?? 0), caption: "Sales minus supplier cost", icon: null },
  ];

  const attentionCards: { title: string; queue: FlightOperationQueue; caption: string; icon: typeof CalendarCheck }[] = [
    { title: "Pending Approval / Issuance", queue: "approval", caption: "Paid or confirmed; awaiting ticket", icon: ClipboardCheck },
    { title: "Payment Pending", queue: "payment", caption: "Unpaid active flight holds", icon: CreditCard },
    { title: "Failed / Manual Review", queue: "failed", caption: "Expired records and overdue holds", icon: TriangleAlert },
    { title: "Booking Expiring Soon", queue: "expiring", caption: "Active holds ending within 24 hours", icon: Clock3 },
  ];
  const attentionNow = new Date();

  const liveReport = [
    { name: "Total", count: reportBookings.length },
    { name: "Ticketed", count: reportBookings.filter(isIssuedTicket).length },
    { name: "Cancelled / refund", count: reportBookings.filter(booking => booking.status === "cancelled").length },
    { name: "Expired", count: reportBookings.filter(booking => booking.status === "expired").length },
  ];
  const showingDemoReport = !loading && period === "all" && provider === "all" && (!!error || visibleBookings.length === 0);
  const report = showingDemoReport ? demoBookingReport : liveReport;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">{isAgency ? "Agency Dashboard" : "Dashboard"}</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, {currentUser.name}. Review bookings and sales activity.
          </p>
        </div>
        <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto">
          <div className="space-y-1.5">
            <label htmlFor="booking-provider" className="text-xs font-medium text-muted-foreground">Provider</label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger id="booking-provider" className="w-full bg-card sm:w-44" aria-label={provider === "all" ? "Provider, all providers" : undefined}>
                {provider === "all" ? <span className="sr-only">All providers</span> : <SelectValue />}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All providers</SelectItem>
                {providerOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="booking-period" className="text-xs font-medium text-muted-foreground">Booking date</label>
            <Select value={period} onValueChange={value => setPeriod(value as BookingReportPeriod)}>
              <SelectTrigger id="booking-period" className="w-full bg-card sm:w-44" aria-label={period === "all" ? "Booking date, all bookings" : undefined}>
                {period === "all" ? <span className="sr-only">All booking dates</span> : <SelectValue />}
              </SelectTrigger>
              <SelectContent>
                {bookingReportPeriods.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <section aria-labelledby="business-overview" className="space-y-3">
        <h2 id="business-overview" className="text-lg font-semibold text-foreground">
          Business overview
          {period !== "all" && <span className="ml-1 text-sm font-normal text-muted-foreground">· {periodLabel}</span>}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const content = <Card className={`h-full shadow-card ${card.href ? "transition-all hover:-translate-y-0.5 hover:shadow-hover" : ""}`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {card.icon ? <card.icon className="h-5 w-5" aria-hidden="true" /> : <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-current text-[10px] font-bold leading-none">Rs</span>}
                  </div>
                  <span className="min-w-0 break-words text-right text-2xl font-bold text-foreground">{card.value}</span>
                </div>
                <p className="mt-4 text-sm font-semibold text-foreground">{card.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{card.caption}</p>
              </CardContent>
            </Card>;
            return card.href ? <Link to={card.href} key={card.title}>{content}</Link> : <div key={card.title}>{content}</div>;
          })}
        </div>
      </section>

      <section aria-labelledby="requires-attention" className="space-y-3">
        <div>
          <h2 id="requires-attention" className="text-lg font-semibold text-foreground">Requires attention</h2>
          <p className="text-xs text-muted-foreground">Current flight queues across all booking dates.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {attentionCards.map(card => (
            <Link to={`/admin/flight-bookings?tab=${card.queue}`} key={card.queue} className="min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <Card className="h-full border-primary/15 shadow-card transition-colors hover:border-primary/40 hover:bg-primary/[0.02]">
                <CardContent className="flex h-full min-h-32 flex-col justify-between gap-3 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><card.icon aria-hidden="true" className="h-4 w-4" /></span>
                    <span className="text-2xl font-bold text-foreground">{reportBookings.filter(booking => matchesFlightOperation(booking, card.queue, attentionNow)).length}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{card.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{card.caption}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <Card className="shadow-card">
        <CardContent className="p-5 md:p-6">
          <div className="mb-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold text-foreground">Booking report</h2>
              {showingDemoReport && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">Demo data</span>}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {showingDemoReport ? "Sample booking figures for preview. These are not live bookings." : `${periodLabel} booking statuses.`} Cancelled / refund includes cancellations and refund actions; completed refunds are not tracked separately.
            </p>
          </div>
          {loading ? (
            <p role="status" className="py-12 text-center text-sm text-muted-foreground">Loading booking report…</p>
          ) : !showingDemoReport && reportBookings.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No bookings were created in this period.</p>
          ) : (
            <ChartContainer config={{ count: { label: "Bookings", color: "hsl(var(--primary))" } }} className="h-72 w-full aspect-auto">
              <BarChart data={report} margin={{ top: 8, right: 8, left: -20, bottom: 8 }} accessibilityLayer>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval={0} tickFormatter={value => value === "Cancelled / refund" ? "Cancelled" : value} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[5, 5, 0, 0]} maxBarSize={72} isAnimationActive={false} />
              </BarChart>
            </ChartContainer>
          )}
          {!loading && (showingDemoReport || reportBookings.length > 0) && <p className="sr-only">{showingDemoReport ? "Demo data. " : ""}{report.map(item => `${item.name}: ${item.count}`).join(". ")}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
