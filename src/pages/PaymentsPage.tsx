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
import {
  CreditCard, Wallet, Building2, Link2, Plus, Copy, CheckCircle,
  DollarSign, ShieldCheck, Send, Eye, EyeOff,
} from "lucide-react";

export default function PaymentsPage() {
  const { currentRole } = useRole();
  const {
    paymentLinks, paymentConfig, bookings,
    addPaymentLink, updatePaymentLink, updatePaymentConfig,
  } = useAdmin();

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkForm, setLinkForm] = useState({ bookingId: '', customerName: '', customerEmail: '', amount: 0 });
  const [tab, setTab] = useState<'links' | 'config'>('links');

  const canEdit = currentRole === 'super_admin' || currentRole === 'admin';

  const totalPaid = paymentLinks.filter(pl => pl.status === 'paid').reduce((s, pl) => s + pl.amount, 0);
  const totalPending = paymentLinks.filter(pl => pl.status === 'pending').reduce((s, pl) => s + pl.amount, 0);

  const handleCreateLink = () => {
    if (!linkForm.customerName || !linkForm.amount) { toast.error("Customer name and amount required"); return; }
    const newLink: PaymentLink = {
      id: `pl${Date.now()}`, bookingId: linkForm.bookingId, customerName: linkForm.customerName,
      customerEmail: linkForm.customerEmail, amount: linkForm.amount, status: 'pending',
      createdAt: new Date().toISOString().split('T')[0],
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      link: `https://pay.travelian.com/pl${Date.now()}`,
    };
    addPaymentLink(newLink);
    toast.success("Payment link created");
    setLinkDialogOpen(false);
    setLinkForm({ bookingId: '', customerName: '', customerEmail: '', amount: 0 });
  };

  const markAsPaid = (id: string) => {
    updatePaymentLink(id, { status: 'paid', paymentMethod: 'visa' });
    toast.success("Payment marked as received");
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success("Link copied to clipboard");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Payment Management</h1>
          <p className="text-sm text-muted-foreground">Manage payments, payment links, and configuration</p>
        </div>
        {canEdit && (
          <Button onClick={() => setLinkDialogOpen(true)} className="gradient-primary text-primary-foreground gap-2">
            <Plus className="h-4 w-4" /> Generate Payment Link
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Collected" value={`$${totalPaid.toLocaleString()}`} icon={DollarSign} trend="This month" trendUp />
        <StatCard title="Pending Payments" value={`$${totalPending.toLocaleString()}`} icon={CreditCard} />
        <StatCard title="Payment Links" value={paymentLinks.length} icon={Link2} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button onClick={() => setTab('links')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'links' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          Payment Links
        </button>
        {canEdit && (
          <button onClick={() => setTab('config')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'config' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            Payment Configuration
          </button>
        )}
      </div>

      {tab === 'links' && (
        <div className="space-y-3">
          {paymentLinks.map(pl => (
            <Card key={pl.id} className="shadow-card">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${pl.status === 'paid' ? 'bg-success/10' : pl.status === 'expired' ? 'bg-destructive/10' : 'bg-warning/10'}`}>
                      {pl.status === 'paid' ? <CheckCircle className="h-5 w-5 text-success" /> : <CreditCard className="h-5 w-5 text-warning" />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{pl.customerName}</p>
                      <p className="text-xs text-muted-foreground">{pl.customerEmail} · Booking #{pl.bookingId}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Created: {pl.createdAt} · Expires: {pl.expiresAt}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-bold font-display text-primary">${pl.amount.toLocaleString()}</p>
                      <StatusBadge status={pl.status} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => copyLink(pl.link)}>
                        <Copy className="h-3 w-3" /> Copy Link
                      </Button>
                      {pl.status === 'pending' && canEdit && (
                        <Button variant="outline" size="sm" className="text-xs gap-1 text-success" onClick={() => markAsPaid(pl.id)}>
                          <CheckCircle className="h-3 w-3" /> Mark Paid
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                {pl.status === 'paid' && pl.paymentMethod && (
                  <div className="mt-2 pt-2 border-t flex items-center gap-2">
                    <ShieldCheck className="h-3 w-3 text-success" />
                    <span className="text-xs text-success font-medium">Paid via {pl.paymentMethod.toUpperCase()}</span>
                    <div className="ml-auto flex gap-1">
                      {['visa', 'mastercard'].includes(pl.paymentMethod) && (
                        <div className="px-2 py-0.5 bg-muted rounded text-[10px] font-bold">
                          {pl.paymentMethod === 'visa' ? '💳 VISA' : '💳 MC'}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {paymentLinks.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No payment links created yet</p>
          )}
        </div>
      )}

      {tab === 'config' && canEdit && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base font-display">Payment Methods</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-12 bg-gradient-to-r from-blue-600 to-blue-800 rounded flex items-center justify-center">
                    <span className="text-[8px] font-bold text-primary-foreground">VISA</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Visa</p>
                    <p className="text-xs text-muted-foreground">Accept Visa cards</p>
                  </div>
                </div>
                <Switch checked={paymentConfig.visaEnabled} onCheckedChange={v => updatePaymentConfig({ visaEnabled: v })} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-12 bg-gradient-to-r from-red-500 to-orange-500 rounded flex items-center justify-center">
                    <span className="text-[8px] font-bold text-primary-foreground">MC</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">MasterCard</p>
                    <p className="text-xs text-muted-foreground">Accept MasterCard</p>
                  </div>
                </div>
                <Switch checked={paymentConfig.mastercardEnabled} onCheckedChange={v => updatePaymentConfig({ mastercardEnabled: v })} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Wallet</p>
                    <p className="text-xs text-muted-foreground">Agency wallet payments</p>
                  </div>
                </div>
                <Switch checked={paymentConfig.walletEnabled} onCheckedChange={v => updatePaymentConfig({ walletEnabled: v })} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Bank Transfer</p>
                    <p className="text-xs text-muted-foreground">Direct bank transfers</p>
                  </div>
                </div>
                <Switch checked={paymentConfig.bankTransferEnabled} onCheckedChange={v => updatePaymentConfig({ bankTransferEnabled: v })} />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base font-display">Payment Security</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-accent/50 border">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="h-5 w-5 text-success" />
                  <span className="text-sm font-semibold">Secure Payment Processing</span>
                </div>
                <p className="text-xs text-muted-foreground">All payments are processed securely with SSL encryption and PCI-DSS compliance.</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Test Mode</p>
                  <p className="text-xs text-muted-foreground">Use test/sandbox environment</p>
                </div>
                <Switch checked={paymentConfig.testMode} onCheckedChange={v => updatePaymentConfig({ testMode: v })} />
              </div>
              {paymentConfig.testMode && (
                <div className="p-3 rounded bg-warning/10 border border-warning/20">
                  <p className="text-xs text-warning font-medium">⚠ Test mode is enabled. No real charges will be processed.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Payment Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-display">Generate Payment Link</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Booking ID</Label>
              <Select value={linkForm.bookingId} onValueChange={v => {
                const b = bookings.find(bk => bk.bookingId === v);
                setLinkForm(p => ({ ...p, bookingId: v, customerName: b?.customerName || '', customerEmail: b?.customerEmail || '', amount: b?.totalAmount || 0 }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select booking" /></SelectTrigger>
                <SelectContent>
                  {bookings.filter(b => b.status === 'pending').map(b => (
                    <SelectItem key={b.bookingId} value={b.bookingId}>{b.bookingId} - {b.customerName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Customer Name *</Label><Input value={linkForm.customerName} onChange={e => setLinkForm(p => ({ ...p, customerName: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Email</Label><Input value={linkForm.customerEmail} onChange={e => setLinkForm(p => ({ ...p, customerEmail: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Amount ($) *</Label><Input type="number" value={linkForm.amount || ''} onChange={e => setLinkForm(p => ({ ...p, amount: Number(e.target.value) }))} /></div>
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
