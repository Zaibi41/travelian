import { useState } from "react";
import { mockBookings } from "@/data/mock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { Search, Plus, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function BookingsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = mockBookings.filter(b => {
    const matchSearch = b.customerName.toLowerCase().includes(search.toLowerCase()) || b.bookingId.includes(search);
    const matchType = typeFilter === "all" || b.type === typeFilter;
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Bookings</h1>
          <p className="text-sm text-muted-foreground">Track all B2C and B2B bookings</p>
        </div>
        <Button className="gradient-primary text-primary-foreground gap-2">
          <Plus className="h-4 w-4" /> New Booking
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search bookings..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="b2c">B2C</SelectItem>
            <SelectItem value="b2b">B2B</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground bg-muted/50">
                  <th className="p-3 font-medium">Booking ID</th>
                  <th className="p-3 font-medium">Customer</th>
                  <th className="p-3 font-medium">Package</th>
                  <th className="p-3 font-medium">Type</th>
                  <th className="p-3 font-medium">Agency</th>
                  <th className="p-3 font-medium">Amount</th>
                  <th className="p-3 font-medium">Commission</th>
                  <th className="p-3 font-medium">Departure</th>
                  <th className="p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => (
                  <tr key={b.bookingId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono text-xs">{b.bookingId}</td>
                    <td className="p-3">
                      <p className="font-medium">{b.customerName}</p>
                      <p className="text-xs text-muted-foreground">{b.customerEmail}</p>
                    </td>
                    <td className="p-3">{b.packageName}</td>
                    <td className="p-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${b.type === 'b2b' ? 'bg-info/10 text-info' : 'bg-accent text-accent-foreground'}`}>
                        {b.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">{b.agencyName || '—'}</td>
                    <td className="p-3 font-medium">${b.totalAmount.toLocaleString()}</td>
                    <td className="p-3">{b.commission > 0 ? `$${b.commission}` : '—'}</td>
                    <td className="p-3 text-muted-foreground">{b.departureDate}</td>
                    <td className="p-3"><StatusBadge status={b.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No bookings found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
