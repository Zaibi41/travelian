import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, CreditCard, RefreshCw, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Link } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { useAdmin } from "@/contexts/AdminStore";
import { listServerBookings } from "@/lib/booking-api";
import type { BookingRecord } from "@/lib/booking-store";
import { formatPkr, getWalletSummary } from "@/lib/wallet-summary";

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

  const refresh = async () => {
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
    void refresh();
  }, []);

  return { bookings, loading, error, refresh };
}

export default function DashboardPage() {
  const { currentRole, currentUser } = useRole();
  const { agencies, walletLedger, walletDeposits } = useAdmin();
  const { bookings, loading, error, refresh } = useLiveDashboardData();
  const isAgency = currentRole === "agency_owner" || currentRole === "agency_staff";
  const agencyId = currentUser.agencyId || "";

  const visibleBookings = useMemo(() => bookings.filter((booking) => {
    if (!isAgency) return true;
    return booking.contact?.email === currentUser.email || (!!agencyId && booking.id.includes(agencyId));
  }), [agencyId, bookings, currentUser.email, isAgency]);

  const walletSummary = useMemo(() => getWalletSummary(agencies, walletLedger, walletDeposits, currentRole, agencyId), [agencies, agencyId, currentRole, walletDeposits, walletLedger]);

  const collected = visibleBookings
    .filter(booking => booking.paymentStatus === "paid" || booking.status === "payment_received" || booking.status === "ticket_issued")
    .reduce((sum, booking) => sum + (booking.pricing?.total || 0), 0);
  const pendingPayments = visibleBookings.filter(booking => booking.paymentStatus !== "paid").length;

  const cards = [
    { title: "Bookings", value: loading || error ? "—" : visibleBookings.length, caption: error ? "Bookings unavailable" : loading ? "Loading bookings" : "All booking records", icon: CalendarCheck, href: "/admin/flight-bookings?tab=all" },
    { title: "Wallet Balance", value: formatPkr(walletSummary.available), caption: walletSummary.pending ? `${formatPkr(walletSummary.pending)} pending` : "Approved ledger balance", icon: Wallet, href: "/admin/wallet" },
    { title: "Payments", value: loading || error ? "—" : formatPkr(collected), caption: error ? "Payments unavailable" : loading ? "Loading payments" : `${pendingPayments} pending payment${pendingPayments === 1 ? "" : "s"}`, icon: CreditCard, href: "/admin/payments" },
  ];

  const liveReport = [
    { name: "Total", count: visibleBookings.length },
    { name: "Ticketed", count: visibleBookings.filter(booking => booking.status === "ticket_issued" || booking.ticketStatus === "issued").length },
    { name: "Cancelled / refund", count: visibleBookings.filter(booking => booking.status === "cancelled").length },
    { name: "Expired", count: visibleBookings.filter(booking => booking.status === "expired").length },
  ];
  const showingDemoReport = !loading && (!!error || visibleBookings.length === 0);
  const report = showingDemoReport ? demoBookingReport : liveReport;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">{isAgency ? "Agency Dashboard" : "Dashboard"}</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, {currentUser.name}. Review bookings, payments, and wallet activity.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link to={card.href} key={card.title}>
            <Card className="h-full shadow-card transition-all hover:-translate-y-0.5 hover:shadow-hover">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <card.icon className="h-5 w-5" />
                  </div>
                  <span className="text-right text-2xl font-bold text-foreground">{card.value}</span>
                </div>
                <p className="mt-4 text-sm font-semibold text-foreground">{card.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{card.caption}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="shadow-card">
        <CardContent className="p-5 md:p-6">
          <div className="mb-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold text-foreground">Booking report</h2>
              {showingDemoReport && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">Demo data</span>}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {showingDemoReport ? "Sample booking figures for preview. These are not live bookings." : "Current booking statuses."} Cancelled / refund includes cancellations and refund actions; completed refunds are not tracked separately.
            </p>
          </div>
          {error && <p role="alert" className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">Live booking data is unavailable. Showing demo report data.</p>}
          {loading ? (
            <p role="status" className="py-12 text-center text-sm text-muted-foreground">Loading booking report…</p>
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
          {!loading && <p className="sr-only">{showingDemoReport ? "Demo data. " : ""}{report.map(item => `${item.name}: ${item.count}`).join(". ")}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
