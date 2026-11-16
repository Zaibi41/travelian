import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { Checkbox } from "@/components/admin/ui/choice";
import { FieldLabel, Input } from "@/components/admin/ui/field";
import { Tag } from "@/components/admin/ui/StatusBadge";
import { Notice } from "@/components/admin/ui/feedback";
import { DayFirstDateField } from "@/components/admin/ui/DayFirstDateField";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PersonTypeahead } from "@/components/admin/people/PersonTypeahead";
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
  /** Given name(s) and surname, as on the document (airlines need both). */
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  id_type: IdType;
  document_number: string;
  alsoAdult1: boolean;
  save: boolean;
  /** A saved customer (the gateway loads the details). */
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
  first_name: "", last_name: "", phone: "", email: "", id_type: "PSPT", document_number: "", alsoAdult1: true, save: true, saved: null,
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

/** The fields Adult 1 shares with the customer while "The customer is also Adult 1" is ticked (one value, editable on both). */
const MIRRORED = ["first_name", "last_name", "id_type", "document_number"] as const;
type MirroredField = (typeof MIRRORED)[number];

/** The form's labels for the gateway's field names, so messages say "Surname is required", not "last_name". */
const FIELD_LABELS: Record<string, string> = {
  first_name: "Given name", last_name: "Surname", full_name: "Given name and surname", phone: "Phone", phone_code: "Phone", email: "Email",
  title: "Title", gender: "Gender", date_of_birth: "Date of birth", nationality: "Nationality", id_type: "Document type",
  document_number: "Document number", document_expiry: "Document expiry", document_country: "Issuing country", travels_with: "Travels with",
  selling_price_per_adult: "Selling price per adult",
};

/** A field error in the form's words: "Surname is required" for a missing value, "Email isn't valid" for a pattern
 *  the gateway rejects; the gateway's own sentence otherwise. */
