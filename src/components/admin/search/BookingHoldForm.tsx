import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Search } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { Checkbox } from "@/components/admin/ui/choice";
import { FieldLabel, Input } from "@/components/admin/ui/field";
import { Tag } from "@/components/admin/ui/StatusBadge";
import { Notice } from "@/components/admin/ui/feedback";
import { DayFirstDateField } from "@/components/admin/ui/DayFirstDateField";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SavedPersonPicker } from "@/components/admin/people/SavedPersonPicker";
import { CountrySelect } from "./CountrySelect";
import { GroupBookingSteps } from "./GroupBookingSteps";
import { DEFAULT_COUNTRY_CODE } from "@/data/countries";
import type { GatewayFieldError } from "@/lib/gateway/client";
import type { PersonSummary } from "@/lib/saved-people/api";
import { fullName, ID_TYPE_LABEL } from "@/lib/saved-people/states";
import { formatMoney } from "@/lib/admin-bookings/format";
import { cn } from "@/lib/utils";

// One booking form for every admin hold (Search > Flights and Search > Group Ticketing; the Group
// "Hold group seats" page is the standard). The two flows differ only by the props they pass:
// passenger types and counts, the right-hand fare panel (Flights: fare-confirmed timer; Group:
// confirmed at hold), the selling price card (Group) and what the page does with the values.
// The gateway checks every value and decides every amount; nothing here computes money.

export type PassengerType = "ADT" | "CHD" | "INF";
export type Title = "MR" | "MRS" | "MISS" | "MASTER";
type Gender = "M" | "F";
type IdType = "PSPT" | "NATI";
export interface Money { amount_minor: number; currency: string }

export const CARD = "flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-card px-card py-4 shadow-card";
const TITLES: Record<PassengerType, [Title, string][]> = {
  ADT: [["MR", "Mr"], ["MRS", "Mrs"], ["MISS", "Miss"]],
  CHD: [["MR", "Mr"], ["MRS", "Mrs"], ["MISS", "Miss"], ["MASTER", "Master"]],
  INF: [["MASTER", "Master"], ["MISS", "Miss"]],
};
const TYPE_LABEL: Record<PassengerType, string> = { ADT: "Adult", CHD: "Child", INF: "Infant" };
const AGE_HINT: Record<PassengerType, string> = {
  ADT: "12 or over on the travel date", CHD: "2 to 11 on the travel date", INF: "Under 2 on the travel date",
};
const genderOf = (title: Title): Gender => (title === "MR" || title === "MASTER" ? "M" : "F");

export interface BookingCustomer {
  query: string;
  full_name: string;
  phone: string;
  email: string;
  id_type: IdType;
  document_number: string;
  alsoAdult1: boolean;
  save: boolean;
  /** A saved customer (masked; the gateway loads the details). */
  saved: PersonSummary | null;
}

export interface BookingTraveler {
  type: PassengerType;
  title: Title;
  gender: Gender;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  nationality: string;
  id_type: IdType;
  document_number: string;
  document_expiry: string;
  document_country: string;
  /** Infants: the adult it travels with, counted among adults from 0. */
  travels_with: number;
  save: boolean;
  saved: PersonSummary | null;
  documentId: string | null;
}

export interface PassengerCounts { adults: number; children: number; infants: number }

export const blankCustomer = (): BookingCustomer => ({
  query: "", full_name: "", phone: "", email: "", id_type: "PSPT", document_number: "", alsoAdult1: true, save: true, saved: null,
});

export const blankTraveler = (type: PassengerType = "ADT", travelsWith = 0): BookingTraveler => ({
  type, title: type === "INF" ? "MASTER" : "MR", gender: "M", first_name: "", last_name: "", date_of_birth: "",
  nationality: DEFAULT_COUNTRY_CODE, id_type: "PSPT", document_number: "", document_expiry: "", document_country: DEFAULT_COUNTRY_CODE,
  travels_with: travelsWith, save: true, saved: null, documentId: null,
});

