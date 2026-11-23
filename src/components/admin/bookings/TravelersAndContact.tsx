import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/admin/ui/button";
import { FieldLabel, Input } from "@/components/admin/ui/field";
import { GatewayError } from "@/lib/gateway/client";
import { changeCustomerContact } from "@/lib/admin-bookings/api";
import type { BookingDetail } from "@/lib/admin-bookings/types";
import { titleText } from "@/lib/passenger-details";

const CARD = "flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card px-card py-3.5 shadow-card";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TYPE_LABEL = { ADT: "Adult", CHD: "Child", INF: "Infant" } as const;

/** "+92 3001234567" (BookingCustomer.phone) -> ["+92", "3001234567"]. */
function splitPhone(value: string | null | undefined): [string, string] {
  const text = String(value ?? "").trim();
  const match = text.match(/^(\+\d{1,3})\s*(\d+)$/);
  return match ? [match[1], match[2]] : ["+92", text.replace(/\D/g, "")];
}

/**
 * #56 (part 1): on the Payments tab, before the payment is recorded: who is travelling and the customer's contact details,
 * editable in place. Saving never touches the airline hold or the price (no re-hold). Names, dates of birth and passports
 * are not edited here (that needs the supplier cancel and re-hold, not built yet).
 */
export function TravelersAndContact({ booking }: { booking: BookingDetail }) {
  const queryClient = useQueryClient();
  const travelers = [...(booking.passengers ?? [])].sort((a, b) => a.position - b.position);
  const customer = booking.customer ?? null;
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState("+92");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => changeCustomerContact(booking.booking_id, { phoneCode: code.trim(), phone, email }),
    onSuccess: response => {
      setSaved(`${response.message} The hold and price are unchanged.`);
      setEditing(false);
      void queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
    onError: error => setProblem(error instanceof GatewayError ? error.message : "The contact details couldn't be saved. Nothing was changed."),
  });

  const start = () => {
    const [c, p] = splitPhone(customer?.phone);
    setCode(c); setPhone(p); setEmail(customer?.email ?? ""); setProblem(null); setSaved(null); setEditing(true);
  };
  const submit = () => {
    if (!/^\+\d{1,3}$/.test(code.trim())) return setProblem("Enter the country code, e.g. +92.");
    if (!/^\d{6,15}$/.test(phone)) return setProblem("Enter the mobile number in digits (6 to 15), e.g. 3001234567.");
    if (email.trim() && !EMAIL.test(email.trim())) return setProblem("Enter a valid email address, e.g. name@example.com.");
    setProblem(null);
    save.mutate();
  };

  if (!travelers.length && !customer) return null;
  return (
    <section aria-labelledby="pay-travelers-title" className={CARD}>
      <h2 id="pay-travelers-title" className="text-section font-semibold text-foreground">Before payment: travelers and contact</h2>
      <div className="grid grid-cols-1 gap-card-gap lg:grid-cols-2">
        {travelers.length > 0 && (
          <div className="min-w-0">
            <h3 className="text-label font-medium text-muted-foreground">Travelers</h3>
            <ul className="mt-1 flex flex-col divide-y divide-border" data-testid="payment-travelers">
              {travelers.map(traveler => {
                const full = `${titleText(traveler.title)} ${traveler.first_name} ${traveler.last_name.toUpperCase()}`.trim();
                return (
                  <li key={traveler.position} className="flex items-center justify-between gap-3 py-1.5 text-body">
                    <span className="min-w-0 truncate font-medium text-foreground" title={full}>{full}</span>
                    <span className="shrink-0 text-label text-muted-foreground">{TYPE_LABEL[traveler.type]}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {customer && (
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-label font-medium text-muted-foreground">Contact details</h3>
              {!editing && <Button type="button" variant="ghost" onClick={start}>Edit</Button>}
            </div>
            {!editing ? (
              <dl className="mt-1 flex flex-col gap-1 text-body">
                <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Mobile</dt><dd className="font-medium text-foreground">{customer.phone || "—"}</dd></div>
                <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Email</dt><dd className="min-w-0 break-all font-medium text-foreground">{customer.email || "—"}</dd></div>
              </dl>
            ) : (
              <form noValidate aria-label="Edit contact details" className="mt-1 flex flex-col gap-3" onSubmit={event => { event.preventDefault(); submit(); }}>
                <div className="grid grid-cols-[5.5rem_1fr] gap-2">
                  <div className="flex min-w-0 flex-col gap-1">
                    <FieldLabel htmlFor="contact-code">Code</FieldLabel>
                    <Input id="contact-code" maxLength={4} value={code} onChange={event => setCode(event.target.value)} />
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <FieldLabel htmlFor="contact-mobile">Mobile</FieldLabel>
                    <Input id="contact-mobile" inputMode="numeric" maxLength={15} value={phone} onChange={event => setPhone(event.target.value.replace(/\D/g, ""))} />
                  </div>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <FieldLabel htmlFor="contact-email">Email</FieldLabel>
                  <Input id="contact-email" type="email" maxLength={254} value={email} onChange={event => setEmail(event.target.value)} />
                </div>
                <p className="text-helper text-muted-foreground">No re-hold: the airline hold and the price stay the same. The change is logged.</p>
                {problem && <p role="alert" className="rounded-md border border-status-critical/40 bg-status-critical-soft px-3 py-2 text-body text-status-critical-text">{problem}</p>}
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" variant="primary" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save contact details"}</Button>
                  <Button type="button" variant="secondary" onClick={() => setEditing(false)} disabled={save.isPending}>Cancel</Button>
                </div>
              </form>
            )}
            {saved && !editing && <p role="status" className="mt-1 text-body text-status-fine-text">{saved}</p>}
          </div>
        )}
      </div>
      <p className="text-helper text-muted-foreground">Name, date of birth or passport changes need the airline hold cancelled and made again; that isn't available here yet.</p>
    </section>
  );
}
