import { useState } from "react";
import { mockTransactions, mockAgencies } from "@/data/mock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/StatCard";
import { Wallet, ArrowUpRight, ArrowDownRight, Plus, Building2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function WalletPage() {
  const [agencyFilter, setAgencyFilter] = useState<string>("all");

  const filtered = agencyFilter === "all"
    ? mockTransactions
    : mockTransactions.filter(t => t.agencyId === agencyFilter);

  const totalBalance = mockAgencies.reduce((sum, a) => sum + a.walletBalance, 0);
  const totalCredits = mockTransactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
  const totalDebits = mockTransactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Wallet System</h1>
          <p className="text-sm text-muted-foreground">Manage agency wallet balances and transactions</p>
        </div>
        <Button className="gradient-primary text-primary-foreground gap-2">
          <Plus className="h-4 w-4" /> Add Balance
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Balance" value={`$${totalBalance.toLocaleString()}`} icon={Wallet} />
        <StatCard title="Total Credits" value={`$${totalCredits.toLocaleString()}`} icon={ArrowUpRight} />
        <StatCard title="Total Debits" value={`$${totalDebits.toLocaleString()}`} icon={ArrowDownRight} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base font-display">Agency Balances</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockAgencies.filter(a => a.status === 'active').map(a => (
              <div key={a.agencyId} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded bg-accent flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{a.agencyName}</p>
                    <p className="text-xs text-muted-foreground">{a.city}</p>
                  </div>
                </div>
                <p className="text-sm font-bold font-display">${a.walletBalance.toLocaleString()}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-display">Transaction History</CardTitle>
            <Select value={agencyFilter} onValueChange={setAgencyFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter agency" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agencies</SelectItem>
                {mockAgencies.map(a => (
                  <SelectItem key={a.agencyId} value={a.agencyId}>{a.agencyName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filtered.map(t => (
                <div key={t.transactionId} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${t.type === 'credit' ? 'bg-success/10' : 'bg-destructive/10'}`}>
                      {t.type === 'credit' ? <ArrowUpRight className="h-4 w-4 text-success" /> : <ArrowDownRight className="h-4 w-4 text-destructive" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t.description}</p>
                      <p className="text-xs text-muted-foreground">{t.agencyName} · {t.createdAt}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${t.type === 'credit' ? 'text-success' : 'text-destructive'}`}>
                      {t.type === 'credit' ? '+' : '-'}${t.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Bal: ${t.balanceAfter.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
