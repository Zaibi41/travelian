import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, X } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { Checkbox } from "@/components/admin/ui/choice";
import { FieldLabel, Input } from "@/components/admin/ui/field";
import { Tag } from "@/components/admin/ui/StatusBadge";
import { Notice } from "@/components/admin/ui/feedback";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PersonTypeahead } from "@/components/admin/people/PersonTypeahead";
import { PassengerFields } from "@/components/booking/PassengerFields";
import { GroupBookingSteps } from "./GroupBookingSteps";
import { DEFAULT_COUNTRY_CODE } from "@/data/countries";
import type { GatewayFieldError } from "@/lib/gateway/client";
import type { PersonSummary } from "@/lib/saved-people/api";
import { fullName } from "@/lib/saved-people/states";
import { formatMoney } from "@/lib/admin-bookings/format";
import { countryCode } from "@/lib/public-booking";
import {
  AGE_TEXT, FORM_TITLE, GATEWAY_TITLE, createPassengerDetails, passengerErrors, usesPassport, type PassengerDetails, type PassengerKind,
} from "@/lib/passenger-details";
import { cn } from "@/lib/utils";

// One booking form for every admin hold (Search > Flights and Search > Group Ticketing; the Group
// "Hold group seats" page is the standard). The two flows differ only by the props they pass:
// passenger types and counts, the right-hand fare panel (Flights: fare-confirmed timer; Group:
// confirmed at hold), the selling price card (Group) and what the page does with the values.
// Each traveler card is the website checkout's passenger form (PassengerFields: same fields, order, labels and
// checks). The gateway checks every value and decides every amount; nothing here computes money.

export type PassengerType = "ADT" | "CHD" | "INF";
type IdType = "PSPT" | "NATI";
export interface Money { amount_minor: number; currency: string }

export const CARD = "flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-card px-card py-4 shadow-card";
const TYPE_LABEL: Record<PassengerType, string> = { ADT: "Adult", CHD: "Child", INF: "Infant" };
const KIND: Record<PassengerType, PassengerKind> = { ADT: "adult", CHD: "child", INF: "infant" };

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
  /** The existing customer picked with Search existing customer: the form is filled from it and stays editable; the
   *  gateway updates that record (never a second one). */
  saved: PersonSummary | null;
}

export interface BookingTraveler {
  type: PassengerType;
  /** The website's passenger fields (names, title, gender, date of birth, document, countries, expiry). */
  details: PassengerDetails;
  /** Infants: the adult it travels with, counted among adults from 0. */
  travels_with: number;
  save: boolean;
  /** The saved traveler the card was filled from (the gateway links the details to them by document number). */
  picked: PersonSummary | null;
}

export interface PassengerCounts { adults: number; children: number; infants: number }

export const blankCustomer = (): BookingCustomer => ({
  first_name: "", last_name: "", phone: "", email: "", id_type: "PSPT", document_number: "", alsoAdult1: true, save: true, saved: null,
});

export const blankTraveler = (type: PassengerType = "ADT", travelsWith = 0, label = TYPE_LABEL[type]): BookingTraveler => ({
  // Countries as ISO alpha-3 codes: the admin's country list (PassengerFields "admin").
  type, details: { ...createPassengerDetails(KIND[type], label), nationality: DEFAULT_COUNTRY_CODE, issuanceCountry: DEFAULT_COUNTRY_CODE },
  travels_with: travelsWith, save: true, picked: null,
});

/** One card per traveler from the search counts: adults, then children, then infants (infant n with adult n). */
export function initialTravelers({ adults, children, infants }: PassengerCounts): BookingTraveler[] {
  return [
    ...Array.from({ length: adults }, (_, index) => blankTraveler("ADT", 0, `Adult ${index + 1}`)),
    ...Array.from({ length: children }, (_, index) => blankTraveler("CHD", 0, `Child ${index + 1}`)),
    ...Array.from({ length: infants }, (_, index) => blankTraveler("INF", Math.min(index, Math.max(adults - 1, 0)), `Infant ${index + 1}`)),
  ];
}

/** The saved document to fill from: a passport still valid, else any passport, else the first document. */
function bestDocument(person: PersonSummary) {
  const passports = person.documents.filter(document => document.id_type === "PSPT");
  return passports.find(document => document.document_validity !== "expired") ?? passports[0] ?? person.documents[0];
}

