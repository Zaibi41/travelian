import { useState } from "react";
import { mockAgencies, Agency } from "@/data/mock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { Building2, Search, Plus, Wallet, Users, MoreHorizontal } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function AgenciesPage() {
  const [search, setSearch] = useState("");
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);

  const filtered = mockAgencies.filter(a =>
    a.agencyName.toLowerCase().includes(search.toLowerCase()) ||
    a.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Agency Management</h1>
          <p className="text-sm text-muted-foreground">Manage travel agencies and B2B partners</p>
        </div>
        <Button className="gradient-primary text-primary-foreground gap-2">
          <Plus className="h-4 w-4" /> Add Agency
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search agencies..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(agency => (
          <Card key={agency.agencyId} className="shadow-card hover:shadow-elevated transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-display">{agency.agencyName}</CardTitle>
                    <p className="text-xs text-muted-foreground">{agency.city}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSelectedAgency(agency)}>View Details</DropdownMenuItem>
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuItem>{agency.status === 'active' ? 'Suspend' : 'Activate'}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <StatusBadge status={agency.status} />
                <span className="text-xs text-muted-foreground">Commission: {agency.commissionRate}%</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Wallet className="h-3 w-3" />
                  <span>${agency.walletBalance.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>{agency.totalBookings} bookings</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{agency.contactPerson} · {agency.email}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedAgency} onOpenChange={() => setSelectedAgency(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{selectedAgency?.agencyName}</DialogTitle>
          </DialogHeader>
          {selectedAgency && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-muted-foreground text-xs">Status</p><StatusBadge status={selectedAgency.status} /></div>
                <div><p className="text-muted-foreground text-xs">Commission</p><p className="font-medium">{selectedAgency.commissionRate}%</p></div>
                <div><p className="text-muted-foreground text-xs">Wallet Balance</p><p className="font-medium">${selectedAgency.walletBalance.toLocaleString()}</p></div>
                <div><p className="text-muted-foreground text-xs">Total Bookings</p><p className="font-medium">{selectedAgency.totalBookings}</p></div>
                <div><p className="text-muted-foreground text-xs">Contact</p><p className="font-medium">{selectedAgency.contactPerson}</p></div>
                <div><p className="text-muted-foreground text-xs">City</p><p className="font-medium">{selectedAgency.city}</p></div>
              </div>
              <div><p className="text-muted-foreground text-xs">Email</p><p className="font-medium">{selectedAgency.email}</p></div>
              <div><p className="text-muted-foreground text-xs">Phone</p><p className="font-medium">{selectedAgency.phone}</p></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
