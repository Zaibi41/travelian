import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, UserRound, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CustomerProfile } from "@/data/mock";
import { listCustomers, saveCustomer } from "@/lib/customer-api";

const emptyCustomer: Omit<CustomerProfile, "customerId"> = {
  name: "",
  email: "",
  phone: "",
  title: "Mr",
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  passportNumber: "",
  passportExpiry: "",
};

function splitCustomerName(name = "") {
  const [firstName = "", ...lastNameParts] = name.trim().split(/\s+/).filter(Boolean);
  return { firstName, lastName: lastNameParts.join(" ") };
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerProfile | null>(null);
  const [form, setForm] = useState<Omit<CustomerProfile, "customerId">>(emptyCustomer);
  const [saving, setSaving] = useState(false);

  const loadCustomers = async () => {
    try {
      setCustomers(await listCustomers());
    } catch (error) {
      console.error("Unable to load customer profiles", error);
      toast.error("Customer profiles could not be loaded");
    }
  };

  useEffect(() => {
    void loadCustomers();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter(customer =>
      [customer.name, customer.email, customer.phone, customer.passportNumber]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(term)),
    );
  }, [customers, search]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyCustomer);
    setDialogOpen(true);
  };

  const openEdit = (customer: CustomerProfile) => {
    const { customerId: _customerId, ...editable } = customer;
    setEditing(customer);
    setForm({ ...emptyCustomer, ...editable });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const name = form.name.trim() || [form.firstName, form.lastName].filter(Boolean).join(" ").trim();
    if (!name) {
      toast.error("Customer name is required");
      return;
    }
    if (!form.passportNumber?.trim()) {
      toast.error("Passport number is required");
      return;
    }
    setSaving(true);
    try {
      const parsedName = splitCustomerName(name);
      const saved = await saveCustomer({
        ...form,
        customerId: editing?.customerId,
        name,
        firstName: form.firstName || parsedName.firstName,
        lastName: form.lastName || parsedName.lastName,
      });
      setCustomers(previous => [saved, ...previous.filter(customer => customer.customerId !== saved.customerId)]);
      setDialogOpen(false);
      toast.success(editing ? "Customer profile updated" : "Customer profile saved");
    } catch (error) {
      console.error("Unable to save customer profile", error);
      toast.error(error instanceof Error ? error.message : "Customer profile could not be saved");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Customers</h1>
          <p className="text-sm text-muted-foreground">Maintain reusable passenger profiles for ticket booking and invoices.</p>
        </div>
        <Button onClick={openAdd} className="gap-2 gradient-primary text-primary-foreground">
          <Plus className="h-4 w-4" /> Add Customer
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="shadow-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent"><Users className="h-5 w-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">Customer profiles</p><p className="text-xl font-bold font-display">{customers.length}</p></div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent"><UserRound className="h-5 w-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">Search-ready passengers</p><p className="text-xl font-bold font-display">{filtered.length}</p></div>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={event => setSearch(event.target.value)} className="pl-9" placeholder="Search by name, email, phone or passport number" />
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50 text-left text-muted-foreground">
                <th className="p-3 font-medium">Customer</th><th className="p-3 font-medium">Contact</th><th className="p-3 font-medium">Passport</th><th className="p-3 font-medium">Date of Birth</th><th className="p-3 font-medium">Actions</th>
              </tr></thead>
              <tbody>
                {filtered.length ? filtered.map(customer => (
                  <tr key={customer.customerId} className="border-b transition-colors last:border-0 hover:bg-muted/30">
                    <td className="p-3 font-medium">{customer.name}</td>
                    <td className="p-3 text-muted-foreground"><p>{customer.email || "-"}</p><p>{customer.phone || "-"}</p></td>
                    <td className="p-3 font-mono text-xs">{customer.passportNumber}</td>
                    <td className="p-3 text-muted-foreground">{customer.dateOfBirth || "-"}</td>
                    <td className="p-3"><Button type="button" variant="ghost" size="sm" onClick={() => openEdit(customer)} className="gap-1"><Pencil className="h-3.5 w-3.5" /> Edit</Button></td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No customer profiles found. Add a customer to reuse passenger details during ticket booking.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="font-display">{editing ? "Edit Customer" : "Add Customer"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Customer Name *"><Input value={form.name} onChange={event => setForm(previous => ({ ...previous, name: event.target.value }))} /></Field>
            <Field label="Title"><Select value={form.title || "Mr"} onValueChange={value => setForm(previous => ({ ...previous, title: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Mr">Mr</SelectItem><SelectItem value="Mrs">Mrs</SelectItem><SelectItem value="Ms">Ms</SelectItem><SelectItem value="Miss">Miss</SelectItem><SelectItem value="Dr">Dr</SelectItem></SelectContent></Select></Field>
            <Field label="First Name"><Input value={form.firstName || ""} onChange={event => setForm(previous => ({ ...previous, firstName: event.target.value }))} /></Field>
            <Field label="Last Name"><Input value={form.lastName || ""} onChange={event => setForm(previous => ({ ...previous, lastName: event.target.value }))} /></Field>
            <Field label="Customer Email"><Input type="email" value={form.email || ""} onChange={event => setForm(previous => ({ ...previous, email: event.target.value }))} /></Field>
            <Field label="Customer WhatsApp/Phone"><Input value={form.phone || ""} onChange={event => setForm(previous => ({ ...previous, phone: event.target.value }))} placeholder="+923001234567" /></Field>
            <Field label="Passport Number *"><Input value={form.passportNumber || ""} onChange={event => setForm(previous => ({ ...previous, passportNumber: event.target.value.toUpperCase() }))} /></Field>
            <Field label="Passport Expiry"><Input type="date" value={form.passportExpiry || ""} onChange={event => setForm(previous => ({ ...previous, passportExpiry: event.target.value }))} /></Field>
            <Field label="Date of Birth"><Input type="date" value={form.dateOfBirth || ""} onChange={event => setForm(previous => ({ ...previous, dateOfBirth: event.target.value }))} /></Field>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" onClick={handleSave} disabled={saving} className="flex-1 gradient-primary text-primary-foreground">{saving ? "Saving..." : editing ? "Update Customer" : "Save Customer"}</Button>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
