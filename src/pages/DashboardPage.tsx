import { CalendarCheck, Building2, DollarSign, Clock, TrendingUp, Users, Wallet, Package, Ticket } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dashboardStats, agencyDashboardStats, mockBookings, mockAgencies } from "@/data/mock";
import { StatusBadge } from "@/components/StatusBadge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useRole } from "@/contexts/RoleContext";

const COLORS = ["hsl(172, 66%, 40%)", "hsl(222, 47%, 30%)"];

function AdminDashboard() {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Bookings" value={dashboardStats.totalBookings} icon={CalendarCheck} trend="12% this month" trendUp />
        <StatCard title="Revenue" value={`$${dashboardStats.totalRevenue.toLocaleString()}`} icon={DollarSign} trend="8% this month" trendUp />
        <StatCard title="Active Agencies" value={dashboardStats.activeAgencies} icon={Building2} trend="1 new this week" trendUp />
        <StatCard title="Pending Approvals" value={dashboardStats.pendingApprovals} icon={Clock} />
      </div>

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
                <Bar dataKey="revenue" fill="hsl(172, 66%, 40%)" radius={[4, 4, 0, 0]} />
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

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base font-display">Recent Bookings</CardTitle>
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
                {mockBookings.slice(0, 5).map((b) => (
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
  const agency = mockAgencies.find(a => a.agencyId === currentUser.agencyId);
  const agencyBookings = mockBookings.filter(b => b.agencyId === currentUser.agencyId);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Wallet Balance" value={`$${(agency?.walletBalance || 0).toLocaleString()}`} icon={Wallet} />
        <StatCard title="Total Bookings" value={agencyDashboardStats.totalBookings} icon={CalendarCheck} trend="5 this month" trendUp />
        <StatCard title="Commission Earned" value={`$${agencyDashboardStats.commissionEarned.toLocaleString()}`} icon={DollarSign} trend="12% this month" trendUp />
        <StatCard title="Pending Bookings" value={agencyDashboardStats.pendingBookings} icon={Clock} />
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
                <Bar dataKey="revenue" fill="hsl(172, 66%, 40%)" radius={[4, 4, 0, 0]} />
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
                <div><p className="text-xs text-muted-foreground">Contact</p><p className="font-medium">{agency.contactPerson}</p></div>
                <div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium text-xs">{agency.email}</p></div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base font-display">Recent Bookings</CardTitle>
        </CardHeader>
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
