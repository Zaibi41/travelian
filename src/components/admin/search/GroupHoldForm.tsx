import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { Checkbox } from "@/components/admin/ui/choice";
import { FieldLabel, Input } from "@/components/admin/ui/field";
import { Tag } from "@/components/admin/ui/StatusBadge";
import { Notice } from "@/components/admin/ui/feedback";
import { DayFirstDateField } from "@/components/admin/ui/DayFirstDateField";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SavedPersonPicker } from "@/components/admin/people/SavedPersonPicker";
import { CountrySelect } from "./CountrySelect";
import { DEFAULT_COUNTRY_CODE } from "@/data/countries";
import { GatewayError, type GatewayFieldError } from "@/lib/gateway/client";
import type { PersonSummary } from "@/lib/saved-people/api";
import { fullName, ID_TYPE_LABEL } from "@/lib/saved-people/states";
import { gatewayMessage, groupHeldPath, holdGroupSeats, type GroupHoldRequest, type GroupMoney } from "@/lib/admin-search/group-holds";
import { cn } from "@/lib/utils";

type Title = "MR" | "MRS" | "MISS";
type Gender = "M" | "F";
const TITLES: [Title, string][] = [["MR", "Mr"], ["MRS", "Mrs"], ["MISS", "Miss"]];
const CARD = "flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-card px-card py-4 shadow-card";

export interface GroupCustomer {
  query: string;
  full_name: string;
  phone: string;
  email: string;
  id_type: "PSPT" | "NATI";
  document_number: string;
  alsoAdult1: boolean;
  save: boolean;
  /** A saved customer (masked; the gateway loads the details). */
  saved: PersonSummary | null;
}

export interface GroupTraveler {
  title: Title;
  gender: Gender;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  nationality: string;
  document_number: string;
  document_expiry: string;
  document_country: string;
  save: boolean;
  saved: PersonSummary | null;
  documentId: string | null;
}

export const blankCustomer = (): GroupCustomer => ({
  query: "", full_name: "", phone: "", email: "", id_type: "PSPT", document_number: "", alsoAdult1: true, save: true, saved: null,
});
export const blankTraveler = (): GroupTraveler => ({
  title: "MR", gender: "M", first_name: "", last_name: "", date_of_birth: "", nationality: DEFAULT_COUNTRY_CODE, document_number: "",
  document_expiry: "", document_country: DEFAULT_COUNTRY_CODE, save: true, saved: null, documentId: null,
});

/** "Ali Raza" -> given "Ali", surname "Raza" (shown on Adult 1 when the customer is Adult 1; the gateway splits it the same way). */
export function splitFullName(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.length < 2 ? { first: words[0] ?? "", last: "" } : { first: words.slice(0, -1).join(" "), last: words[words.length - 1] };
}

const savedFor = (index: number, traveler: GroupTraveler, customer: GroupCustomer) =>
  index === 0 && customer.alsoAdult1 && customer.saved ? customer.saved : traveler.saved;

const documentFor = (traveler: GroupTraveler, person: PersonSummary) =>
  traveler.documentId ?? (person.documents.length === 1 ? person.documents[0].id : null);

const optional = (value: string) => value.trim() || null;

