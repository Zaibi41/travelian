import { useState } from "react";
import { useAdmin } from "@/contexts/AdminStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/StatCard";
import { Wallet, ArrowUpRight, ArrowDownRight, Plus, Building2, Minus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function WalletPage() {
  const { agencies, transactions, addWalletFunds, deductWalletFunds } = useAdmin();
  const [agencyFilter, setAgencyFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'deduct'>('add');
  const [selectedAgencyId, setSelectedAgencyId] = useState('');
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');

  const filtered = agencyFilter === "all" ? transactions : transactions.filter(t => t.agencyId === agencyFilter);
  const totalBalance = agencies.reduce((sum, a) => sum + a.walletBalance, 0);
  const totalCredits = transactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
  const totalDebits = transactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);

  const openDialog = (mode: 'add' | 'deduct') => {
    setDialogMode(mode);
    setSelectedAgencyId(agencies[0]?.agencyId || '');
    setAmount(0);
    setDescription('');
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!selectedAgencyId || !amount || amount <= 0) { toast.error("Select agency and enter valid amount"); return; }
    if (dialogMode === 'add') {
      addWalletFunds(selectedAgencyId, amount, description || 'Manual top-up');
      toast.success(`$${amount.toLocaleString()} added successfully`);
    } else {
      const agency = agencies.find(a => a.agencyId === selectedAgencyId);
      if (agency && amount > agency.walletBalance) { toast.error("Insufficient balance"); return; }
      deductWalletFunds(selectedAgencyId, amount, description || 'Manual deduction');
      toast.success(`$${amount.toLocaleString()} deducted successfully`);
    }
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Wallet System</h1>
          <p className="text-sm text-muted-foreground">Manage agency wallet balances and transactions</p>
        </div>
        <div className="flex gap-2">
          <Button className="gradient-primary text-primary-foreground gap-2" onClick={() => openDialog('add')}>
            <Plus className="h-4 w-4" /> Add Balance
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => openDialog('deduct')}>
            <Minus className="h-4 w-4" /> Deduct
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Balance" value={`$${totalBalance.toLocaleString()}`} icon={Wallet} />
        <StatCard title="Total Credits" value={`$${totalCredits.toLocaleString()}`} icon={ArrowUpRight} />
        <StatCard title="Total Debits" value={`$${totalDebits.toLocaleString()}`} icon={ArrowDownRight} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base font-display">Agency Balances</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {agencies.filter(a => a.status === 'active').map(a => (
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
                {agencies.map(a => (<SelectItem key={a.agencyId} value={a.agencyId}>{a.agencyName}</SelectItem>))}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">{dialogMode === 'add' ? 'Add Wallet Balance' : 'Deduct from Wallet'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Agency</Label>
              <Select value={selectedAgencyId} onValueChange={setSelectedAgencyId}>
                <SelectTrigger><SelectValue placeholder="Select agency" /></SelectTrigger>
                <SelectContent>
                  {agencies.filter(a => a.status === 'active').map(a => (
                    <SelectItem key={a.agencyId} value={a.agencyId}>{a.agencyName} (${a.walletBalance.toLocaleString()})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount ($)</Label>
              <Input type="number" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder={dialogMode === 'add' ? 'e.g. Manual top-up' : 'e.g. Service charge'} />
            </div>
            <Button onClick={handleSubmit} className={`w-full ${dialogMode === 'add' ? 'gradient-primary text-primary-foreground' : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'}`}>
              {dialogMode === 'add' ? 'Add Funds' : 'Deduct Funds'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