/** One card per traveler from the search counts: adults, then children, then infants (infant n with adult n). */
export function initialTravelers({ adults, children, infants }: PassengerCounts): BookingTraveler[] {
  return [
    ...Array.from({ length: adults }, () => blankTraveler("ADT")),
    ...Array.from({ length: children }, () => blankTraveler("CHD")),
    ...Array.from({ length: infants }, (_, index) => blankTraveler("INF", Math.min(index, Math.max(adults - 1, 0)))),
  ];
}

/** "Ali Raza" -> given "Ali", surname "Raza": shown on Adult 1 when the customer is Adult 1 (the gateway splits it the same way). */
export function splitFullName(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.length < 2 ? { first: words[0] ?? "", last: "" } : { first: words.slice(0, -1).join(" "), last: words[words.length - 1] };
}

/** The saved person a card uses: Adult 1 takes the saved customer when "The customer is also Adult 1". */
export const savedFor = (index: number, traveler: BookingTraveler, customer: BookingCustomer) =>
  index === 0 && customer.alsoAdult1 && customer.saved ? customer.saved : traveler.saved;

/** Which saved document travels: the one chosen, or the only one. */
export const documentFor = (traveler: BookingTraveler, person: PersonSummary) =>
  traveler.documentId ?? (person.documents.length === 1 ? person.documents[0].id : null);

const optional = (value: string) => value.trim() || null;

/** The customer card both hold endpoints take. A saved customer goes by id: the details stay on the server; a phone or
 *  email typed for this booking (when the saved record has none) is sent with it. */
export function customerCard(customer: BookingCustomer) {
  const typed = Object.fromEntries((["phone", "email"] as const).map(name => [name, customer[name].trim()]).filter(([, value]) => value));
  return customer.saved
    ? { customer_id: customer.saved.id, ...typed, save_for_next_time: true }
    : {
      full_name: customer.full_name.trim(), phone: customer.phone.trim(), email: customer.email.trim(), id_type: customer.id_type,
      document_number: optional(customer.document_number), save_for_next_time: customer.save,
    };
}

/** One passenger for the hold request. `withGender`: the Group hold checks the gender against the title. */
export function passengerRequest(traveler: BookingTraveler, index: number, customer: BookingCustomer, withGender: boolean) {
  const infant = traveler.type === "INF" ? { travels_with: traveler.travels_with } : {};
  const gender = withGender ? { gender: traveler.gender } : {};
  const saved = savedFor(index, traveler, customer);
  if (saved) {
    const document = documentFor(traveler, saved);
    return { type: traveler.type, title: traveler.title, ...gender, traveler_id: saved.id, ...(document ? { document_id: document } : {}), ...infant, save_for_next_time: true };
  }
  const fromCustomer = index === 0 && customer.alsoAdult1;
  const name = fromCustomer ? splitFullName(customer.full_name) : { first: traveler.first_name, last: traveler.last_name };
  const idType = fromCustomer ? customer.id_type : traveler.id_type;
  const number = fromCustomer ? customer.document_number : traveler.document_number;
  return {
    type: traveler.type, title: traveler.title, ...gender, first_name: name.first.trim() || null, last_name: name.last.trim() || null,
    date_of_birth: traveler.date_of_birth || null, id_type: idType, document_number: optional(number.replace(/[\s-]/g, "").toUpperCase()),
    document_country: traveler.document_country || null, nationality: traveler.type === "INF" ? null : traveler.nationality || null,
    document_expiry: traveler.document_expiry || null, ...infant, save_for_next_time: traveler.save,
  };
}

export interface FormErrors { fields: Record<string, string[]>; message: string | null }
export const NO_ERRORS: FormErrors = { fields: {}, message: null };

/** Gateway field errors by key: "contact.email", "passengers.0.first_name", "passengers.0" (whole card). */
export function fieldErrorMap(errors: GatewayFieldError[]) {
  const map: Record<string, string[]> = {};
  for (const error of errors) (map[error.path.join(".")] ??= []).push(error.message);
  return map;
}