/** The hold request the gateway expects. Saved people go by id only: their details stay on the server. */
export function groupHoldRequest(ticketId: string, customer: GroupCustomer, travelers: GroupTraveler[], sellingPerAdult?: GroupMoney | null): GroupHoldRequest {
  const contact: GroupHoldRequest["contact"] = customer.saved
    ? { customer_id: customer.saved.id, save_for_next_time: true }
    : {
      full_name: customer.full_name.trim(), phone: customer.phone.trim(), email: customer.email.trim(), id_type: customer.id_type,
      document_number: optional(customer.document_number), save_for_next_time: customer.save,
    };
  return {
    ticket_id: ticketId,
    adults: travelers.length,
    contact,
    ...(sellingPerAdult ? { selling_price_per_adult: sellingPerAdult } : {}),
    passengers: travelers.map((traveler, index) => {
      const saved = savedFor(index, traveler, customer);
      if (saved) {
        const document = documentFor(traveler, saved);
        return { type: "ADT", title: traveler.title, gender: traveler.gender, traveler_id: saved.id, ...(document ? { document_id: document } : {}), save_for_next_time: true };
      }
      const fromCustomer = index === 0 && customer.alsoAdult1;
      const name = fromCustomer ? splitFullName(customer.full_name) : { first: traveler.first_name, last: traveler.last_name };
      const passport = fromCustomer && customer.id_type === "PSPT" ? customer.document_number : traveler.document_number;
      return {
        type: "ADT", title: traveler.title, gender: traveler.gender, first_name: name.first.trim() || null, last_name: name.last.trim() || null,
        date_of_birth: traveler.date_of_birth || null, id_type: "PSPT", document_number: optional(passport.replace(/[\s-]/g, "").toUpperCase()),
        document_country: traveler.document_country || null, nationality: traveler.nationality || null, document_expiry: traveler.document_expiry || null,
        save_for_next_time: traveler.save,
      };
    }),
  };
}

function fieldErrorMap(errors: GatewayFieldError[]) {
  const map: Record<string, string[]> = {};
  for (const error of errors) (map[error.path.join(".")] ??= []).push(error.message);
  return map;
}

function Field({ id, label, error, children, className }: { id: string; label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children}
      {error && <p id={`${id}-error`} className="text-helper text-status-critical-text">{error}</p>}
    </div>
  );
}

/** A saved person on a card (mockup "Adult 2"): name and masked document, no reveal. */
function SavedCard({ person, label, documentId, onDocument }: {
  person: PersonSummary; label: string; documentId?: string | null; onDocument?: (id: string) => void;
}) {
  const documents = person.documents;
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-body font-semibold text-foreground" title={fullName(person)}>{fullName(person)}</p>
          {documents.length <= 1 && (
            <p className="truncate text-label text-muted-foreground">
              {documents[0] ? `${ID_TYPE_LABEL[documents[0].id_type]} ${documents[0].document_number_masked}` : [person.phone_masked, person.email_masked].filter(Boolean).join(" · ") || "No document saved"}
            </p>
          )}
        </div>
        <Tag tone="teal" className="shrink-0">{label}</Tag>
      </div>
      {documents.length > 1 && onDocument && (
        <fieldset className="flex flex-col gap-1">
          <legend className="text-label font-medium text-muted-foreground">Which passport travels</legend>
          {documents.map(document => (
            <label key={document.id} className="flex min-w-0 items-center gap-2 text-body text-foreground">
              <input type="radio" name={`document-${person.id}`} checked={documentId === document.id} onChange={() => onDocument(document.id)}
                className="h-4 w-4 accent-[hsl(var(--teal))]" />
              <span className="truncate">{ID_TYPE_LABEL[document.id_type]} {document.document_number_masked}</span>
            </label>
          ))}
        </fieldset>
      )}
    </div>
  );
}

