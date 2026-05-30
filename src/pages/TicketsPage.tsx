import { useEffect, useMemo, useState } from "react";
import { Download, FileText, MessageCircle, Pencil, Plane, Plus, Receipt, Search, Send, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { useAdmin } from "@/contexts/AdminStore";
import { useRole } from "@/contexts/RoleContext";
import type { CustomerProfile, TravelTicket } from "@/data/mock";
import { listCustomers, saveCustomer } from "@/lib/customer-api";
import { downloadTicketInvoice } from "@/lib/ticket-invoice-pdf";

const emptyForm: Omit<TravelTicket, "ticketId"> = {
  bookingId: "",
  passengerName: "",
  type: "flight",
  origin: "",
  destination: "",
  departureDate: "",
  seatNumber: "",
  status: "pending",
  price: 0,
  ticketNumber: "",
  pnr: "",
  airline: "",
  flightNumber: "",
  title: "Mr",
  firstName: "",
  lastName: "",
  passengerType: "Adult",
  dateOfBirth: "",
  passportNumber: "",
  passportExpiry: "",
  originAirport: "",
  destinationAirport: "",
  departureTime: "",
  arrivalTime: "",
  duration: "",
  baseFare: 0,
  tax: 0,
  checkinBaggageKg: 20,
  cabinBaggageKg: 7,
  notes: "",
  customerEmail: "",
  customerPhone: "",
  customerId: "",
  cognitoSub: "",
  cognitoEmail: "",
  source: "admin_manual",
  issuedBy: "",
};

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

function customerDraftFromTicket(form: Omit<TravelTicket, "ticketId">): Omit<CustomerProfile, "customerId"> {
  return {
    name: form.passengerName || [form.firstName, form.lastName].filter(Boolean).join(" ").trim(),
    email: form.customerEmail || "",
    phone: form.customerPhone || "",
    title: form.title || "Mr",
    firstName: form.firstName || "",
    lastName: form.lastName || "",
    dateOfBirth: form.dateOfBirth || "",
    passportNumber: form.passportNumber || "",
    passportExpiry: form.passportExpiry || "",
  };
}

function splitCustomerName(name = "") {
  const [firstName = "", ...lastNameParts] = name.trim().split(/\s+/).filter(Boolean);
  return { firstName, lastName: lastNameParts.join(" ") };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function toTicket(form: Omit<TravelTicket, "ticketId">, existingId?: string): TravelTicket {
  const firstLast = [form.firstName, form.lastName].filter(Boolean).join(" ").trim();
  const fareComponentsTotal = Number(form.baseFare || 0) + Number(form.tax || 0);
  const total = fareComponentsTotal || Number(form.price || 0);
  const ticketId = existingId || `tk-${Date.now()}`;
  return {
    ...form,
    ticketId,
    passengerName: form.passengerName || firstLast,
    bookingId: form.bookingId || `INV-${Date.now()}`,
    price: total,
    baseFare: Number(form.baseFare || 0),
    tax: Number(form.tax || 0),
    checkinBaggageKg: Number(form.checkinBaggageKg || 0),
    cabinBaggageKg: Number(form.cabinBaggageKg || 0),
    invoiceNumber: form.invoiceNumber || `INV-${ticketId.replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase()}`,
  };
}

function invoiceMessage(ticket: TravelTicket) {
  return [
    "Hello,",
    "",
    "Travelian has prepared your flight ticket invoice.",
    "",
    `Passenger: ${ticket.passengerName}`,
    `Airline: ${ticket.airline || "Please confirm"} ${ticket.flightNumber || ""}`.trim(),
    `Route: ${ticket.origin || "---"} to ${ticket.destination || "---"}`,
    `Departure: ${ticket.departureDate || "Please confirm"} ${ticket.departureTime || ""}`.trim(),
    `Ticket: ${ticket.ticketNumber}`,
    `PNR: ${ticket.pnr || ticket.bookingId || "Please confirm"}`,
    `Total: PKR ${Number(ticket.price || 0).toLocaleString()}`,
    "",
    "Please review the attached invoice/ticket details and contact Travelian for any changes.",
  ].join("\n");
}

function whatsappHref(ticket: TravelTicket) {
  const phone = (ticket.customerPhone || "").replace(/[^\d]/g, "");
  const target = phone || "923244440014";
  return `https://wa.me/${target}?text=${encodeURIComponent(invoiceMessage(ticket))}`;
}

function invoiceReadinessIssues(ticket: TravelTicket) {
  const requiredText = [
    ["PNR", ticket.pnr],
    ["passenger name", ticket.passengerName],
    ["ticket number", ticket.ticketNumber],
    ["airline", ticket.airline],
    ["flight number", ticket.flightNumber],
    ["origin", ticket.origin],
    ["destination", ticket.destination],
    ["departure date", ticket.departureDate],
    ["departure time", ticket.departureTime],
    ["arrival time", ticket.arrivalTime],
    ["duration", ticket.duration],
  ] as const;
  const missing = requiredText.filter(([, value]) => !String(value || "").trim()).map(([label]) => label);
  if (!(Number(ticket.price) > 0)) missing.push("fare amount");
  return missing;
}

export default function TicketsPage() {
  const { currentRole } = useRole();
  const { tickets, addTicket, updateTicket, deleteTicket } = useAdmin();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TravelTicket | null>(null);
  const [form, setForm] = useState<Omit<TravelTicket, "ticketId">>(emptyForm);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState<Omit<CustomerProfile, "customerId">>(emptyCustomer);
  const [savingCustomer, setSavingCustomer] = useState(false);

  const canEdit = currentRole !== "agency_staff";
  const visibleTickets = tickets.filter(ticket => !ticket.deletedAt);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return visibleTickets;
    return visibleTickets.filter(ticket =>
      [ticket.passengerName, ticket.ticketNumber, ticket.pnr, ticket.airline, ticket.flightNumber, ticket.origin, ticket.destination]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(term)),
    );
  }, [search, visibleTickets]);

  const matchingCustomers = useMemo(() => {
    const term = customerSearch.trim().toLowerCase();
    if (!term) return customers.slice(0, 8);
    return customers
      .filter(customer => [customer.name, customer.email, customer.phone, customer.passportNumber]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(term)))
      .slice(0, 8);
  }, [customerSearch, customers]);

  useEffect(() => {
    let cancelled = false;
    listCustomers()
      .then(items => {
        if (!cancelled) setCustomers(items);
      })
      .catch(error => console.error("Unable to load customer profiles", error));
    return () => {
      cancelled = true;
    };
  }, []);

  const selectCustomer = (customer: CustomerProfile) => {
    const parsedName = splitCustomerName(customer.name);
    setForm(previous => ({
      ...previous,
      customerId: customer.customerId,
      customerEmail: customer.email || previous.customerEmail,
      customerPhone: customer.phone || previous.customerPhone,
      passengerName: customer.name || previous.passengerName,
      title: customer.title || previous.title,
      firstName: customer.firstName || parsedName.firstName || previous.firstName,
      lastName: customer.lastName || parsedName.lastName || previous.lastName,
      dateOfBirth: customer.dateOfBirth || previous.dateOfBirth,
      passportNumber: customer.passportNumber || previous.passportNumber,
      passportExpiry: customer.passportExpiry || previous.passportExpiry,
    }));
    setCustomerSearch(customer.name);
    setShowCustomerResults(false);
  };

  const handleSaveCustomer = async () => {
    const name = newCustomer.name.trim() || [newCustomer.firstName, newCustomer.lastName].filter(Boolean).join(" ").trim();
    if (!name) {
      toast.error("Customer name is required");
      return;
    }
    if (!newCustomer.passportNumber?.trim()) {
      toast.error("Passport number is required");
      return;
    }
    setSavingCustomer(true);
    try {
      const saved = await saveCustomer({ ...newCustomer, name });
      setCustomers(previous => [saved, ...previous.filter(item => item.customerId !== saved.customerId)]);
      selectCustomer(saved);
      setNewCustomer(emptyCustomer);
      setShowNewCustomer(false);
      toast.success("Customer profile saved");
    } catch (error) {
      console.error("Unable to save customer profile", error);
      toast.error(error instanceof Error ? error.message : "Customer profile could not be saved");
    } finally {
      setSavingCustomer(false);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, bookingId: `INV-${Date.now()}` });
    setCustomerSearch("");
    setShowNewCustomer(false);
    setDialogOpen(true);
  };

  const toggleNewCustomer = () => {
    setShowNewCustomer(previous => {
      const next = !previous;
      if (next) setNewCustomer(customerDraftFromTicket(form));
      return next;
    });
  };

  const openEdit = (ticket: TravelTicket) => {
    setEditing(ticket);
    const { ticketId, ...editable } = ticket;
    setForm({ ...emptyForm, ...editable });
    setCustomerSearch(ticket.passengerName || ticket.customerEmail || "");
    setShowNewCustomer(false);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.ticketNumber.trim()) {
      toast.error("Ticket number is required");
      return;
    }
    if (!form.passengerName.trim() && !form.firstName?.trim()) {
      toast.error("Passenger name is required");
      return;
    }
    const payload = toTicket(form, editing?.ticketId);
    if (payload.status === "issued") {
      const missing = invoiceReadinessIssues(payload);
      if (missing.length) {
        toast.error(`Complete invoice details before issuing: ${missing.join(", ")}`);
        return;
      }
    }
    if (editing) {
      updateTicket(editing.ticketId, payload);
      toast.success("Ticket booking updated");
    } else {
      addTicket(payload);
      toast.success("Ticket booking saved");
    }
    setDialogOpen(false);
  };

  const issueAndDownload = (ticket: TravelTicket) => {
    const missing = invoiceReadinessIssues(ticket);
    if (missing.length) {
      toast.error(`Complete invoice details before issuing: ${missing.join(", ")}`);
      return;
    }
    const issued = { ...ticket, status: "issued" as const };
    updateTicket(ticket.ticketId, issued);
    downloadTicketInvoice(issued);
    toast.success("Ticket issued and invoice downloaded");
  };

  const handleSaveAndInvoice = () => {
    if (!form.ticketNumber.trim()) {
      toast.error("Ticket number is required");
      return;
    }
    if (!form.passengerName.trim() && !form.firstName?.trim()) {
      toast.error("Passenger name is required");
      return;
    }
    const payload = toTicket({ ...form, status: "issued" }, editing?.ticketId);
    const missing = invoiceReadinessIssues(payload);
    if (missing.length) {
      toast.error(`Complete invoice details before issuing: ${missing.join(", ")}`);
      return;
    }
    if (editing) updateTicket(editing.ticketId, payload);
    else addTicket(payload);
    downloadTicketInvoice(payload);
    setDialogOpen(false);
    toast.success("Ticket issued and invoice downloaded");
  };

  const downloadInvoice = (ticket: TravelTicket) => {
    const missing = invoiceReadinessIssues(ticket);
    if (missing.length) {
      toast.error(`Complete invoice details before downloading: ${missing.join(", ")}`);
      return;
    }
    downloadTicketInvoice(ticket);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Ticket Bookings & Invoices</h1>
          <p className="text-sm text-muted-foreground">Create direct flight ticket bookings and generate customer-ready invoices.</p>
        </div>
        {canEdit && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={openAdd} className="gradient-primary text-primary-foreground gap-2"><Plus className="h-4 w-4" /> Add Ticket Booking</Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-card"><CardContent className="p-5"><Receipt className="h-5 w-5 text-primary" /><p className="mt-3 text-2xl font-bold">{visibleTickets.length}</p><p className="text-sm text-muted-foreground">Ticket bookings</p></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-5"><FileText className="h-5 w-5 text-primary" /><p className="mt-3 text-2xl font-bold">{visibleTickets.filter(t => t.status === "issued").length}</p><p className="text-sm text-muted-foreground">Issued invoices</p></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-5"><Plane className="h-5 w-5 text-primary" /><p className="mt-3 text-2xl font-bold">PKR {visibleTickets.reduce((sum, t) => sum + Number(t.price || 0), 0).toLocaleString()}</p><p className="text-sm text-muted-foreground">Invoice value</p></CardContent></Card>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by passenger, ticket, PNR, airline or route..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No ticket bookings yet"
          description="Create a ticket booking when a customer asks Travelian directly for a flight invoice. Saved ticket bookings will appear here and can generate PDF invoices."
          actionLabel={canEdit ? "Add Ticket Booking" : undefined}
          onAction={canEdit ? openAdd : undefined}
        />
      ) : (
        <Card className="shadow-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                    <th className="p-3 font-medium">Ticket / Invoice</th>
                    <th className="p-3 font-medium">Passenger</th>
                    <th className="p-3 font-medium">Airline</th>
                    <th className="p-3 font-medium">Route</th>
                    <th className="p-3 font-medium">Date</th>
                    <th className="p-3 font-medium">Amount</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(ticket => (
                    <tr key={ticket.ticketId} className="border-b transition-colors last:border-0 hover:bg-muted/30">
                      <td className="p-3">
                        <p className="font-mono text-xs font-bold">{ticket.ticketNumber}</p>
                        <p className="text-xs text-muted-foreground">{ticket.invoiceNumber || ticket.bookingId}</p>
                      </td>
                      <td className="p-3 font-medium">{ticket.passengerName}</td>
                      <td className="p-3">
                        <p className="font-medium">{ticket.airline || "Airline"}</p>
                        <Badge variant="outline" className="mt-1 text-xs">{ticket.flightNumber || ticket.type}</Badge>
                      </td>
                      <td className="p-3 text-xs">{ticket.origin || "---"} to {ticket.destination || "---"}</td>
                      <td className="p-3 text-xs text-muted-foreground">{ticket.departureDate || "Not set"}</td>
                      <td className="p-3 font-bold text-primary">PKR {Number(ticket.price || 0).toLocaleString()}</td>
                      <td className="p-3"><StatusBadge status={ticket.status} /></td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          {ticket.status !== "issued" && <Button variant="ghost" size="icon" onClick={() => issueAndDownload(ticket)} title="Issue and download invoice"><Send className="h-4 w-4" /></Button>}
                          <Button variant="ghost" size="icon" onClick={() => downloadInvoice(ticket)} title="Download invoice"><Download className="h-4 w-4" /></Button>
                          <a href={whatsappHref(ticket)} target="_blank" rel="noreferrer" title="Share on WhatsApp">
                            <Button variant="ghost" size="icon"><MessageCircle className="h-4 w-4 text-success" /></Button>
                          </a>
                          {canEdit && <Button variant="ghost" size="icon" onClick={() => openEdit(ticket)} title="Edit"><Pencil className="h-4 w-4" /></Button>}
                          {canEdit && <Button variant="ghost" size="icon" onClick={() => deleteTicket(ticket.ticketId)} title="Soft delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">{editing ? "Edit Ticket Booking" : "Add Ticket Booking"}</DialogTitle></DialogHeader>
          <div className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-4">
              <Field label="PNR"><Input value={form.pnr || ""} onChange={e => setForm(p => ({ ...p, pnr: e.target.value }))} /></Field>
              <Field label="Status">
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as TravelTicket["status"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="issued">Issued</SelectItem><SelectItem value="used">Used</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field label="Ticket Number *"><Input value={form.ticketNumber} onChange={e => setForm(p => ({ ...p, ticketNumber: e.target.value }))} /></Field>
              <Field label="Airline"><Input value={form.airline || ""} onChange={e => setForm(p => ({ ...p, airline: e.target.value }))} placeholder="Salam Air" /></Field>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <Field label="Title"><Select value={form.title || "Mr"} onValueChange={v => setForm(p => ({ ...p, title: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Mr">Mr</SelectItem><SelectItem value="Mrs">Mrs</SelectItem><SelectItem value="Ms">Ms</SelectItem><SelectItem value="Miss">Miss</SelectItem><SelectItem value="Dr">Dr</SelectItem></SelectContent></Select></Field>
              <Field label="First Name"><Input value={form.firstName || ""} onChange={e => setForm(p => ({ ...p, firstName: e.target.value, passengerName: `${e.target.value} ${p.lastName || ""}`.trim() }))} /></Field>
              <Field label="Last Name"><Input value={form.lastName || ""} onChange={e => setForm(p => ({ ...p, lastName: e.target.value, passengerName: `${p.firstName || ""} ${e.target.value}`.trim() }))} /></Field>
              <Field label="Passenger Type"><Select value={form.passengerType || "Adult"} onValueChange={v => setForm(p => ({ ...p, passengerType: v as TravelTicket["passengerType"] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Adult">Adult</SelectItem><SelectItem value="Child">Child</SelectItem><SelectItem value="Infant">Infant</SelectItem></SelectContent></Select></Field>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <Field label="Date of Birth"><Input type="date" value={form.dateOfBirth || ""} onChange={e => setForm(p => ({ ...p, dateOfBirth: e.target.value }))} /></Field>
              <Field label="Passport Number"><Input value={form.passportNumber || ""} onChange={e => setForm(p => ({ ...p, passportNumber: e.target.value }))} /></Field>
              <Field label="Passport Expiry"><Input type="date" value={form.passportExpiry || ""} onChange={e => setForm(p => ({ ...p, passportExpiry: e.target.value }))} /></Field>
              <Field label="Invoice Number"><Input value={form.invoiceNumber || ""} onChange={e => setForm(p => ({ ...p, invoiceNumber: e.target.value }))} placeholder="Auto generated" /></Field>
            </div>

            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-end">
                <div className="relative flex-1 space-y-2" onBlur={() => window.setTimeout(() => setShowCustomerResults(false), 120)}>
                  <Label>Customer Search</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={customerSearch}
                      onChange={event => {
                        setCustomerSearch(event.target.value);
                        setShowCustomerResults(true);
                      }}
                      onFocus={() => setShowCustomerResults(true)}
                      placeholder="Search by name, email, phone or passport number"
                      className="pl-9"
                    />
                  </div>
                  {showCustomerResults && (
                    <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-background p-1 shadow-lg">
                      {matchingCustomers.length ? matchingCustomers.map(customer => (
                        <button
                          key={customer.customerId}
                          type="button"
                          onClick={() => selectCustomer(customer)}
                          className="w-full rounded px-3 py-2 text-left transition-colors hover:bg-muted"
                        >
                          <span className="block text-sm font-semibold">{customer.name}</span>
                          <span className="block text-xs text-muted-foreground">{[customer.email, customer.phone, customer.passportNumber].filter(Boolean).join(" | ") || "Customer profile"}</span>
                        </button>
                      )) : (
                        <p className="px-3 py-2 text-sm text-muted-foreground">No matching customer profile found.</p>
                      )}
                    </div>
                  )}
                </div>
                <Button type="button" variant="outline" onClick={toggleNewCustomer} className="gap-2">
                  <UserPlus className="h-4 w-4" /> Add New Customer
                </Button>
              </div>
              {form.customerId && (
                <p className="mt-3 text-xs font-medium text-success">Customer profile selected. Ticket details are linked automatically.</p>
              )}
              {showNewCustomer && (
                <div className="mt-4 grid gap-4 border-t pt-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Customer Name *"><Input value={newCustomer.name} onChange={event => setNewCustomer(previous => ({ ...previous, name: event.target.value }))} /></Field>
                    <Field label="Customer Email"><Input type="email" value={newCustomer.email || ""} onChange={event => setNewCustomer(previous => ({ ...previous, email: event.target.value }))} /></Field>
                    <Field label="Customer WhatsApp/Phone"><Input value={newCustomer.phone || ""} onChange={event => setNewCustomer(previous => ({ ...previous, phone: event.target.value }))} placeholder="+923001234567" /></Field>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Passport Number *"><Input value={newCustomer.passportNumber || ""} onChange={event => setNewCustomer(previous => ({ ...previous, passportNumber: event.target.value.toUpperCase() }))} /></Field>
                    <Field label="Passport Expiry"><Input type="date" value={newCustomer.passportExpiry || ""} onChange={event => setNewCustomer(previous => ({ ...previous, passportExpiry: event.target.value }))} /></Field>
                    <Field label="Date of Birth"><Input type="date" value={newCustomer.dateOfBirth || ""} onChange={event => setNewCustomer(previous => ({ ...previous, dateOfBirth: event.target.value }))} /></Field>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" onClick={handleSaveCustomer} disabled={savingCustomer}>{savingCustomer ? "Saving..." : "Save Customer Profile"}</Button>
                    <Button type="button" variant="outline" onClick={() => setShowNewCustomer(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Customer Email"><Input type="email" value={form.customerEmail || ""} onChange={e => setForm(p => ({ ...p, customerEmail: e.target.value }))} /></Field>
              <Field label="Customer WhatsApp/Phone"><Input value={form.customerPhone || ""} onChange={e => setForm(p => ({ ...p, customerPhone: e.target.value }))} placeholder="+923001234567" /></Field>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <Field label="Flight Number"><Input value={form.flightNumber || ""} onChange={e => setForm(p => ({ ...p, flightNumber: e.target.value }))} placeholder="OV-505" /></Field>
              <Field label="Origin"><Input value={form.origin} onChange={e => setForm(p => ({ ...p, origin: e.target.value.toUpperCase() }))} placeholder="MCT" /></Field>
              <Field label="Destination"><Input value={form.destination} onChange={e => setForm(p => ({ ...p, destination: e.target.value.toUpperCase() }))} placeholder="SKT" /></Field>
              <Field label="Departure Date"><Input type="date" value={form.departureDate} onChange={e => setForm(p => ({ ...p, departureDate: e.target.value }))} /></Field>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <Field label="Origin Airport"><Input value={form.originAirport || ""} onChange={e => setForm(p => ({ ...p, originAirport: e.target.value }))} /></Field>
              <Field label="Destination Airport"><Input value={form.destinationAirport || ""} onChange={e => setForm(p => ({ ...p, destinationAirport: e.target.value }))} /></Field>
              <Field label="Departure Time"><Input type="time" value={form.departureTime || ""} onChange={e => setForm(p => ({ ...p, departureTime: e.target.value }))} /></Field>
              <Field label="Arrival Time"><Input type="time" value={form.arrivalTime || ""} onChange={e => setForm(p => ({ ...p, arrivalTime: e.target.value }))} /></Field>
            </div>

            <div className="grid gap-4 md:grid-cols-5">
              <Field label="Duration"><Input value={form.duration || ""} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} placeholder="3 hr 45 min" /></Field>
              <Field label="Base Fare"><Input type="number" value={form.baseFare || ""} onChange={e => setForm(p => ({ ...p, baseFare: Number(e.target.value) }))} /></Field>
              <Field label="Tax"><Input type="number" value={form.tax || ""} onChange={e => setForm(p => ({ ...p, tax: Number(e.target.value) }))} /></Field>
              <Field label="Check-in KG"><Input type="number" value={form.checkinBaggageKg || ""} onChange={e => setForm(p => ({ ...p, checkinBaggageKg: Number(e.target.value) }))} /></Field>
              <Field label="Cabin KG"><Input type="number" value={form.cabinBaggageKg || ""} onChange={e => setForm(p => ({ ...p, cabinBaggageKg: Number(e.target.value) }))} /></Field>
            </div>

            <Field label="Notes"><Textarea rows={3} value={form.notes || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></Field>

            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <Button onClick={handleSave} className="flex-1 gradient-primary text-primary-foreground">{editing ? "Update Ticket Booking" : "Save Ticket Booking"}</Button>
              <Button onClick={handleSaveAndInvoice} variant="outline" className="flex-1">Issue & Download Invoice</Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