export interface BookingValues {
  customer: BookingCustomer;
  travelers: BookingTraveler[];
  /** Group: the selling price per adult typed on the form (whole rupees); null when the flow has none. */
  sellingPerAdult: Money | null;
}

function Field({ id, label, error, hint, children, className }: { id: string; label: string; error?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children}
      {hint && <p className="text-helper text-muted-foreground">{hint}</p>}
      {error && <p id={`${id}-error`} className="text-helper text-status-critical-text">{error}</p>}
    </div>
  );
}

/** A saved person on a card: name and masked document, no reveal; a choice when several documents are saved. */
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
          <legend className="text-label font-medium text-muted-foreground">Which document travels</legend>
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

function DocumentTypeSelect({ id, value, onChange, disabled }: { id: string; value: IdType; onChange: (value: IdType) => void; disabled?: boolean }) {
  return (
    <Select value={value} onValueChange={next => onChange(next as IdType)} disabled={disabled}>
      <SelectTrigger id={id} className="h-control text-body"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="PSPT" className="text-body">Passport</SelectItem>
        <SelectItem value="NATI" className="text-body">CNIC</SelectItem>
      </SelectContent>
    </Select>
  );
}

const counted = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** "2 adults · 1 child · 1 infant". */
export function passengerText({ adults, children, infants }: PassengerCounts) {
  return [counted(adults, "adult", "adults"), children ? counted(children, "child", "children") : null, infants ? counted(infants, "infant", "infants") : null]
    .filter(Boolean).join(" · ");
}

