import { useId, useState } from "react";
import { Check, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CountryCodePicker } from "@/components/ui/country-code-picker";
import { changeBookingContact, PublicBookingError } from "@/lib/public-booking";

export interface ContactValues { phoneCode: string; phone: string; email: string }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * #56 (part 1): the customer's contact details on the payment step, editable in place with the booking's private access
 * token. Saving never touches the airline hold or the price (no re-hold); the gateway tells the old email. Names, dates
 * of birth and passports are not edited here.
 */
export function BookingContactDetails({ reference, token, initial, onSaved }: {
  reference: string;
  /** The booking's private access token from checkout (the only access the gateway accepts for this change). */
  token: string;
  initial: Partial<ContactValues>;
  onSaved?: (saved: ContactValues) => void;
}) {
  const id = useId();
  const [current, setCurrent] = useState<Partial<ContactValues>>(initial);
  const [editing, setEditing] = useState(false);
  const [phoneCode, setPhoneCode] = useState(initial.phoneCode || "+92");
  const [phone, setPhone] = useState(initial.phone || "");
  const [email, setEmail] = useState(initial.email || "");
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const phoneError = !/^\d{6,15}$/.test(phone) ? "Enter the mobile number in digits (6 to 15), e.g. 3001234567." : "";
  const emailError = email.trim() && !EMAIL.test(email.trim()) ? "Enter a valid email address, e.g. name@example.com." : "";

  const startEdit = () => {
    setPhoneCode(current.phoneCode || "+92"); setPhone(current.phone || ""); setEmail(current.email || "");
    setTouched(false); setError(""); setSaved(false); setEditing(true);
  };

  const save = async () => {
    setTouched(true);
    if (phoneError || emailError) return;
    setSaving(true); setError("");
    try {
      const result = await changeBookingContact(reference, { phoneCode, phone, email }, token);
      const next = { phoneCode: result.phone_code, phone: result.phone, email: result.email };
      setCurrent(next); setEditing(false); setSaved(true);
      onSaved?.(next);
    } catch (problem) {
      setError(problem instanceof PublicBookingError ? problem.message : "The contact details couldn't be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border bg-card p-4 text-left text-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 id={`${id}-title`} className="font-semibold text-foreground">Contact details</h3>
        {!editing && (
          <Button type="button" variant="ghost" onClick={startEdit} className="h-11 gap-1.5 rounded-lg px-3 text-primary">
            <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
          </Button>
        )}
      </div>

      {!editing ? (
        <dl className="mt-1 grid gap-1">
          {current.phone && (
            <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Mobile</dt><dd className="font-medium text-foreground">{current.phoneCode} {current.phone}</dd></div>
          )}
          {current.email && (
            <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Email</dt><dd className="min-w-0 break-all font-medium text-foreground">{current.email}</dd></div>
          )}
        </dl>
      ) : (
        <form noValidate aria-label="Edit contact details" className="mt-2 space-y-3" onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <div>
            <label htmlFor={`${id}-phone`} className="text-sm font-medium">Mobile Number *</label>
            <div className="mt-1.5 flex gap-2">
              <CountryCodePicker value={phoneCode} onChange={setPhoneCode} />
              <Input id={`${id}-phone`} inputMode="numeric" autoComplete="tel-national" placeholder="3001234567" className="h-11 flex-1 rounded-xl aria-[invalid=true]:border-destructive"
                value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))}
                aria-invalid={touched && phoneError ? true : undefined} aria-describedby={touched && phoneError ? `${id}-phone-error` : undefined} />
            </div>
            {touched && phoneError && <p id={`${id}-phone-error`} className="mt-1 text-xs text-destructive">{phoneError}</p>}
          </div>
          <div>
            <label htmlFor={`${id}-email`} className="text-sm font-medium">Email</label>
            <Input id={`${id}-email`} type="email" autoComplete="email" placeholder="name@example.com" className="mt-1.5 h-11 rounded-xl aria-[invalid=true]:border-destructive"
              value={email} onChange={(event) => setEmail(event.target.value)}
              aria-invalid={touched && emailError ? true : undefined} aria-describedby={touched && emailError ? `${id}-email-error` : `${id}-note`} />
            {touched && emailError && <p id={`${id}-email-error`} className="mt-1 text-xs text-destructive">{emailError}</p>}
          </div>
          <p id={`${id}-note`} className="text-xs text-muted-foreground">Changing these doesn't change your booking, hold time or price. We'll let your previous email know.</p>
          {error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEditing(false)} disabled={saving} className="h-11 rounded-xl px-4">Cancel</Button>
            <Button type="submit" disabled={saving} className="gradient-primary h-11 rounded-xl px-5 text-primary-foreground">
              {saving ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" /> Saving…</> : "Save"}
            </Button>
          </div>
        </form>
      )}
      {saved && !editing && (
        <p role="status" className="mt-2 flex items-center gap-1.5 text-xs font-medium text-success"><Check className="h-3.5 w-3.5" aria-hidden="true" /> Contact details saved. Your booking and price stay the same.</p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">To correct a name, date of birth or passport, contact Travelian before you pay.</p>
    </section>
  );
}
