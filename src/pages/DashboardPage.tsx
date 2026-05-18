import { useAdmin } from "@/contexts/AdminStore";
import { useRole } from "@/contexts/RoleContext";
import { CalendarCheck, DollarSign, Building2, Clock, TrendingUp, Users, Wallet, AlertTriangle, Plane, CreditCard } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { dashboardStats, agencyDashboardStats, mockAgencies } from "@/data/mock";

const COLORS = ["hsl(172, 66%, 40%)", "hsl(222, 47%, 30%)", "hsl(40, 90%, 50%)"];

function AdminDashboard() {
  const { bookings, notifications, flightSearchLogs, tickets, agencies, paymentLinks } = useAdmin();

  const totalBookings = bookings.length;
  const totalRevenue = bookings.filter(b => b.status !== 'cancelled').reduce((s, b) => s + b.totalAmount, 0);
  const pendingBookings = bookings.filter(b => b.status === 'pending').length;
  const failedSearches = flightSearchLogs.filter(l => l.status === 'not_found').length;
  const pendingTickets = tickets.filter(t => t.status === 'pending').length;
  const pendingPayments = paymentLinks.filter(pl => pl.status === 'pending').length;
  const unreadNotifications = notifications.filter(n => !n.read).length;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Bookings" value={totalBookings} icon={CalendarCheck} trend={`${pendingBookings} pending`} trendUp />
        <StatCard title="Revenue" value={`$${totalRevenue.toLocaleString()}`} icon={DollarSign} trend="Active bookings" trendUp />
        <StatCard title="Active Agencies" value={agencies.filter(a => a.status === 'active').length} icon={Building2} />
        <StatCard title="Pending Tickets" value={pendingTickets} icon={Clock} />
      </div>

      {/* Alert Cards */}
      {(failedSearches > 0 || pendingPayments > 0 || pendingTickets > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {failedSearches > 0 && (
            <Link to="/admin/flights">
              <Card className="shadow-card border-warning/30 hover:shadow-elevated transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                    <Plane className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{failedSearches} No-Result Searches</p>
                    <p className="text-xs text-muted-foreground">Flights not found, action needed</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
          {pendingPayments > 0 && (
            <Link to="/admin/payments">
              <Card className="shadow-card border-info/30 hover:shadow-elevated transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-info" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{pendingPayments} Pending Payments</p>
                    <p className="text-xs text-muted-foreground">Awaiting customer payment</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
          {unreadNotifications > 0 && (
            <Link to="/admin/notifications">
              <Card className="shadow-card border-destructive/30 hover:shadow-elevated transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{unreadNotifications} Unread Alerts</p>
                    <p className="text-xs text-muted-foreground">Requires attention</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader>
            <CardTitle className="text-base font-display flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dashboardStats.monthlyBookings}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(220, 10%, 46%)' }} />
                <YAxis className="text-xs" tick={{ fill: 'hsl(220, 10%, 46%)' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(220, 13%, 91%)', fontSize: '12px' }} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Bookings by Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={dashboardStats.bookingsByType} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                  {dashboardStats.bookingsByType.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Feed */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-display">Recent Activity</CardTitle>
          <Link to="/admin/notifications"><Button variant="outline" size="sm">View All</Button></Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {notifications.slice(0, 8).map(n => (
              <div key={n.id} className={`flex items-start gap-3 p-2 rounded-lg ${!n.read ? 'bg-primary/5' : ''}`}>
                <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${!n.read ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.message}</p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {new Date(n.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Bookings Table */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-display">Recent Bookings</CardTitle>
          <Link to="/admin/bookings"><Button variant="outline" size="sm">View All</Button></Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">ID</th>
                  <th className="pb-2 font-medium">Customer</th>
                  <th className="pb-2 font-medium">Package</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.slice(0, 5).map((b) => (
                  <tr key={b.bookingId} className="border-b last:border-0">
                    <td className="py-3 font-mono text-xs">{b.bookingId}</td>
                    <td className="py-3">{b.customerName}</td>
                    <td className="py-3">{b.packageName}</td>
                    <td className="py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded ${b.type === 'b2b' ? 'bg-info/10 text-info' : 'bg-accent text-accent-foreground'}`}>{b.type.toUpperCase()}</span></td>
                    <td className="py-3 font-medium">${b.totalAmount.toLocaleString()}</td>
                    <td className="py-3"><StatusBadge status={b.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function AgencyDashboard() {
  const { currentUser } = useRole();
  const { bookings, agencies } = useAdmin();
  const agency = agencies.find(a => a.agencyId === currentUser.agencyId);
  const agencyBookings = bookings.filter(b => b.agencyId === currentUser.agencyId);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Wallet Balance" value={`$${(agency?.walletBalance || 0).toLocaleString()}`} icon={Wallet} />
        <StatCard title="Total Bookings" value={agencyBookings.length} icon={CalendarCheck} trendUp />
        <StatCard title="Commission Earned" value={`$${agencyBookings.reduce((s, b) => s + b.commission, 0).toLocaleString()}`} icon={DollarSign} trendUp />
        <StatCard title="Pending Bookings" value={agencyBookings.filter(b => b.status === 'pending').length} icon={Clock} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base font-display flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Monthly Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={agencyDashboardStats.monthlyBookings}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(220, 10%, 46%)' }} />
                <YAxis className="text-xs" tick={{ fill: 'hsl(220, 10%, 46%)' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(220, 13%, 91%)', fontSize: '12px' }} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base font-display">Agency Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {agency && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-muted-foreground">Agency</p><p className="font-bold font-display">{agency.agencyName}</p></div>
                <div><p className="text-xs text-muted-foreground">Status</p><StatusBadge status={agency.status} /></div>
                <div><p className="text-xs text-muted-foreground">Commission Rate</p><p className="font-bold">{agency.commissionRate}%</p></div>
                <div><p className="text-xs text-muted-foreground">City</p><p className="font-medium">{agency.city}</p></div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base font-display">Recent Bookings</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">ID</th>
                  <th className="pb-2 font-medium">Customer</th>
                  <th className="pb-2 font-medium">Package</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Commission</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {agencyBookings.map((b) => (
                  <tr key={b.bookingId} className="border-b last:border-0">
                    <td className="py-3 font-mono text-xs">{b.bookingId}</td>
                    <td className="py-3">{b.customerName}</td>
                    <td className="py-3">{b.packageName}</td>
                    <td className="py-3 font-medium">${b.totalAmount.toLocaleString()}</td>
                    <td className="py-3 text-success font-medium">${b.commission}</td>
                    <td className="py-3"><StatusBadge status={b.status} /></td>
                  </tr>
                ))}
                {agencyBookings.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No bookings yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export default function DashboardPage() {
  const { currentRole, currentUser } = useRole();
  const isAgency = currentRole === 'agency_owner' || currentRole === 'agency_staff';

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold font-display">
          {isAgency ? 'Agency Dashboard' : 'Dashboard'}
        </h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, {currentUser.name}. {isAgency ? `Managing ${currentUser.agencyName}.` : "Here's your overview."}
        </p>
      </div>
      {isAgency ? <AgencyDashboard /> : <AdminDashboard />}
    </div>
  );
}