// Customer, then one card per traveler, then (Group) the selling price. The Hold seats button sits
// in the fare panel and submits this form by its id.
export function BookingHoldForm({ formId, counts, canSubmit, onSubmit, errors, defaultSelling }: {
  formId: string;
  counts: PassengerCounts;
  canSubmit: boolean;
  /** Called with the typed values; the page builds its request, calls the gateway and reports errors back through `errors`. */
  onSubmit: (values: BookingValues) => void;
  errors: FormErrors;
  /** Group: the fare's selling price per adult (supplier price + markup), the selling price field's starting value. */
  defaultSelling?: Money | null;
}) {
  const [customer, setCustomer] = useState<BookingCustomer>(blankCustomer);
  const [travelers, setTravelers] = useState<BookingTraveler[]>(() => initialTravelers(counts));
  const [selling, setSelling] = useState<string | null>(null);
  const [localErrors, setLocalErrors] = useState<FormErrors | null>(null);
  const [picking, setPicking] = useState<"customer" | number | null>(null);
  const shown = localErrors ?? errors;
  const fieldError = (key: string) => shown.fields[key]?.join(" ");
  const sellingText = selling ?? (defaultSelling ? String(Math.round(defaultSelling.amount_minor / 100)) : "");
  const adults = travelers.filter(traveler => traveler.type === "ADT").length;
  const setTraveler = (index: number, change: Partial<BookingTraveler>) =>
    setTravelers(current => current.map((traveler, i) => (i === index ? { ...traveler, ...change } : traveler)));

  const submit = () => {
    if (!canSubmit) return;
    const noDocument = travelers.findIndex((traveler, index) => {
      const saved = savedFor(index, traveler, customer);
      return saved && saved.documents.length > 1 && !documentFor(traveler, saved);
    });
    if (noDocument >= 0) {
      setLocalErrors({ fields: { [`passengers.${noDocument}`]: ["Choose which saved document travels."] }, message: "Choose which saved document each saved traveler uses." });
      return;
    }
    const rupees = sellingText.trim();
    if (defaultSelling && !/^[1-9]\d*$/.test(rupees)) {
      setLocalErrors({ fields: { selling_price_per_adult: ["Enter the selling price in whole rupees."] }, message: "Check the selling price." });
      return;
    }
    setLocalErrors(null);
    onSubmit({ customer, travelers, sellingPerAdult: defaultSelling ? { amount_minor: Number(rupees) * 100, currency: defaultSelling.currency } : null });
  };

  const customerInput = (name: "full_name" | "phone" | "email" | "document_number", label: string, placeholder: string, type = "text") => (
    <Field id={`customer-${name}`} label={label} error={fieldError(`contact.${name}`)}>
      <Input id={`customer-${name}`} type={type} value={customer[name]} placeholder={placeholder} autoComplete="off" maxLength={name === "email" ? 50 : name === "document_number" ? 20 : 60}
        aria-invalid={Boolean(fieldError(`contact.${name}`))} aria-describedby={fieldError(`contact.${name}`) ? `customer-${name}-error` : undefined}
        onChange={event => setCustomer({ ...customer, [name]: event.target.value })} />
    </Field>
  );

  return (
    <>
      <form id={formId} noValidate aria-label="Traveler details" className="flex min-w-0 flex-col gap-section-gap" onSubmit={event => { event.preventDefault(); submit(); }}>
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
              {/* The gateway asks for these only when the saved customer has none (contact_incomplete). */}
              {(fieldError("contact.phone") || fieldError("contact.email") || customer.phone || customer.email) && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {customerInput("phone", "Phone", "+92 300 1234567", "tel")}
                  {customerInput("email", "Email", "name@example.com", "email")}
                </div>
              )}
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
                  <DocumentTypeSelect id="customer-id_type" value={customer.id_type} onChange={id_type => setCustomer({ ...customer, id_type })} />
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

        <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-body text-foreground">
          Passport, ID number and date of birth are never shown in full here. Type them in, or pick a saved traveler: the saved details then stay on the server, show masked, and the gateway fills them in for the hold.
        </p>

        {travelers.map((traveler, index) => {
          const number = travelers.slice(0, index + 1).filter(other => other.type === traveler.type).length;
          const label = `${TYPE_LABEL[traveler.type]} ${number}`;
          const key = (field: string) => `passengers.${index}.${field}`;
          const id = (field: string) => `traveler-${index}-${field}`;
          const saved = savedFor(index, traveler, customer);
          const savedCustomerIsAdult1 = index === 0 && customer.alsoAdult1 && Boolean(customer.saved);
          const fromCustomer = index === 0 && customer.alsoAdult1 && !customer.saved;
          const name = fromCustomer ? splitFullName(customer.full_name) : null;
          const titleSelect = (
            <Field id={id("title")} label="Title" error={fieldError(key("title"))}>
              <Select value={traveler.title} onValueChange={value => setTraveler(index, { title: value as Title, gender: genderOf(value as Title) })}>
                <SelectTrigger id={id("title")} className="h-control text-body" aria-invalid={Boolean(fieldError(key("title")))}><SelectValue /></SelectTrigger>
                <SelectContent>{TITLES[traveler.type].map(([value, text]) => <SelectItem key={value} value={value} className="text-body">{text}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          );
          const genderSelect = (
            <Field id={id("gender")} label="Gender" error={fieldError(key("gender"))}>
              <Select value={traveler.gender} onValueChange={value => setTraveler(index, { gender: value as Gender })}>
                <SelectTrigger id={id("gender")} className="h-control text-body" aria-invalid={Boolean(fieldError(key("gender")))}><SelectValue /></SelectTrigger>
                <SelectContent>{([["M", "Male"], ["F", "Female"]] as const).map(([value, text]) => <SelectItem key={value} value={value} className="text-body">{text}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          );
          const travelsWith = traveler.type === "INF" && (
            <Field id={id("travels_with")} label="Travels with" error={fieldError(key("travels_with"))} hint="Each infant needs its own adult">
              <Select value={String(traveler.travels_with)} onValueChange={value => setTraveler(index, { travels_with: Number(value) })}>
                <SelectTrigger id={id("travels_with")} className="h-control text-body"><SelectValue /></SelectTrigger>
                <SelectContent>{Array.from({ length: adults }, (_, adult) => <SelectItem key={adult} value={String(adult)} className="text-body">Adult {adult + 1}</SelectItem>)}</SelectContent>
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
          const date = (field: "date_of_birth" | "document_expiry", fieldLabel: string, hint?: string) => (
            <Field id={id(field)} label={fieldLabel} error={fieldError(key(field))} hint={hint}>
              <DayFirstDateField id={id(field)} value={traveler[field] || undefined} invalid={Boolean(fieldError(key(field)))}
                describedBy={fieldError(key(field)) ? `${id(field)}-error` : undefined}
                fromYear={field === "date_of_birth" ? 1900 : new Date().getFullYear()} toYear={field === "date_of_birth" ? new Date().getFullYear() : 2060}
                onChange={value => setTraveler(index, { [field]: value ?? "" })} />
            </Field>
          );
          const country = (field: "nationality" | "document_country", fieldLabel: string) => (
            <Field id={id(field)} label={fieldLabel} error={fieldError(key(field))}>
              <CountrySelect id={id(field)} value={traveler[field]} onChange={code => setTraveler(index, { [field]: code })}
                invalid={Boolean(fieldError(key(field)))} describedBy={fieldError(key(field)) ? `${id(field)}-error` : undefined} />
            </Field>
          );
          return (
            <section key={index} aria-label={label} className={CARD}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-section font-semibold text-brand-navy">{label}</h2>
                {!savedCustomerIsAdult1 && (
                  <Button type="button" variant="outline" aria-label={`${saved ? "Change" : "Use saved traveler"}, ${label}`} onClick={() => setPicking(index)}>
                    {saved ? "Change" : "Use saved traveler"}
                  </Button>
                )}
              </div>
              {fieldError(`passengers.${index}`) && <p role="alert" className="text-body text-status-critical-text">{fieldError(`passengers.${index}`)}</p>}
              {saved ? (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3 sm:max-w-md">
                    {titleSelect}
                    {genderSelect}
                    {travelsWith}
                  </div>
                  <SavedCard person={saved} label={savedCustomerIsAdult1 ? "Saved customer" : "Saved traveler"}
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
                    {titleSelect}
                    {text("first_name", "Given name", name ? name.first : traveler.first_name, Boolean(name))}
                    {text("last_name", "Surname", name ? name.last : traveler.last_name, Boolean(name))}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {genderSelect}
                    {date("date_of_birth", "Date of birth", traveler.type === "ADT" && counts.children + counts.infants === 0 ? undefined : AGE_HINT[traveler.type])}
                    {traveler.type !== "INF" && country("nationality", "Nationality")}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                    <Field id={id("id_type")} label="Document type" error={fieldError(key("id_type"))}>
                      <DocumentTypeSelect id={id("id_type")} value={fromCustomer ? customer.id_type : traveler.id_type} disabled={fromCustomer}
                        onChange={id_type => setTraveler(index, { id_type })} />
                    </Field>
                    {text("document_number", "Document number", fromCustomer ? customer.document_number : traveler.document_number, fromCustomer)}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {date("document_expiry", "Document expiry")}
                    {country("document_country", "Issuing country")}
                    {travelsWith}
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

        {shown.message && <Notice tone="critical">{shown.message}</Notice>}
      </form>

      {/* Outside the form: the picker's own search form must not submit the booking form (React events bubble through portals). */}
      <SavedPersonPicker
          open={picking !== null}
          title={picking === "customer" ? "Find a saved customer" : "Use a saved traveler"}
          description={picking === "customer"
            ? "Search by passport or CNIC number first, or phone, email or name. Details stay masked; the server fills them in."
            : "Pick the traveler. Name, date of birth and document stay on the server, masked here, and are filled in for the hold."}
          initialQuery={picking === "customer" ? customer.query : undefined}
          suggested={picking !== "customer" && customer.saved ? [customer.saved] : []}
          onClose={() => setPicking(null)}
          onPick={person => {
            if (picking === "customer") setCustomer({ ...customer, saved: person, phone: "", email: "" });
            else if (typeof picking === "number") {
              const options = TITLES[travelers[picking].type];
              const title = options.some(([value]) => value === person.title) ? person.title as Title : travelers[picking].title;
              setTraveler(picking, { saved: person, documentId: person.documents.length === 1 ? person.documents[0].id : null, title, gender: genderOf(title) });
            }
            setPicking(null);
          }}
        />
    </>
  );
}

/** The admin-only cost block in the fare panel. The gateway sends these only with the cost and margin
 *  permission (provider names only with the supplier names permission); nothing shows otherwise. */
export function AdminOnlyCost({ provider, source, supplierCost, margin }: {
  provider?: string | null; source?: string | null; supplierCost?: string | null; margin?: string | null;
}) {
  if (!provider && !source && !supplierCost && !margin) return null;
  return (
    <div aria-label="Admin only" className="flex flex-col gap-0.5 rounded-md border border-dashed border-border px-2.5 py-2 text-label text-muted-foreground">
      <p className="font-semibold text-foreground">Admin only</p>
      {provider && <p className="truncate" title={provider}>Provider: {provider}</p>}
      {source && <p className="truncate" title={source}>Source: {source}</p>}
      {(supplierCost || margin) && <p>{[supplierCost && `Supplier cost ${supplierCost}`, margin && `Margin ${margin}`].filter(Boolean).join(" · ")}</p>}
      <p>(only with the cost and margin permission)</p>
    </div>
  );
}

export const money = (value?: Money | null) => (value ? formatMoney(value) : null);

/** The right-hand panel: the selected fare, how its price is confirmed, the admin-only block and Hold seats. */
export function FarePanel({ title, children, pricing, adminOnly, notice, formId, canHold, pending, footnote }: {
  title: string;
  children: ReactNode;
  /** Flights: the fare-confirmed badge and timer. Group: "The price is confirmed when the seats are held." */
  pricing: ReactNode;
  adminOnly?: ReactNode;
  /** Why the fare can't be held (seats, provider), shown above the button. */
  notice?: ReactNode;
  formId: string;
  canHold: boolean;
  pending: boolean;
  footnote: string;
}) {
  return (
    <aside aria-labelledby="selected-fare-title" className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card px-card py-4 shadow-card lg:sticky lg:top-4">
      <h2 id="selected-fare-title" className="font-display text-section font-semibold text-brand-navy">{title}</h2>
      {children}
      {pricing}
      {adminOnly}
      {notice}
      <Button type="submit" form={formId} variant="primary" className="w-full" disabled={!canHold || pending}>
        {pending ? "Holding seats…" : "Hold seats"}
      </Button>
      <p className="text-helper text-muted-foreground">{footnote}</p>
    </aside>
  );
}

/** The page frame: Back to results, title and subtitle, the 4-step stepper, then form and panel side by side. */
export function BookingHoldLayout({ backTo, title, subtitle, children }: { backTo: string; title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-section-gap">
      <div className="flex flex-col gap-3">
        <Link to={backTo} className="inline-flex items-center gap-1 self-start text-label font-medium text-teal hover:underline">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />Back to results
        </Link>
        <div>
          <h1 className="font-display text-page-title font-bold text-brand-navy">{title}</h1>
          <p className="text-body text-muted-foreground">{subtitle}</p>
        </div>
        <GroupBookingSteps current={2} />
      </div>
      {children}
    </div>
  );
}

/** Form on the left, fare panel on the right (stacked on small screens). */
export function BookingHoldColumns({ form, panel }: { form: ReactNode; panel: ReactNode }) {
  return (
    <div className="grid min-w-0 grid-cols-1 items-start gap-section-gap lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
      <div className="min-w-0 lg:order-1">{form}</div>
      <div className="min-w-0 lg:order-2">{panel}</div>
    </div>
  );
}
