import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarCheck, CreditCard, FileText, LifeBuoy, Megaphone, Plane, Receipt, RefreshCw, TimerReset, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { EmptyState } from "@/components/EmptyState";
import { useAdmin } from "@/contexts/AdminStore";
import { listServerBookings } from "@/lib/booking-api";
import { listBookingRequests } from "@/lib/booking-request-api";
import type { BookingRecord } from "@/lib/booking-store";
import type { BookingRequest } from "@/data/models";
import { WhatsAppIcon } from "@/components/public/WhatsAppIcon";
import { whatsappUrl } from "@/lib/site-config";

function formatPkr(amount: number) {
  return `PKR ${Math.max(0, Math.round(amount)).toLocaleString()}`;
}

function useLiveDashboardData() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const [bookingItems, requestItems] = await Promise.all([
        listServerBookings().catch(() => []),
        listBookingRequests().catch(() => []),
      ]);
      setBookings(bookingItems);
      setRequests(requestItems);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Dashboard records are unavailable");
      setBookings([]);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  return { bookings, requests, loading, error, refresh };
}

export default function DashboardPage() {
  const { currentRole, currentUser } = useRole();
  const { agencies, walletLedger, walletDeposits } = useAdmin();
  const { bookings, requests, loading, error, refresh } = useLiveDashboardData();
  const isAgency = currentRole === "agency_owner" || currentRole === "agency_staff";
  const canManageTicketInvoices = ["super_admin", "admin", "agency_owner", "qa", "internal_support"].includes(currentRole);
  const agencyId = currentUser.agencyId || "";

  const visibleBookings = useMemo(() => bookings.filter((booking) => {
    if (!isAgency || !agencyId) return true;
    return booking.contact?.email === currentUser.email || booking.id.includes(agencyId);
  }), [agencyId, bookings, currentUser.email, isAgency]);

  const visibleRequests = useMemo(() => requests.filter((request) => {
    if (!isAgency || !agencyId) return true;
    return request.email === currentUser.email || request.assignedStaff === currentUser.email;
  }), [agencyId, currentUser.email, isAgency, requests]);

  const walletSummary = useMemo(() => {
    const allowedAgencyIds = isAgency && agencyId ? [agencyId] : agencies.filter(agency => agency.status === "active").map(agency => agency.agencyId);
    const credits = walletLedger
      .filter(entry => allowedAgencyIds.includes(entry.agencyId) && entry.type === "credit" && entry.status === "approved")
      .reduce((sum, entry) => sum + entry.amount, 0);
    const debits = walletLedger
      .filter(entry => allowedAgencyIds.includes(entry.agencyId) && entry.type === "debit" && entry.status === "approved")
      .reduce((sum, entry) => sum + entry.amount, 0);
    const pending = walletDeposits
      .filter(deposit => allowedAgencyIds.includes(deposit.agencyId) && deposit.status === "pending")
      .reduce((sum, deposit) => sum + deposit.amount, 0);
    return { available: credits - debits, pending };
  }, [agencies, agencyId, isAgency, walletDeposits, walletLedger]);

  const collected = visibleBookings
    .filter(booking => booking.paymentStatus === "paid" || booking.status === "payment_received" || booking.status === "ticket_issued")
    .reduce((sum, booking) => sum + (booking.pricing?.total || 0), 0);
  const pendingPayments = visibleBookings.filter(booking => booking.paymentStatus !== "paid").length;
  const openRequests = visibleRequests.filter(request => !["confirmed", "cancelled_lost"].includes(request.status)).length;

  const cards = [
    { title: "Bookings", value: visibleBookings.length, caption: loading ? "Loading records" : "Live DB records", icon: CalendarCheck, href: "/admin/flight-bookings?tab=all" },
    { title: "Wallet Balance", value: formatPkr(walletSummary.available), caption: walletSummary.pending ? `${formatPkr(walletSummary.pending)} pending` : "Approved ledger balance", icon: Wallet, href: "/admin/wallet" },
    { title: "Payments", value: formatPkr(collected), caption: `${pendingPayments} pending payment${pendingPayments === 1 ? "" : "s"}`, icon: CreditCard, href: "/admin/payments" },
    { title: "Requests", value: openRequests, caption: "Assisted service queue", icon: Receipt, href: "/admin/requests?tab=all" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Badge className="mb-2 w-fit bg-primary/10 text-primary border-primary/20" variant="outline">
            {isAgency ? "Agency operations" : "Enterprise operations"}
          </Badge>
          <h1 className="text-2xl font-bold font-display">{isAgency ? "Agency Dashboard" : "Dashboard"}</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, {currentUser.name}. Track wallet, bookings, requests, fare validity, and support from one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="gradient-primary text-primary-foreground">
            <Link to="/admin/search?tab=flights">{isAgency ? "Search Flights" : "Flight Booking"}</Link>
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="shadow-card">
          <CardContent className="p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <TimerReset className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-bold text-foreground">Fare revalidation notice</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Airfares and availability can change quickly. Revalidate search results before hold, ticket issue, refund, or reissue.
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" className="rounded-xl">
                <Link to="/admin/search?tab=flights">Search Fresh Fares</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-5">
            <h2 className="font-bold text-foreground">Quick support</h2>
            <p className="mt-1 text-sm text-muted-foreground">Use support channels for ticketing, payments, refunds, hotels, and urgent billing matters.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={whatsappUrl("Hello Travelian, I need help with an admin or agency request.")} target="_blank" rel="noreferrer">
                <Button className="gap-2 rounded-xl bg-[#25D366] text-white hover:bg-[#20bd5a]">
                  <WhatsAppIcon className="h-4 w-4" /> WhatsApp
                </Button>
              </a>
              <Button asChild variant="outline" className="gap-2 rounded-xl">
                <Link to="/admin/customer/support"><LifeBuoy className="h-4 w-4" /> Helpdesk</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {canManageTicketInvoices && (
        <div className="grid gap-4 lg:grid-cols-3">
          <WorkflowCard icon={Plane} title="Search" description="Search one-way, round-trip, multi-city, hotels, packages, visas, and tours." href="/admin/search?tab=flights" action="Open Search" />
          <WorkflowCard icon={Receipt} title="Flight Bookings" description="Use PNR/ticketing records to issue, hold, download, invoice, refund, or reissue tickets." href="/admin/flight-bookings?tab=all" action="Open Bookings" />
          <WorkflowCard icon={FileText} title="Requests" description="Process Umrah, tour, visa, study visa, hotel, and assisted service requests." href="/admin/requests?tab=all" action="Open Requests" />
        </div>
      )}

      <Card className="shadow-card">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground">Announcements</h2>
          </div>
          <EmptyState
            icon={BarChart3}
            title={error ? "Dashboard records are partially unavailable" : "No announcements yet"}
            description={error || "Airline updates, Umrah offers, visa alerts, payment updates, and fare notices will appear here after admin CMS records are added."}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function WorkflowCard({ icon: Icon, title, description, href, action }: { icon: typeof Plane; title: string; description: string; href: string; action: string }) {
  return (
    <Card className="shadow-card">
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-foreground">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <Button asChild variant="outline" className="mt-auto rounded-xl">
          <Link to={href}>{action}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