/** A saved person into the card's fields (everything stays editable). */
export function detailsFromPerson(person: PersonSummary, current: PassengerDetails): PassengerDetails {
  const document = bestDocument(person);
  const title = person.title ? FORM_TITLE[person.title] ?? current.title : current.title;
  const gender = title === "mr" || title === "master" ? "male" : title === "mrs" || title === "miss" || title === "ms" ? "female" : current.gender;
  return {
    ...current, title, gender, firstName: person.first_name, lastName: person.last_name, dob: person.date_of_birth ?? current.dob,
    nationality: person.nationality ?? current.nationality,
    docType: document ? (document.id_type === "NATI" ? "cnic" : "passport") : current.docType,
    docNumber: document?.document_number ?? current.docNumber,
    issuanceCountry: document?.id_type === "PSPT" ? document.document_country : current.issuanceCountry,
    expiryDate: document?.id_type === "PSPT" ? document.document_expiry ?? undefined : undefined,
  };
}

/** Adult 1 shows the customer's name and document while "The customer is also Adult 1" is ticked. */
export const shownDetails = (index: number, traveler: BookingTraveler, customer: BookingCustomer): PassengerDetails =>
  index === 0 && customer.alsoAdult1
    ? { ...traveler.details, firstName: customer.first_name, lastName: customer.last_name,
      docType: customer.id_type === "NATI" ? "cnic" : "passport", docNumber: customer.document_number }
    : traveler.details;

/** The form's labels for the gateway's field names (the website's words), so messages say "Last Name is required". */
const FIELD_LABELS: Record<string, string> = {
  first_name: "First Name", last_name: "Last Name", full_name: "First and last name", phone: "Mobile Number", phone_code: "Mobile Number", email: "Email",
  title: "Title", gender: "Gender", date_of_birth: "Date of Birth", nationality: "Nationality", id_type: "Document",
  document_number: "Document number", document_expiry: "Date of Expiry", document_country: "Country of Issuance", travels_with: "Travels with",
  selling_price_per_adult: "Selling price per adult",
};

/** Gateway field names <-> the shared passenger fields. */
const TO_FIELD: Record<string, string> = {
  first_name: "firstName", last_name: "lastName", date_of_birth: "dob", document_number: "docNumber", document_expiry: "expiryDate",
  document_country: "issuanceCountry", id_type: "docType", title: "title", gender: "gender", nationality: "nationality",
};
const TO_GATEWAY = Object.fromEntries(Object.entries(TO_FIELD).map(([gateway, field]) => [field, gateway]));

/** A field error in the form's words: "Last Name is required" for a missing value, "Email isn't valid" for a pattern
 *  the gateway rejects; the gateway's own sentence otherwise. */
function fieldMessage(key: string, message: string) {
  const label = FIELD_LABELS[key.split(".").pop() ?? ""];
  if (!label) return message;
  if (/^(field )?required\b|^required[.:]|missing|is required/i.test(message)) return `${label} is required`;
  if (/should match pattern|string_pattern|not a valid/i.test(message)) return `${label} isn't valid`;
  return message;
}

const optional = (value: string) => value.trim() || null;

/** The customer card both hold endpoints take. Typed values always go; with an existing customer its id goes too, so
 *  the gateway updates that record (newer phone, email, document) instead of creating another. */
export function customerCard(customer: BookingCustomer) {
  return {
    ...(customer.saved ? { customer_id: customer.saved.id } : {}),
    first_name: customer.first_name.trim(), last_name: customer.last_name.trim(), phone: customer.phone.trim(), email: customer.email.trim(),
    id_type: customer.id_type, document_number: optional(customer.document_number),
    save_for_next_time: customer.saved ? true : customer.save,
  };
}

/** One passenger for the hold request: the typed details (a picked saved traveler is matched by the gateway on the
 *  document number, so no duplicate is made). `withGender`: the Group hold checks the gender against the title. */
