import { useState } from "react";
import { useAdmin, PaymentLink } from "@/contexts/AdminStore";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/StatCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { CreditCard, Wallet, Building2, Link2, Plus, Copy, CheckCircle, DollarSign, ShieldCheck, Send } from "lucide-react";

function formatPkr(amount: number) {
  return `PKR ${Math.max(0, Math.round(amount)).toLocaleString()}`;
}

export default function PaymentsPage() {
  const { currentRole } = useRole();
  const {
    paymentLinks, paymentConfig, bookings,
    addPaymentLink, updatePaymentLink, updatePaymentConfig,
  } = useAdmin();

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkForm, setLinkForm] = useState({ bookingId: "", customerName: "", customerEmail: "", amount: 0 });
  const [tab, setTab] = useState<"all" | "card" | "1link" | "bank" | "failed" | "config">("all");

  const canEdit = currentRole === "super_admin" || currentRole === "admin";

  const totalPaid = paymentLinks.filter(pl => pl.status === "paid").reduce((s, pl) => s + pl.amount, 0);
  const totalPending = paymentLinks.filter(pl => pl.status === "pending").reduce((s, pl) => s + pl.amount, 0);

  const handleCreateLink = () => {
    if (!linkForm.customerName || !linkForm.amount) {
      toast.error("Customer name and amount required");
      return;
    }
    const id = `pl${Date.now()}`;
    const newLink: PaymentLink = {
      id,
      bookingId: linkForm.bookingId,
      customerName: linkForm.customerName,
      customerEmail: linkForm.customerEmail,
      amount: linkForm.amount,
      status: "pending",
      createdAt: new Date().toISOString().split("T")[0],
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      link: `https://pay.travelian.pk/${id}`,
    };
    addPaymentLink(newLink);
    toast.success("Payment link created");
    setLinkDialogOpen(false);
    setLinkForm({ bookingId: "", customerName: "", customerEmail: "", amount: 0 });
  };

  const markAsPaid = (id: string) => {
    updatePaymentLink(id, { status: "paid", paymentMethod: "manual" });
    toast.success("Payment marked as received");
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success("Link copied to clipboard");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Payment Management</h1>
          <p className="text-sm text-muted-foreground">Manage payment links, gateway switches, bank transfer status, and payment follow-up.</p>
        </div>
        {canEdit && (
          <Button onClick={() => setLinkDialogOpen(true)} className="gradient-primary text-primary-foreground gap-2">
            <Plus className="h-4 w-4" /> Generate Payment Link
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Total Collected" value={formatPkr(totalPaid)} icon={DollarSign} trend="This month" trendUp />
        <StatCard title="Pending Payments" value={formatPkr(totalPending)} icon={CreditCard} />
        <StatCard title="Payment Links" value={paymentLinks.length} icon={Link2} />
      </div>

      <div className="flex gap-2 border-b">
        <button onClick={() => setTab("links")} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "links" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          Payment Links
        </button>
        {canEdit && (
          <button onClick={() => setTab("config")} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "config" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            Payment Configuration
          </button>
        )}
      </div>

      {tab === "links" && (
        <div className="space-y-3">
          {paymentLinks.map(pl => (
            <Card key={pl.id} className="shadow-card">
              <CardContent className="p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${pl.status === "paid" ? "bg-success/10" : pl.status === "expired" ? "bg-destructive/10" : "bg-warning/10"}`}>
                      {pl.status === "paid" ? <CheckCircle className="h-5 w-5 text-success" /> : <CreditCard className="h-5 w-5 text-warning" />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{pl.customerName}</p>
                      <p className="text-xs text-muted-foreground">{pl.customerEmail || "No email"} - Booking #{pl.bookingId || "manual"}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Created: {pl.createdAt} - Expires: {pl.expiresAt}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-bold font-display text-primary">{formatPkr(pl.amount)}</p>
                      <StatusBadge status={pl.status} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => copyLink(pl.link)}>
                        <Copy className="h-3 w-3" /> Copy Link
                      </Button>
                      {pl.status === "pending" && canEdit && (
                        <Button variant="outline" size="sm" className="gap-1 text-xs text-success" onClick={() => markAsPaid(pl.id)}>
                          <CheckCircle className="h-3 w-3" /> Mark Paid
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                {pl.status === "paid" && pl.paymentMethod && (
                  <div className="mt-2 flex items-center gap-2 border-t pt-2">
                    <ShieldCheck className="h-3 w-3 text-success" />
                    <span className="text-xs font-medium text-success">Paid via {pl.paymentMethod.toUpperCase()}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {paymentLinks.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">No payment links created yet</p>
          )}
        </div>
      )}

      {tab === "config" && canEdit && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base font-display">Payment Methods</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <MethodToggle label="Visa" description="Accept Visa cards" checked={paymentConfig.visaEnabled} onChange={v => updatePaymentConfig({ visaEnabled: v })} />
              <Separator />
              <MethodToggle label="MasterCard" description="Accept MasterCard" checked={paymentConfig.mastercardEnabled} onChange={v => updatePaymentConfig({ mastercardEnabled: v })} />
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-primary" />
                  <div><p className="text-sm font-medium">Wallet</p><p className="text-xs text-muted-foreground">Agency wallet payments</p></div>
                </div>
                <Switch checked={paymentConfig.walletEnabled} onCheckedChange={v => updatePaymentConfig({ walletEnabled: v })} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-primary" />
                  <div><p className="text-sm font-medium">Bank Transfer</p><p className="text-xs text-muted-foreground">Direct bank transfers</p></div>
                </div>
                <Switch checked={paymentConfig.bankTransferEnabled} onCheckedChange={v => updatePaymentConfig({ bankTransferEnabled: v })} />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base font-display">Payment Security</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-accent/50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-success" />
                  <span className="text-sm font-semibold">Secure Payment Processing</span>
                </div>
                <p className="text-xs text-muted-foreground">Enable payment methods only after the configured provider has been verified for production use.</p>
              </div>
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium">Test Mode</p><p className="text-xs text-muted-foreground">Use sandbox environment</p></div>
                <Switch checked={paymentConfig.testMode} onCheckedChange={v => updatePaymentConfig({ testMode: v })} />
              </div>
              {paymentConfig.testMode && (
                <div className="rounded border border-warning/20 bg-warning/10 p-3">
                  <p className="text-xs font-medium text-warning">Test mode is enabled. No real charges will be processed.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-display">Generate Payment Link</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Booking ID</Label>
              <Select value={linkForm.bookingId} onValueChange={v => {
                const b = bookings.find(bk => bk.bookingId === v);
                setLinkForm(p => ({ ...p, bookingId: v, customerName: b?.customerName || "", customerEmail: b?.customerEmail || "", amount: b?.totalAmount || 0 }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select booking" /></SelectTrigger>
                <SelectContent>
                  {bookings.filter(b => b.status === "pending").map(b => (
                    <SelectItem key={b.bookingId} value={b.bookingId}>{b.bookingId} - {b.customerName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Customer Name *</Label><Input value={linkForm.customerName} onChange={e => setLinkForm(p => ({ ...p, customerName: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Email</Label><Input value={linkForm.customerEmail} onChange={e => setLinkForm(p => ({ ...p, customerEmail: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Amount (PKR) *</Label><Input type="number" value={linkForm.amount || ""} onChange={e => setLinkForm(p => ({ ...p, amount: Number(e.target.value) }))} /></div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleCreateLink} className="flex-1 gradient-primary text-primary-foreground gap-2"><Send className="h-4 w-4" /> Generate & Send</Button>
              <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MethodToggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-12 items-center justify-center rounded bg-primary text-[9px] font-bold text-primary-foreground">{label.slice(0, 4).toUpperCase()}</div>
        <div><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{description}</p></div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
