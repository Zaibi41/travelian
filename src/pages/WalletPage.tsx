import { useMemo, useState } from "react";
import { useAdmin } from "@/contexts/AdminStore";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Button } from "@/components/admin/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, ArrowUpRight, ArrowDownRight, Plus, Building2, ShieldCheck, CheckCircle, XCircle, Download, Landmark, CreditCard, Link2, RotateCcw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { Input } from "@/components/admin/ui/field";
import { Label } from "@/components/admin/ui/field";
import { Textarea } from "@/components/admin/ui/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

type DepositMethod = "card" | "1link" | "bank_transfer";
type AdjustmentType = "credit" | "debit";

const formatPkr = (amount: number) => `Rs ${Math.max(0, amount).toLocaleString()}`;

const methodLabels: Record<string, string> = {
  card: "Card",
  "1link": "1Link",
  bank_transfer: "Bank Transfer",
  manual: "Manual",
  booking: "Booking",
  refund: "Refund",
};

export default function WalletPage() {
  const {
    agencies,
    walletLedger,
    walletDeposits,
    createWalletDeposit,
    approveWalletDeposit,
    rejectWalletDeposit,
    manualWalletAdjustment,
  } = useAdmin();
  const { currentRole, currentUser } = useRole();
  const isSuperAdmin = currentRole === "super_admin";
  const isAgencyUser = currentRole === "agency_owner" || currentRole === "agency_staff";
  const roleAgencyId = currentUser.agencyId || "";
  const activeAgencies = agencies.filter(agency => agency.status === "active");
  const [agencyFilter, setAgencyFilter] = useState<string>(isAgencyUser ? roleAgencyId : "all");
  const [depositOpen, setDepositOpen] = useState(false);
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [depositMethod, setDepositMethod] = useState<DepositMethod>("card");
  const [depositAgencyId, setDepositAgencyId] = useState(roleAgencyId || activeAgencies[0]?.agencyId || "");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositReference, setDepositReference] = useState("");
  const [transferDate, setTransferDate] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [depositNotes, setDepositNotes] = useState("");
  const [adjustmentAgencyId, setAdjustmentAgencyId] = useState(activeAgencies[0]?.agencyId || "");
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>("credit");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");

  const visibleAgencyIds = isAgencyUser && roleAgencyId ? [roleAgencyId] : activeAgencies.map(agency => agency.agencyId);
  const visibleLedger = walletLedger.filter(entry => visibleAgencyIds.includes(entry.agencyId));
  const visibleDeposits = walletDeposits.filter(deposit => visibleAgencyIds.includes(deposit.agencyId));
  const filteredLedger = agencyFilter === "all" ? visibleLedger : visibleLedger.filter(entry => entry.agencyId === agencyFilter);
  const pendingDeposits = visibleDeposits.filter(deposit => deposit.status === "pending");

  const summary = useMemo(() => {
    const totalCredits = visibleLedger.filter(entry => entry.type === "credit" && entry.status === "approved").reduce((sum, entry) => sum + entry.amount, 0);
    const totalDebits = visibleLedger.filter(entry => entry.type === "debit" && entry.status === "approved").reduce((sum, entry) => sum + entry.amount, 0);
    const pendingBalance = pendingDeposits.reduce((sum, deposit) => sum + deposit.amount, 0);
    return {
      availableBalance: totalCredits - totalDebits,
      pendingBalance,
      totalCredits,
      totalDebits,
      pendingDeposits: pendingDeposits.length,
    };
  }, [pendingDeposits, visibleLedger]);

  const agencyBalances = activeAgencies
    .filter(agency => !isAgencyUser || agency.agencyId === roleAgencyId)
    .map(agency => {
      const credits = walletLedger.filter(entry => entry.agencyId === agency.agencyId && entry.type === "credit" && entry.status === "approved").reduce((sum, entry) => sum + entry.amount, 0);
      const debits = walletLedger.filter(entry => entry.agencyId === agency.agencyId && entry.type === "debit" && entry.status === "approved").reduce((sum, entry) => sum + entry.amount, 0);
      const pending = walletDeposits.filter(deposit => deposit.agencyId === agency.agencyId && deposit.status === "pending").reduce((sum, deposit) => sum + deposit.amount, 0);
      return { ...agency, availableBalance: credits - debits, pendingBalance: pending };
    });

  const openDeposit = (method: DepositMethod) => {
    setDepositMethod(method);
    setDepositAgencyId(isAgencyUser ? roleAgencyId : activeAgencies[0]?.agencyId || "");
    setDepositAmount("");
    setDepositReference("");
    setTransferDate("");
    setProofUrl("");
    setDepositNotes("");
    setDepositOpen(true);
  };

  const submitDeposit = () => {
    const amount = Number(depositAmount);
    if (!depositAgencyId || !amount || amount <= 0) return toast.error("Select agency and enter a valid Rs amount");
    if (depositMethod === "bank_transfer" && !depositReference.trim()) return toast.error("Bank transfer reference is required");
    const deposit = createWalletDeposit({
      agencyId: depositAgencyId,
      amount,
      method: depositMethod,
      reference: depositReference,
      transferDate,
      proofUrl,
      notes: depositNotes,
      requestedBy: currentUser.email,
    });
    if (!deposit) return toast.error("Unable to create deposit request");
    if (deposit.status === "approved") toast.success(`${methodLabels[depositMethod]} deposit credited automatically`);
    if (deposit.status === "pending") toast.success("Bank transfer submitted for Super Admin verification");
    if (deposit.status === "cancelled") toast.error("Duplicate payment reference ignored");
    setDepositOpen(false);
  };

  const submitAdjustment = () => {
    const amount = Number(adjustmentAmount);
    if (!isSuperAdmin) return toast.error("Only Super Admin can create manual wallet adjustments");
    if (!adjustmentAgencyId || !amount || amount <= 0 || !adjustmentReason.trim()) return toast.error("Agency, amount and reason are required");
    const ok = manualWalletAdjustment({
      agencyId: adjustmentAgencyId,
      type: adjustmentType,
      amount,
      reason: adjustmentReason,
      createdBy: currentUser.email,
    });
    if (!ok) return toast.error("Adjustment failed. Check balance and required reason.");
    toast.success("Manual ledger adjustment posted");
    setAdjustmentOpen(false);
  };

  const exportCsv = () => {
    const rows = [
      ["Date", "Agency", "Type", "Method", "Status", "Reference", "Amount", "Balance After", "Description"],
      ...filteredLedger.map(entry => [
        entry.createdAt,
        entry.agencyName,
        entry.type,
        methodLabels[entry.method] || entry.method,
        entry.status,
        entry.reference,
        String(entry.amount),
        String(entry.balanceAfter),
        entry.description,
      ]),
    ];
    const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `travelian-wallet-ledger-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-page-title font-bold font-display">Wallet Ledger</h1>
          <p className="text-body text-muted-foreground">Agency wallet deposits, approvals and immutable Rs ledger activity</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="gradient-primary text-primary-foreground gap-2" onClick={() => openDeposit("card")}><CreditCard className="h-4 w-4" /> Card Deposit</Button>
          <Button variant="outline" className="gap-2" onClick={() => openDeposit("1link")}><Link2 className="h-4 w-4" /> 1Link</Button>
          <Button variant="outline" className="gap-2" onClick={() => openDeposit("bank_transfer")}><Landmark className="h-4 w-4" /> Bank Transfer</Button>
          {isSuperAdmin && <Button variant="outline" className="gap-2" onClick={() => setAdjustmentOpen(true)}><RotateCcw className="h-4 w-4" /> Manual Adjustment</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <Metric title="Available Balance" value={formatPkr(summary.availableBalance)} icon={Wallet} />
        <Metric title="Pending Balance" value={formatPkr(summary.pendingBalance)} icon={ShieldCheck} />
        <Metric title="Total Credits" value={formatPkr(summary.totalCredits)} icon={ArrowUpRight} />
        <Metric title="Total Debits" value={formatPkr(summary.totalDebits)} icon={ArrowDownRight} />
        <Metric title="Pending Deposits" value={summary.pendingDeposits.toString()} icon={Landmark} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-body font-display">Agency Balances</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {agencyBalances.length === 0 && <p className="py-6 text-center text-body text-muted-foreground">No active agency wallets are available.</p>}
            {agencyBalances.map(agency => (
              <div key={agency.agencyId} className="rounded-xl border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent"><Building2 className="h-4 w-4 text-primary" /></div>
                    <div>
                      <p className="text-body font-semibold">{agency.agencyName}</p>
                      <p className="text-helper text-muted-foreground">{agency.city}</p>
                    </div>
                  </div>
                  <p className="text-body font-bold text-primary">{formatPkr(agency.availableBalance)}</p>
                </div>
                {agency.pendingBalance > 0 && <p className="mt-2 text-helper text-amber-600">Pending verification: {formatPkr(agency.pendingBalance)}</p>}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-card lg:col-span-2">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-body font-display">Pending Deposit Queue</CardTitle>
            <Badge variant="secondary">{pendingDeposits.length} pending</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingDeposits.length === 0 && <p className="py-8 text-center text-body text-muted-foreground">No pending bank transfer deposits.</p>}
            {pendingDeposits.map(deposit => (
              <div key={deposit.depositId} className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold">{deposit.agencyName} · {formatPkr(deposit.amount)}</p>
                  <p className="text-body text-muted-foreground">Reference: {deposit.reference} · {deposit.transferDate || "Transfer date not set"}</p>
                  {deposit.proofUrl && <p className="text-helper text-muted-foreground">Proof: {deposit.proofUrl}</p>}
                </div>
                {isSuperAdmin && (
                  <div className="flex gap-2">
                    <Button size="sm" className="gap-2" onClick={() => { approveWalletDeposit(deposit.depositId, currentUser.email); toast.success("Bank transfer approved and credited"); }}><CheckCircle className="h-4 w-4" /> Approve</Button>
                    <Button size="sm" variant="destructive" className="gap-2" onClick={() => { rejectWalletDeposit(deposit.depositId, currentUser.email, "Rejected by Super Admin"); toast.success("Bank transfer rejected"); }}><XCircle className="h-4 w-4" /> Reject</Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-body font-display">Transaction Ledger</CardTitle>
          <div className="flex flex-wrap gap-2">
            {!isAgencyUser && (
              <Select value={agencyFilter} onValueChange={setAgencyFilter}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filter agency" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agencies</SelectItem>
                  {activeAgencies.map(a => <SelectItem key={a.agencyId} value={a.agencyId}>{a.agencyName}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" className="gap-2" onClick={exportCsv}><Download className="h-4 w-4" /> Export CSV</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredLedger.length === 0 && <p className="py-8 text-center text-body text-muted-foreground">No approved ledger entries yet.</p>}
          {filteredLedger.map(entry => (
            <div key={entry.ledgerId} className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full ${entry.type === "credit" ? "bg-success/10" : "bg-destructive/10"}`}>
                  {entry.type === "credit" ? <ArrowUpRight className="h-4 w-4 text-success" /> : <ArrowDownRight className="h-4 w-4 text-destructive" />}
                </div>
                <div>
                  <p className="font-semibold">{entry.description}</p>
                  <p className="text-helper text-muted-foreground">{entry.agencyName} · {new Date(entry.createdAt).toLocaleString()} · {methodLabels[entry.method] || entry.method} · {entry.reference}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold ${entry.type === "credit" ? "text-success" : "text-destructive"}`}>{entry.type === "credit" ? "+" : "-"}{formatPkr(entry.amount)}</p>
                <p className="text-helper text-muted-foreground">Balance: {formatPkr(entry.balanceAfter)}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="font-display">Deposit Wallet Balance</DialogTitle></DialogHeader>
          <Tabs value={depositMethod} onValueChange={(value) => setDepositMethod(value as DepositMethod)}>
            <TabsList className="grid w-full grid-cols-3"><TabsTrigger value="card">Card</TabsTrigger><TabsTrigger value="1link">1Link</TabsTrigger><TabsTrigger value="bank_transfer">Bank Transfer</TabsTrigger></TabsList>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {!isAgencyUser && (
                <div className="space-y-2 md:col-span-2">
                  <Label>Agency</Label>
                  <Select value={depositAgencyId} onValueChange={setDepositAgencyId}>
                    <SelectTrigger><SelectValue placeholder="Select agency" /></SelectTrigger>
                    <SelectContent>{activeAgencies.map(a => <SelectItem key={a.agencyId} value={a.agencyId}>{a.agencyName}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2"><Label>Amount (Rs)</Label><Input type="number" value={depositAmount} onChange={event => setDepositAmount(event.target.value)} /></div>
              <div className="space-y-2"><Label>Reference</Label><Input value={depositReference} onChange={event => setDepositReference(event.target.value)} placeholder={depositMethod === "bank_transfer" ? "Bank transaction ID" : "Auto generated if blank"} /></div>
            </div>
            <TabsContent value="card" className="mt-4 rounded-xl border p-4 text-body text-muted-foreground">Card payments are treated as confirmed payment callbacks in this v1 UI and automatically credit the ledger once submitted.</TabsContent>
            <TabsContent value="1link" className="mt-4 rounded-xl border p-4 text-body text-muted-foreground">1Link payments generate a provider reference and automatically credit after the simulated success callback.</TabsContent>
            <TabsContent value="bank_transfer" className="mt-4 space-y-4">
              <div className="rounded-xl border bg-muted/40 p-4 text-body">
                <p className="font-semibold text-foreground">Travelian bank transfer</p>
                <p className="text-muted-foreground">Transfer to the owner/business account configured by finance, then submit the transaction reference for Super Admin verification.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>Transfer date</Label><Input type="date" value={transferDate} onChange={event => setTransferDate(event.target.value)} /></div>
                <div className="space-y-2"><Label>Proof URL / file path</Label><Input value={proofUrl} onChange={event => setProofUrl(event.target.value)} placeholder="Receipt URL or uploaded proof path" /></div>
              </div>
            </TabsContent>
          </Tabs>
          <div className="space-y-2"><Label>Notes</Label><Textarea rows={3} value={depositNotes} onChange={event => setDepositNotes(event.target.value)} placeholder="Optional note for finance/admin" /></div>
          <Button onClick={submitDeposit} className="w-full gradient-primary text-primary-foreground">{depositMethod === "bank_transfer" ? "Submit for Verification" : "Pay and Credit Wallet"}</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={adjustmentOpen} onOpenChange={setAdjustmentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-display">Super Admin Manual Adjustment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Agency</Label><Select value={adjustmentAgencyId} onValueChange={setAdjustmentAgencyId}><SelectTrigger><SelectValue placeholder="Select agency" /></SelectTrigger><SelectContent>{activeAgencies.map(a => <SelectItem key={a.agencyId} value={a.agencyId}>{a.agencyName}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Type</Label><Select value={adjustmentType} onValueChange={(value) => setAdjustmentType(value as AdjustmentType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="credit">Credit</SelectItem><SelectItem value="debit">Debit</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Amount (Rs)</Label><Input type="number" value={adjustmentAmount} onChange={event => setAdjustmentAmount(event.target.value)} /></div>
            <div className="space-y-2"><Label>Reason</Label><Textarea rows={3} value={adjustmentReason} onChange={event => setAdjustmentReason(event.target.value)} placeholder="Required audit reason" /></div>
            <Button onClick={submitAdjustment} className="w-full gradient-primary text-primary-foreground">Post Ledger Entry</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ title, value, icon: Icon }: { title: string; value: string; icon: typeof Wallet }) {
  return (
    <Card className="shadow-card">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-body text-muted-foreground">{title}</p>
            <p className="mt-1 text-kpi font-bold font-display">{value}</p>
          </div>
          <div className="rounded-lg bg-accent p-2.5"><Icon className="h-5 w-5 text-primary" /></div>
        </div>
      </CardContent>
    </Card>
  );
}