export function passengerRequest(traveler: BookingTraveler, index: number, customer: BookingCustomer, withGender: boolean) {
  const details = shownDetails(index, traveler, customer);
  const passport = usesPassport(details);
  const infant = traveler.type === "INF" ? { travels_with: traveler.travels_with } : {};
  const gender = withGender ? { gender: details.gender === "female" ? "F" : "M" } : {};
  return {
    type: traveler.type, title: GATEWAY_TITLE[details.title] ?? "MR", ...gender,
    first_name: details.firstName.trim() || null, last_name: details.lastName.trim() || null, date_of_birth: details.dob || null,
    id_type: passport ? "PSPT" : "NATI", document_number: optional(details.docNumber.replace(/[\s-]/g, "").toUpperCase()),
    document_country: passport ? countryCode(details.issuanceCountry) ?? null : "PAK", nationality: countryCode(details.nationality) ?? null,
    document_expiry: passport ? details.expiryDate || null : null, ...infant, save_for_next_time: traveler.save,
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

/** "Filled from <name>" above a card filled from a saved record, with a way to clear it. */
function FilledFrom({ person, what, onClear }: { person: PersonSummary; what: string; onClear: () => void }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
      <p className="min-w-0 truncate text-body text-foreground" title={fullName(person)}>
        <span className="text-muted-foreground">Filled from {what}: </span><span className="font-semibold">{fullName(person)}</span>
      </p>
      <Button type="button" variant="ghost" size="sm" onClick={onClear} aria-label={`Clear ${what}`}><X className="h-4 w-4" aria-hidden="true" />Clear</Button>
    </div>
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
export function BookingHoldForm({ formId, counts, canSubmit, onSubmit, errors, defaultSelling, travelDate }: {
  formId: string;
  counts: PassengerCounts;
  canSubmit: boolean;
  /** Called with the typed values; the page builds its request, calls the gateway and reports errors back through `errors`. */
  onSubmit: (values: BookingValues) => void;
  errors: FormErrors;
  /** Group: the fare's selling price per adult (supplier price + markup), the selling price field's starting value. */
  defaultSelling?: Money | null;
  /** The last travel date (ISO): passports must be valid after it. */
  travelDate?: string;
}) {
  const [customer, setCustomer] = useState<BookingCustomer>(blankCustomer);
  const [travelers, setTravelers] = useState<BookingTraveler[]>(() => initialTravelers(counts));
  const [selling, setSelling] = useState<string | null>(null);
  const [localErrors, setLocalErrors] = useState<FormErrors | null>(null);
  const shown = localErrors ?? errors;
  // The form's own checks are already in the website's words; only the gateway's technical ones are reworded.
  const fieldError = (key: string) => shown.fields[key]?.map(message => (localErrors ? message : fieldMessage(key, message))).join(" ");
  const sellingText = selling ?? (defaultSelling ? String(Math.round(defaultSelling.amount_minor / 100)) : "");
  const adults = travelers.filter(traveler => traveler.type === "ADT").length;
  const setTraveler = (index: number, change: Partial<BookingTraveler>) =>
    setTravelers(current => current.map((traveler, i) => (i === index ? { ...traveler, ...change } : traveler)));
  const setDetails = (index: number, patch: Partial<PassengerDetails>) =>
    setTravelers(current => current.map((traveler, i) => (i === index ? { ...traveler, details: { ...traveler.details, ...patch } } : traveler)));
  /** Adult 1's name and document are the customer's while "The customer is also Adult 1" is ticked (one value, editable on both). */
  const changeTraveler = (index: number, patch: Partial<PassengerDetails>) => {
    if (index === 0 && customer.alsoAdult1) {
      const { firstName, lastName, docType, docNumber, ...rest } = patch;
      setCustomer(current => ({
        ...current,
        ...(firstName !== undefined ? { first_name: firstName } : {}),
        ...(lastName !== undefined ? { last_name: lastName } : {}),
        ...(docType !== undefined ? { id_type: docType === "cnic" ? "NATI" as const : "PSPT" as const } : {}),
        ...(docNumber !== undefined ? { document_number: docNumber } : {}),
      }));
      if (Object.keys(rest).length) setDetails(0, rest);
      return;
    }
    setDetails(index, patch);
  };
  const setAlsoAdult1 = (alsoAdult1: boolean) => {
    // Unticking keeps what Adult 1 showed, so nothing typed is lost.
    if (!alsoAdult1 && travelers[0]) setDetails(0, shownDetails(0, travelers[0], customer));
    setCustomer(current => ({ ...current, alsoAdult1 }));
  };

  const cardLabel = (index: number) => travelers[index]?.details.label ?? `Traveler ${index + 1}`;

  /** Search existing customer: fill the customer card (and Adult 1 when the customer travels), all still editable. */
  const pickCustomer = (person: PersonSummary) => {
    const document = bestDocument(person);
    setCustomer(current => ({
      ...current, saved: person, first_name: person.first_name, last_name: person.last_name, phone: person.phone ?? "", email: person.email ?? "",
      id_type: document?.id_type === "NATI" ? "NATI" : "PSPT", document_number: document?.document_number ?? "",
    }));
    if (customer.alsoAdult1 && travelers[0]) {
      const { firstName: _first, lastName: _last, docType: _type, docNumber: _number, ...rest } = detailsFromPerson(person, travelers[0].details);
      setDetails(0, rest);
    }
    setLocalErrors(null);
  };

  /** Required before calling the gateway: the customer's name, phone and email; each traveler as on the website
   *  (lib/passenger-details). Each problem shows under its field; the banner lists them. */
  const missingFields = () => {
    const fields: Record<string, string[]> = {};
    for (const name of ["first_name", "last_name", "phone", "email"] as const) {
      if (!customer[name].trim()) fields[`contact.${name}`] = [`${FIELD_LABELS[name]} is required`];
    }
    travelers.forEach((traveler, index) => {
      for (const [field, message] of Object.entries(passengerErrors(shownDetails(index, traveler, customer), travelDate))) {
        fields[`passengers.${index}.${TO_GATEWAY[field] ?? field}`] = [message as string];
      }
    });
    return fields;
  };

  const submit = () => {
    if (!canSubmit) return;
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

  /** One traveler's errors for the shared fields: "passengers.0.first_name" -> firstName. */
  const travelerErrors = (index: number) => Object.fromEntries(Object.keys(shown.fields)
    .filter(key => key.startsWith(`passengers.${index}.`))
    .map(key => { const name = key.split(".").pop()!; return [TO_FIELD[name] ?? name, fieldError(key)]; }));

  const customerInput = (name: "first_name" | "last_name" | "phone" | "email" | "document_number", label: string, placeholder: string, type = "text") => (
    <Field id={`customer-${name}`} label={label} error={fieldError(`contact.${name}`)}>
      <Input id={`customer-${name}`} type={type} value={customer[name]} placeholder={placeholder} autoComplete="off"
        maxLength={name === "email" ? 50 : name === "document_number" ? 20 : name === "phone" ? 24 : 30}
        aria-invalid={Boolean(fieldError(`contact.${name}`))} aria-describedby={fieldError(`contact.${name}`) ? `customer-${name}-error` : undefined}
        onChange={event => setCustomer({ ...customer, [name]: name === "document_number" && customer.id_type === "NATI" ? event.target.value.replace(/[^\d]/g, "") : event.target.value })} />
    </Field>
  );

  return (
    <>
      <form id={formId} noValidate aria-label="Traveler details" className="flex min-w-0 flex-col gap-section-gap" onSubmit={event => { event.preventDefault(); submit(); }}>
        <section aria-labelledby="customer-title" className={CARD}>
          <div>
            <h2 id="customer-title" className="font-display text-section font-semibold text-brand-navy">Customer</h2>
            <p className="text-body text-muted-foreground">The person who pays for this booking. Search for an existing customer, or type the details to add one.</p>
          </div>
          <div className="flex flex-col gap-1">
            <FieldLabel htmlFor="customer-find">Search existing customer</FieldLabel>
            <PersonTypeahead id="customer-find" label="Search existing customer" kind="customer" placeholder="Name, phone, email, or passport or CNIC number"
              emptyText="No customer matches. Type the details below: a new customer is saved with the booking."
              onPick={pickCustomer} />
          </div>
          {customer.saved && (
            <FilledFrom person={customer.saved} what="existing customer"
              onClear={() => setCustomer(current => ({ ...blankCustomer(), alsoAdult1: current.alsoAdult1 }))} />
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {customerInput("first_name", "First Name *", "Given Name")}
            {customerInput("last_name", "Last Name *", "Surnames")}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {customerInput("phone", "Mobile Number *", "+92 300 1234567", "tel")}
            {customerInput("email", "Email *", "name@example.com", "email")}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field id="customer-id_type" label="Document">
              <Select value={customer.id_type} onValueChange={id_type => setCustomer({ ...customer, id_type: id_type as IdType, document_number: "" })}>
                <SelectTrigger id="customer-id_type" className="h-control text-body"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PSPT" className="text-body">Passport</SelectItem>
                  <SelectItem value="NATI" className="text-body">CNIC / B-form (Pakistan)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {customerInput("document_number", customer.id_type === "NATI" ? "CNIC / B-form Number" : "Passport Number",
              customer.id_type === "NATI" ? "e.g. 3520112345671" : "e.g. AB1234567")}
          </div>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-body text-foreground">
              <Checkbox checked={customer.alsoAdult1} onCheckedChange={checked => setAlsoAdult1(checked === true)} />
              The customer is also Adult 1
            </label>
            {customer.saved ? (
              <p className="text-helper text-muted-foreground">Changes to the phone, email or document are saved to this customer's record.</p>
            ) : (
              <label className="flex items-center gap-2 text-body text-foreground">
                <Checkbox checked={customer.save} onCheckedChange={checked => setCustomer({ ...customer, save: checked === true })} />
                Save this customer for next time
              </label>
            )}
          </div>
        </section>

        {travelers.map((traveler, index) => {
          const label = traveler.details.label;
          const id = (field: string) => `traveler-${index}-${field}`;
          const customerIsAdult1 = index === 0 && customer.alsoAdult1;
          return (
            <section key={index} aria-label={label} className={CARD}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-section font-semibold text-brand-navy">{label}</h2>
                  <p className="text-label text-muted-foreground">{AGE_TEXT[traveler.details.passengerType]}</p>
                </div>
                {customerIsAdult1 && <Tag tone="teal">The customer</Tag>}
              </div>
              {!customerIsAdult1 && (
                traveler.picked ? (
                  <FilledFrom person={traveler.picked} what="saved traveler" onClear={() => setTravelers(current => current.map((entry, i) => (
                    i === index ? { ...blankTraveler(entry.type, entry.travels_with, entry.details.label), save: entry.save } : entry)))} />
                ) : (
                  <div className="flex flex-col gap-1">
                    <FieldLabel htmlFor={id("find")}>Use saved traveler</FieldLabel>
                    <PersonTypeahead id={id("find")} label={`Use saved traveler, ${label}`} kind="traveler" placeholder="Name or passport or CNIC number"
                      emptyText="No saved traveler matches. Type the details below."
                      onPick={person => setTraveler(index, { picked: person, details: detailsFromPerson(person, traveler.details) })} />
                  </div>
                )
              )}
              {fieldError(`passengers.${index}`) && <p role="alert" className="text-body text-status-critical-text">{fieldError(`passengers.${index}`)}</p>}
              <PassengerFields idPrefix={`traveler-${index}`} appearance="admin" travelDate={travelDate}
                value={shownDetails(index, traveler, customer)} onChange={patch => changeTraveler(index, patch)} errors={travelerErrors(index)} />
              {traveler.type === "INF" && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field id={id("travels_with")} label="Travels with" error={fieldError(`passengers.${index}.travels_with`)} hint="Each infant needs its own adult">
                    <Select value={String(traveler.travels_with)} onValueChange={value => setTraveler(index, { travels_with: Number(value) })}>
                      <SelectTrigger id={id("travels_with")} className="h-control text-body"><SelectValue /></SelectTrigger>
                      <SelectContent>{Array.from({ length: adults }, (_, adult) => <SelectItem key={adult} value={String(adult)} className="text-body">Adult {adult + 1}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                </div>
              )}
              {!customerIsAdult1 && (
                <label className="flex items-center gap-2 text-body text-foreground">
                  <Checkbox checked={traveler.save} onCheckedChange={checked => setTraveler(index, { save: checked === true })} aria-label={`Save this traveler for next time, ${label}`} />
                  Save this traveler for next time
                </label>
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
          // The banner names the fields to fix, in the form's words ("Last Name (Adult 1)"), else the gateway's sentence.
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
export function FarePanel({ title, children, pricing, adminOnly, notice, formId, canHold, pending, footnote, submitLabel }: {
  title: string;
  /** Replaces "Hold seats" (restricted airlines: "Send request to book"). */
  submitLabel?: string;
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
        {pending ? (submitLabel ? "Sending…" : "Holding seats…") : (submitLabel ?? "Hold seats")}
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