function fieldMessage(key: string, message: string) {
  const label = FIELD_LABELS[key.split(".").pop() ?? ""];
  if (!label) return message;
  if (/^(field )?required\b|^required[.:]|missing|is required/i.test(message)) return `${label} is required`;
  if (/should match pattern|string_pattern|not a valid/i.test(message)) return `${label} isn't valid`;
  return message;
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
      first_name: customer.first_name.trim(), last_name: customer.last_name.trim(), phone: customer.phone.trim(), email: customer.email.trim(), id_type: customer.id_type,
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
  const name = fromCustomer ? { first: customer.first_name, last: customer.last_name } : { first: traveler.first_name, last: traveler.last_name };
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

/** A saved person on a card: name and document; a choice when several documents are saved. */
function SavedCard({ person, label, documentId, onDocument, contact = false }: {
  person: PersonSummary; label: string; documentId?: string | null; onDocument?: (id: string) => void;
  /** The customer: also show the saved phone and email, which the hold uses. */
  contact?: boolean;
}) {
  const documents = person.documents;
  const contactLine = [person.phone, person.email].filter(Boolean).join(" · ");
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-body font-semibold text-foreground" title={fullName(person)}>{fullName(person)}</p>
          {documents.length <= 1 && (
            <p className="truncate text-label text-muted-foreground">
              {documents[0] ? `${ID_TYPE_LABEL[documents[0].id_type]} ${documents[0].document_number}` : contactLine || "No document saved"}
            </p>
          )}
          {contact && documents.length > 0 && (
            <p className="truncate text-label text-muted-foreground" title={contactLine || undefined}>{contactLine || "No phone or email saved"}</p>
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
              <span className="truncate">{ID_TYPE_LABEL[document.id_type]} {document.document_number}</span>
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
  const shown = localErrors ?? errors;
  const fieldError = (key: string) => shown.fields[key]?.map(message => fieldMessage(key, message)).join(" ");
  const sellingText = selling ?? (defaultSelling ? String(Math.round(defaultSelling.amount_minor / 100)) : "");
  const adults = travelers.filter(traveler => traveler.type === "ADT").length;
  const setTraveler = (index: number, change: Partial<BookingTraveler>) =>
    setTravelers(current => current.map((traveler, i) => (i === index ? { ...traveler, ...change } : traveler)));
  /** Adult 1 shares its name and document with the typed customer while "The customer is also Adult 1" is ticked. */
  const mirrored = (index: number) => index === 0 && customer.alsoAdult1 && !customer.saved;
  const travelerValue = (index: number, field: MirroredField) => (mirrored(index) ? customer[field] : travelers[index][field]);
  const setTravelerValue = (index: number, field: MirroredField, value: string) => (mirrored(index)
    ? setCustomer(current => ({ ...current, [field]: value }))
    : setTraveler(index, { [field]: value } as Partial<BookingTraveler>));
  const setAlsoAdult1 = (alsoAdult1: boolean) => {
    // Unticking keeps what Adult 1 showed, so nothing typed is lost.
    if (!alsoAdult1 && !customer.saved) setTraveler(0, Object.fromEntries(MIRRORED.map(field => [field, customer[field]])) as Partial<BookingTraveler>);
    setCustomer(current => ({ ...current, alsoAdult1 }));
  };

  const cardLabel = (index: number) => {
    const traveler = travelers[index];
    return traveler ? `${TYPE_LABEL[traveler.type]} ${travelers.slice(0, index + 1).filter(other => other.type === traveler.type).length}` : `Traveler ${index + 1}`;
  };

  /** Required before calling the gateway: the customer's name, phone and email (typed); each typed traveler's name and
   *  date of birth. Each missing field gets its message under it; the banner lists them. */
  const missingFields = () => {
    const fields: Record<string, string[]> = {};
    const need = (key: string, value: string) => { if (!value.trim()) fields[key] = [`${FIELD_LABELS[key.split(".").pop()!]} is required`]; };
    if (!customer.saved) for (const name of ["first_name", "last_name", "phone", "email"] as const) need(`contact.${name}`, customer[name]);
    travelers.forEach((traveler, index) => {
      if (savedFor(index, traveler, customer)) return;
      need(`passengers.${index}.first_name`, travelerValue(index, "first_name"));
      need(`passengers.${index}.last_name`, travelerValue(index, "last_name"));
      need(`passengers.${index}.date_of_birth`, traveler.date_of_birth);
    });
    return fields;
  };

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
    const missing = missingFields();
    if (Object.keys(missing).length) {
      setLocalErrors({ fields: missing, message: null });
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

  const customerInput = (name: "first_name" | "last_name" | "phone" | "email" | "document_number", label: string, placeholder: string, type = "text") => (
    <Field id={`customer-${name}`} label={label} error={fieldError(`contact.${name}`)}>
      <Input id={`customer-${name}`} type={type} value={customer[name]} placeholder={placeholder} autoComplete="off"
        maxLength={name === "email" ? 50 : name === "document_number" ? 20 : name === "phone" ? 24 : 30}
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
            <PersonTypeahead id="customer-find" label="Find saved customer" kind="customer" placeholder="Name, phone, email, or passport or CNIC number"
              emptyText="No saved customer matches. Type the details below to add one."
              onPick={person => setCustomer(current => ({ ...current, saved: person, phone: "", email: "" }))} />
          </div>
          {customer.saved ? (
            <div className="flex flex-col gap-2">
              <SavedCard person={customer.saved} label="Saved customer" contact />
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {customerInput("first_name", "Given name", "As on the document")}
                {customerInput("last_name", "Surname", "As on the document")}
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
              <Checkbox checked={customer.alsoAdult1} onCheckedChange={checked => setAlsoAdult1(checked === true)} />
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
          const number = travelers.slice(0, index + 1).filter(other => other.type === traveler.type).length;
          const label = `${TYPE_LABEL[traveler.type]} ${number}`;
          const key = (field: string) => `passengers.${index}.${field}`;
          const id = (field: string) => `traveler-${index}-${field}`;
          const saved = savedFor(index, traveler, customer);
          const savedCustomerIsAdult1 = index === 0 && customer.alsoAdult1 && Boolean(customer.saved);
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
          // Always editable; on Adult 1 with "The customer is also Adult 1" the value is the customer's, kept in step both ways.
          const text = (field: "first_name" | "last_name" | "document_number", fieldLabel: string) => (
            <Field id={id(field)} label={fieldLabel} error={fieldError(key(field))}>
              <Input id={id(field)} value={travelerValue(index, field)} autoComplete="off" maxLength={field === "document_number" ? 20 : 25}
                aria-invalid={Boolean(fieldError(key(field)))} aria-describedby={fieldError(key(field)) ? `${id(field)}-error` : undefined}
                onChange={event => setTravelerValue(index, field, event.target.value)} />
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
                {!savedCustomerIsAdult1 && saved && (
                  <Button type="button" variant="outline" aria-label={`Change, ${label}`} onClick={() => setTraveler(index, { saved: null, documentId: null })}>Change</Button>
                )}
              </div>
              {!saved && (
                <div className="flex flex-col gap-1">
                  <FieldLabel htmlFor={id("find")}>Use saved traveler</FieldLabel>
                  <PersonTypeahead id={id("find")} label={`Use saved traveler, ${label}`} kind="traveler" placeholder="Name or passport or CNIC number"
                    emptyText="No saved traveler matches. Type the details below."
                    onPick={person => {
                      const title = TITLES[traveler.type].some(([value]) => value === person.title) ? person.title as Title : traveler.title;
                      setTraveler(index, { saved: person, documentId: person.documents.length === 1 ? person.documents[0].id : null, title, gender: genderOf(title) });
                    }} />
                </div>
              )}
              {fieldError(`passengers.${index}`) && <p role="alert" className="text-body text-status-critical-text">{fieldError(`passengers.${index}`)}</p>}
              {saved ? (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {titleSelect}
                    {genderSelect}
                    {/* Locked: the saved record holds the document (choose another saved document below, or type details instead). */}
                    <Field id={id("id_type")} label="Document type">
                      <DocumentTypeSelect id={id("id_type")} disabled
                        value={(saved.documents.find(document => document.id === documentFor(traveler, saved)) ?? saved.documents[0])?.id_type === "NATI" ? "NATI" : "PSPT"}
                        onChange={() => undefined} />
                    </Field>
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
                    {text("first_name", "Given name")}
                    {text("last_name", "Surname")}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {genderSelect}
                    {date("date_of_birth", "Date of birth", traveler.type === "ADT" && counts.children + counts.infants === 0 ? undefined : AGE_HINT[traveler.type])}
                    {traveler.type !== "INF" && country("nationality", "Nationality")}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                    <Field id={id("id_type")} label="Document type" error={fieldError(key("id_type"))}>
                      <DocumentTypeSelect id={id("id_type")} value={travelerValue(index, "id_type") as IdType}
                        onChange={id_type => setTravelerValue(index, "id_type", id_type)} />
                    </Field>
                    {text("document_number", "Document number")}
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

        {(() => {
          // The banner names the fields to fix, in the form's words ("Surname (Adult 1)"), else the gateway's sentence.
          const fields = Object.keys(shown.fields).filter(key => FIELD_LABELS[key.split(".").pop() ?? ""]).map(key => {
            const [scope, position] = key.split(".");
            const where = scope === "contact" ? "Customer" : scope === "passengers" ? cardLabel(Number(position)) : null;
            return `${FIELD_LABELS[key.split(".").pop()!]}${where ? ` (${where})` : ""}`;
          });
          const unique = [...new Set(fields)];
          const list = unique.length ? `Check ${unique.length === 1 ? "this field" : "these fields"}: ${unique.join(", ")}.` : null;
          // A specific sentence from the gateway ("Sana is under 12 ...") stays; a generic one gives way to the list.
          const generic = !shown.message || /^(some details need correcting|check the customer's details)/i.test(shown.message);
          const text = [generic && list ? null : shown.message, list].filter(Boolean).join(" ");
          return text ? <Notice tone="critical">{text}</Notice> : null;
        })()}
      </form>

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