// Traveler details (mockup page 10): the customer card, then one card per adult. Saved
// customers and travelers show masked values only; the gateway fills their details in.
export function GroupHoldForm({ ticketId, adults, canHold, onPendingChange, formId, defaultSelling }: {
  ticketId: string; adults: number; canHold: boolean; onPendingChange: (pending: boolean) => void; formId: string;
  /** The fare's selling price per adult (supplier price + markup): the field's starting value. */
  defaultSelling?: GroupMoney | null;
}) {
  const [selling, setSelling] = useState<string | null>(null);
  const sellingText = selling ?? (defaultSelling ? String(Math.round(defaultSelling.amount_minor / 100)) : "");
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<GroupCustomer>(blankCustomer);
  const [travelers, setTravelers] = useState<GroupTraveler[]>(() => Array.from({ length: adults }, blankTraveler));
  const [errors, setErrors] = useState<{ fields: Record<string, string[]>; message: string | null }>({ fields: {}, message: null });
  const [picking, setPicking] = useState<"customer" | number | null>(null);
  const fieldError = (key: string) => errors.fields[key]?.join(" ");
  const setTraveler = (index: number, change: Partial<GroupTraveler>) =>
    setTravelers(current => current.map((traveler, i) => (i === index ? { ...traveler, ...change } : traveler)));

  const submit = async () => {
    if (!canHold) return;
    const noDocument = travelers.findIndex((traveler, index) => {
      const saved = savedFor(index, traveler, customer);
      return saved && saved.documents.length > 1 && !documentFor(traveler, saved);
    });
    if (noDocument >= 0) {
      setErrors({ fields: { [`passengers.${noDocument}`]: ["Choose which saved passport travels."] }, message: "Choose which saved passport each saved traveler uses." });
      return;
    }
    const rupees = sellingText.trim();
    if (defaultSelling && !/^[1-9]\d*$/.test(rupees)) {
      setErrors({ fields: { selling_price_per_adult: ["Enter the selling price in whole rupees."] }, message: "Check the selling price." });
      return;
    }
    const sellingPerAdult = defaultSelling ? { amount_minor: Number(rupees) * 100, currency: defaultSelling.currency } : null;
    onPendingChange(true);
    setErrors({ fields: {}, message: null });
    try {
      const view = await holdGroupSeats(groupHoldRequest(ticketId, customer, travelers, sellingPerAdult));
      navigate(groupHeldPath(view.booking_id), { state: view });
    } catch (error) {
      setErrors({
        fields: error instanceof GatewayError ? fieldErrorMap(error.fieldErrors) : {},
        message: gatewayMessage(error, "The seats couldn't be held. Nothing was held. Try again."),
      });
    } finally {
      onPendingChange(false);
    }
  };

  const customerInput = (name: "full_name" | "phone" | "email" | "document_number", label: string, placeholder: string, type = "text") => (
    <Field id={`customer-${name}`} label={label} error={fieldError(`contact.${name}`)}>
      <Input id={`customer-${name}`} type={type} value={customer[name]} placeholder={placeholder} autoComplete="off" maxLength={name === "email" ? 50 : 60}
        aria-invalid={Boolean(fieldError(`contact.${name}`))} aria-describedby={fieldError(`contact.${name}`) ? `customer-${name}-error` : undefined}
        onChange={event => setCustomer({ ...customer, [name]: event.target.value })} />
    </Field>
  );

  return (
    <form id={formId} noValidate aria-label="Traveler details" className="flex min-w-0 flex-col gap-section-gap" onSubmit={event => { event.preventDefault(); void submit(); }}>
      <section aria-labelledby="customer-title" className={CARD}>
        <div>
          <h2 id="customer-title" className="font-display text-section font-semibold text-brand-navy">Customer</h2>
          <p className="text-body text-muted-foreground">The person who pays for this booking. Type the details, or find a saved customer.</p>
        </div>
        <div className="flex flex-col gap-1">
          <FieldLabel htmlFor="customer-find">Find saved customer</FieldLabel>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input id="customer-find" value={customer.query} maxLength={64} placeholder="Passport or CNIC number, phone, email or name" className="pl-9"
                onChange={event => setCustomer({ ...customer, query: event.target.value })}
                onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); setPicking("customer"); } }} />
            </div>
            <Button type="button" variant="outline" onClick={() => setPicking("customer")}>Find</Button>
          </div>
        </div>
        {customer.saved ? (
          <div className="flex flex-col gap-2">
            <SavedCard person={customer.saved} label="Saved customer" />
            <div><Button type="button" variant="ghost" size="sm" onClick={() => setCustomer({ ...customer, saved: null })}>Type details instead</Button></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {customerInput("full_name", "Full name", "Given name and surname")}
              {customerInput("phone", "Phone", "+92 300 1234567", "tel")}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)_minmax(0,1fr)]">
              {customerInput("email", "Email", "name@example.com", "email")}
              <Field id="customer-id_type" label="Document type">
                <Select value={customer.id_type} onValueChange={value => setCustomer({ ...customer, id_type: value as GroupCustomer["id_type"] })}>
                  <SelectTrigger id="customer-id_type" className="h-control text-body"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PSPT" className="text-body">Passport</SelectItem>
                    <SelectItem value="NATI" className="text-body">CNIC</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {customerInput("document_number", "Document number", customer.id_type === "NATI" ? "13 digits" : "Letters and digits")}
            </div>
          </>
        )}
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-body text-foreground">
            <Checkbox checked={customer.alsoAdult1} onCheckedChange={checked => setCustomer({ ...customer, alsoAdult1: checked === true })} />
            The customer is also Adult 1
          </label>
          {!customer.saved && (
            <label className="flex items-center gap-2 text-body text-foreground">
              <Checkbox checked={customer.save} onCheckedChange={checked => setCustomer({ ...customer, save: checked === true })} />
              Save this customer for next time
            </label>
          )}
        </div>
      </section>

      {travelers.map((traveler, index) => {
        const label = `Adult ${index + 1}`;
        const key = (field: string) => `passengers.${index}.${field}`;
        const id = (field: string) => `adult-${index}-${field}`;
        const saved = savedFor(index, traveler, customer);
        const fromCustomer = index === 0 && customer.alsoAdult1 && !customer.saved;
        const name = fromCustomer ? splitFullName(customer.full_name) : null;
        const passportFromCustomer = fromCustomer && customer.id_type === "PSPT";
        const select = (field: "title" | "gender", fieldLabel: string, options: [string, string][]) => (
          <Field id={id(field)} label={fieldLabel} error={fieldError(key(field))}>
            <Select value={traveler[field]} onValueChange={value => setTraveler(index, field === "title"
              ? { title: value as Title, gender: value === "MR" ? "M" : "F" } : { gender: value as Gender })}>
              <SelectTrigger id={id(field)} className="h-control text-body" aria-invalid={Boolean(fieldError(key(field)))}><SelectValue /></SelectTrigger>
              <SelectContent>{options.map(([value, text]) => <SelectItem key={value} value={value} className="text-body">{text}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        );
        const text = (field: "first_name" | "last_name" | "document_number", fieldLabel: string, value: string, readOnly: boolean) => (
          <Field id={id(field)} label={fieldLabel} error={fieldError(key(field))}>
            <Input id={id(field)} value={value} readOnly={readOnly} autoComplete="off" maxLength={field === "document_number" ? 20 : 25}
              aria-invalid={Boolean(fieldError(key(field)))} aria-describedby={fieldError(key(field)) ? `${id(field)}-error` : undefined}
              className={cn(readOnly && "bg-muted/40")} onChange={event => setTraveler(index, { [field]: event.target.value })} />
          </Field>
        );
        const date = (field: "date_of_birth" | "document_expiry", fieldLabel: string) => (
          <Field id={id(field)} label={fieldLabel} error={fieldError(key(field))}>
            <DayFirstDateField id={id(field)} value={traveler[field] || undefined} invalid={Boolean(fieldError(key(field)))}
              describedBy={fieldError(key(field)) ? `${id(field)}-error` : undefined}
              fromYear={field === "date_of_birth" ? 1900 : new Date().getFullYear()} toYear={field === "date_of_birth" ? new Date().getFullYear() : 2060}
              onChange={value => setTraveler(index, { [field]: value ?? "" })} />
          </Field>
        );
        const country = (field: "nationality" | "document_country", fieldLabel: string) => (
          <Field id={id(field)} label={fieldLabel} error={fieldError(key(field))}>
            <CountrySelect id={id(field)} value={traveler[field]} onChange={code => setTraveler(index, { [field]: code })} invalid={Boolean(fieldError(key(field)))} />
          </Field>
        );
        return (
          <section key={index} aria-label={label} className={CARD}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-section font-semibold text-brand-navy">{label}</h2>
              {!(index === 0 && customer.alsoAdult1 && customer.saved) && (
                <Button type="button" variant="outline" aria-label={`${saved ? "Change" : "Use saved traveler"}, ${label}`} onClick={() => setPicking(index)}>
                  {saved ? "Change" : "Use saved traveler"}
                </Button>
              )}
            </div>
            {fieldError(`passengers.${index}`) && <p role="alert" className="text-body text-status-critical-text">{fieldError(`passengers.${index}`)}</p>}
            {saved ? (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
                  {select("title", "Title", TITLES)}
                  {select("gender", "Gender", [["M", "Male"], ["F", "Female"]])}
                </div>
                <SavedCard person={saved} label={index === 0 && customer.alsoAdult1 && customer.saved ? "Saved customer" : "Saved traveler"}
                  documentId={documentFor(traveler, saved)} onDocument={documentId => setTraveler(index, { documentId })} />
                {(fieldError(key("traveler_id")) || fieldError(key("document_id"))) && (
                  <p role="alert" className="text-helper text-status-critical-text">{fieldError(key("traveler_id")) ?? fieldError(key("document_id"))}</p>
                )}
                {traveler.saved && (
                  <div><Button type="button" variant="ghost" size="sm" onClick={() => setTraveler(index, { saved: null, documentId: null })}>Type details instead</Button></div>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,0.6fr)_minmax(0,1.2fr)_minmax(0,1.2fr)]">
                  {select("title", "Title", TITLES)}
                  {text("first_name", "Given name", name ? name.first : traveler.first_name, Boolean(name))}
                  {text("last_name", "Surname", name ? name.last : traveler.last_name, Boolean(name))}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {select("gender", "Gender", [["M", "Male"], ["F", "Female"]])}
                  {date("date_of_birth", "Date of birth")}
                  {country("nationality", "Nationality")}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {text("document_number", "Passport number", passportFromCustomer ? customer.document_number : traveler.document_number, passportFromCustomer)}
                  {date("document_expiry", "Passport expiry")}
                  {country("document_country", "Issuing country")}
                </div>
                <label className="flex items-center gap-2 text-body text-foreground">
                  <Checkbox checked={traveler.save} onCheckedChange={checked => setTraveler(index, { save: checked === true })} aria-label={`Save this traveler for next time, ${label}`} />
                  Save this traveler for next time
                </label>
              </>
            )}
          </section>
        );
      })}

      {defaultSelling && (
        <section aria-labelledby="selling-title" className={CARD}>
          <div>
            <h2 id="selling-title" className="font-display text-section font-semibold text-brand-navy">Selling price</h2>
            <p className="text-body text-muted-foreground">What the customer pays. It can't be below the supplier price.</p>
          </div>
          <div className="w-full max-w-[16rem]">
            <Field id="selling_price_per_adult" label="Selling price per adult (Rs)" error={fieldError("selling_price_per_adult")}>
              <Input id="selling_price_per_adult" inputMode="numeric" value={sellingText} autoComplete="off" maxLength={9}
                aria-invalid={Boolean(fieldError("selling_price_per_adult"))}
                aria-describedby={fieldError("selling_price_per_adult") ? "selling_price_per_adult-error" : undefined}
                onChange={event => setSelling(event.target.value.replace(/[^\d]/g, ""))} />
            </Field>
          </div>
        </section>
      )}

      {errors.message && <Notice tone="critical">{errors.message}</Notice>}

      <SavedPersonPicker
        open={picking !== null}
        title={picking === "customer" ? "Find a saved customer" : "Use a saved traveler"}
        description={picking === "customer"
          ? "Search by passport or CNIC number first, or phone, email or name. Details stay masked; the server fills them in."
          : "Pick the traveler. Name, date of birth and passport stay on the server, masked here, and are filled in for the hold."}
        initialQuery={picking === "customer" ? customer.query : undefined}
        suggested={picking !== "customer" && customer.saved ? [customer.saved] : []}
        onClose={() => setPicking(null)}
        onPick={person => {
          if (picking === "customer") setCustomer({ ...customer, saved: person });
          else if (typeof picking === "number") {
            const title = TITLES.some(([value]) => value === person.title) ? person.title as Title : travelers[picking].title;
            setTraveler(picking, { saved: person, documentId: person.documents.length === 1 ? person.documents[0].id : null, title, gender: title === "MR" ? "M" : "F" });
          }
          setPicking(null);
        }}
      />
    </form>
  );
}
