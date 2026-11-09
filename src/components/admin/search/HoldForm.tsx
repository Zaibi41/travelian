import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GatewayError, type GatewayFieldError } from "@/lib/gateway/client";
import { cn } from "@/lib/utils";
import { holdFlight, repriceFlights, writeFlightSearch } from "@/lib/admin-search/flights";
import { HOLD_RESULT_PATH, fareCheckFailure, type FareCheckState, type HoldDraft, type HoldRequest } from "@/lib/admin-search/hold";
import { DEFAULT_COUNTRY_CODE } from "@/data/countries";
import { CountrySelect } from "./CountrySelect";
import { FareCheckDialog } from "./FareCheckDialog";
import { useCountdown } from "./FlightsSearch";

type PassengerType = "ADT" | "CHD" | "INF";
type Title = "MR" | "MRS" | "MISS" | "MASTER";

interface Traveler {
  type: PassengerType;
  title: Title;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  id_type: "PSPT" | "NATI";
  document_number: string;
  document_country: string;
  nationality: string;
  document_expiry: string;
  travels_with: number;
  sameAsCustomer: boolean;
}

interface Customer { first_name: string; last_name: string; phone_code: string; phone: string; email: string }

const TITLES: Record<PassengerType, [Title, string][]> = {
  ADT: [["MR", "Mr"], ["MRS", "Mrs"], ["MISS", "Miss"]],
  CHD: [["MR", "Mr"], ["MRS", "Mrs"], ["MISS", "Miss"], ["MASTER", "Master"]],
  INF: [["MASTER", "Master"], ["MISS", "Miss"]],
};
const TYPE_LABEL: Record<PassengerType, string> = { ADT: "Adult", CHD: "Child", INF: "Infant" };
const AGE_HINT: Record<PassengerType, string> = {
  ADT: "Adult: 12 or over on the travel date", CHD: "Child: 2 to 11 on the travel date", INF: "Infant: under 2 on the travel date",
};

const blankTraveler = (type: PassengerType, travelsWith = 0): Traveler => ({
  type, title: type === "INF" ? "MASTER" : "MR", first_name: "", last_name: "", date_of_birth: "", id_type: "PSPT",
  document_number: "", document_country: DEFAULT_COUNTRY_CODE, nationality: DEFAULT_COUNTRY_CODE, document_expiry: "",
  travels_with: travelsWith, sameAsCustomer: false,
});

/** One card per traveler from the search counts; identity fields always open empty. */
export function initialTravelers(adults: number, children: number, infants: number): Traveler[] {
  return [
    ...Array.from({ length: adults }, () => blankTraveler("ADT")),
    ...Array.from({ length: children }, () => blankTraveler("CHD")),
    ...Array.from({ length: infants }, (_, index) => blankTraveler("INF", Math.min(index, Math.max(adults - 1, 0)))),
  ];
}

const optional = (value: string) => value.trim() || null;

export function holdRequestFrom(draft: HoldDraft, customer: Customer, travelers: Traveler[]): HoldRequest {
  return {
    quote_id: draft.quote.quote_id,
    confirmed_total: draft.quote.new_total,
    accept_price_change: draft.acceptPriceChange,
    contact: {
      first_name: customer.first_name.trim(), last_name: customer.last_name.trim(), email: customer.email.trim(),
      phone_code: customer.phone_code.trim(), phone: customer.phone.trim(),
    },
    passengers: travelers.map(traveler => {
      const first = traveler.sameAsCustomer ? customer.first_name : traveler.first_name;
      const last = traveler.sameAsCustomer ? customer.last_name : traveler.last_name;
      return {
        type: traveler.type, title: traveler.title, first_name: first.trim(), last_name: last.trim(),
        date_of_birth: traveler.date_of_birth, id_type: traveler.id_type,
        document_number: optional(traveler.document_number), document_country: optional(traveler.document_country.toUpperCase()),
        nationality: traveler.type === "INF" ? null : optional(traveler.nationality.toUpperCase()),
        document_expiry: optional(traveler.document_expiry),
        ...(traveler.type === "INF" ? { travels_with: traveler.travels_with } : {}),
      } as HoldRequest["passengers"][number];
    }),
  };
}

/** Gateway field errors by key: "contact.email", "passengers.0.first_name", "passengers.0" (whole card). */
function fieldErrorMap(errors: GatewayFieldError[]) {
  const map: Record<string, string[]> = {};
  for (const error of errors) {
    const key = error.path.join(".");
    (map[key] ??= []).push(error.message);
  }
  return map;
}

const RESULT_CODES = new Set(["booking_off", "not_confirmed_hold", "not_saved", "total_unverified"]);
const RECHECK_CODES = new Set(["price_changed", "price_not_accepted", "confirm_total", "quote_expired"]);

// The form of mockup flights-hold-form. Every amount and message comes from the gateway.
export function HoldForm({ draft, mode, onDraft }: { draft: HoldDraft; mode: HoldDraft["mode"]; onDraft: (next: HoldDraft) => void }) {
  const navigate = useNavigate();
  const counts = draft.request;
  const [customer, setCustomer] = useState<Customer>({ first_name: "", last_name: "", phone_code: "", phone: "", email: "" });
  const [travelers, setTravelers] = useState<Traveler[]>(() => initialTravelers(counts.adults, counts.children, counts.infants));
  const [errors, setErrors] = useState<{ fields: Record<string, string[]>; message: string | null }>({ fields: {}, message: null });
  const [pending, setPending] = useState(false);
  const [check, setCheck] = useState<FareCheckState | null>(null);
  const countdown = useCountdown(draft.quote.expires_at);
  const rechecked = useRef<string | null>(null);
  const searchUrl = useMemo(() => `/admin/search?${writeFlightSearch(new URLSearchParams("tab=flights"), draft.request).toString()}`, [draft.request]);
  const adults = travelers.filter(traveler => traveler.type === "ADT").length;

  /** Fare check again (timer ran out, or the hold found the price or quote changed). */
  const recheck = async (alwaysAsk: boolean) => {
    rechecked.current = draft.quote.quote_id;
    try {
      const quote = await repriceFlights(draft.searchId, draft.picks.map(pick => pick.fare.id));
      const moved = quote.new_total.amount_minor !== draft.quote.new_total.amount_minor || quote.new_total.currency !== draft.quote.new_total.currency;
      if (moved || (alwaysAsk && quote.price_changed)) setCheck({ kind: "changed", quote });
      else onDraft({ ...draft, quote, confirmedAt: new Date().toISOString() });
    } catch (error) {
      setCheck(fareCheckFailure(error));
    }
  };

  useEffect(() => {
    if (countdown && countdown.seconds === 0 && rechecked.current !== draft.quote.quote_id) void recheck(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-check once per quote when its timer ends
  }, [countdown?.seconds, draft.quote.quote_id]);

  const setTraveler = (index: number, change: Partial<Traveler>) =>
    setTravelers(current => current.map((traveler, i) => (i === index ? { ...traveler, ...change } : traveler)));

  const submit = async () => {
    setPending(true);
    setErrors({ fields: {}, message: null });
    try {
      const hold = await holdFlight(holdRequestFrom(draft, customer, travelers));
      navigate(HOLD_RESULT_PATH, { state: { kind: "held", hold, mode } });
    } catch (error) {
      if (error instanceof GatewayError && error.code && RESULT_CODES.has(error.code)) {
        navigate(HOLD_RESULT_PATH, { state: { kind: "problem", code: error.code, message: error.message, extra: error.extra, mode, draft } });
        return;
      }
      if (error instanceof GatewayError && error.code && RECHECK_CODES.has(error.code)) {
        setErrors({ fields: {}, message: error.message });
        await recheck(true);
        return;
      }
      setErrors({
        fields: error instanceof GatewayError ? fieldErrorMap(error.fieldErrors) : {},
        message: error instanceof Error ? error.message : "The hold couldn't be placed. Try again.",
      });
    } finally {
      setPending(false);
    }
  };

  const fieldError = (key: string) => errors.fields[key]?.join(" ");
  const customerField = (name: keyof Customer, label: string, placeholder: string, type = "text") => (
    <Field id={`customer-${name}`} label={label} error={fieldError(`contact.${name}`)}>
      <Input id={`customer-${name}`} type={type} value={customer[name]} placeholder={placeholder} autoComplete="off"
        aria-invalid={Boolean(fieldError(`contact.${name}`))} aria-describedby={fieldError(`contact.${name}`) ? `customer-${name}-error` : undefined} onChange={event => setCustomer({ ...customer, [name]: event.target.value })} className="h-control text-body" />
    </Field>
  );

  const typeCounts = (["ADT", "CHD", "INF"] as const)
    .map(type => [type, travelers.filter(traveler => traveler.type === type).length] as const).filter(([, count]) => count > 0)
    .map(([type, count]) => `${count} ${type === "ADT" ? (count === 1 ? "adult" : "adults") : type === "CHD" ? (count === 1 ? "child" : "children") : (count === 1 ? "infant" : "infants")}`)
    .join(" · ");

  return (
    <div className="flex min-w-0 flex-col gap-section-gap">
      <section aria-label="Customer" className="flex flex-col gap-3 rounded-lg border border-border bg-card px-card py-3.5 shadow-card">
        <div>
          <h2 className="text-section font-semibold text-foreground">Customer</h2>
          <p className="text-body text-muted-foreground">The person who pays and is contacted. Typed in for each booking. The customer may or may not be one of the travelers.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {customerField("first_name", "First name", "First name")}
          {customerField("last_name", "Last name", "Last name")}
          {customerField("phone_code", "Phone code", "e.g. 92", "tel")}
          {customerField("phone", "Phone", "5 to 10 digits", "tel")}
          <div className="sm:col-span-2">{customerField("email", "Email", "name@example.com", "email")}</div>
        </div>
      </section>

      <section aria-label="Travelers" className="flex flex-col gap-3 rounded-lg border border-border bg-card px-card py-3.5 shadow-card">
        <div>
          <h2 className="flex flex-wrap items-center gap-2 text-section font-semibold text-foreground">
            Travelers <span className="rounded-full bg-primary/10 px-2 py-0.5 text-label font-medium text-primary">{typeCounts}</span>
          </h2>
          <p className="text-body text-muted-foreground">The number of each type comes from the search. Names must match the passport or national ID exactly.</p>
        </div>
        <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-body text-foreground">
          Passport, ID number and date of birth open empty. After saving they show masked, with a logged Reveal. They are never filled in from a saved record.
        </p>
        {travelers.map((traveler, index) => {
          const number = travelers.slice(0, index + 1).filter(other => other.type === traveler.type).length;
          const key = (field: string) => `passengers.${index}.${field}`;
          const id = (field: string) => `traveler-${index}-${field}`;
          const nameFromCustomer = traveler.sameAsCustomer && traveler.type !== "INF";
          const country = (field: "document_country" | "nationality", label: string) => (
            <Field id={id(field)} label={label} error={fieldError(key(field))}>
              <CountrySelect id={id(field)} value={traveler[field]} onChange={code => setTraveler(index, { [field]: code })}
                invalid={Boolean(fieldError(key(field)))} describedBy={fieldError(key(field)) ? `${id(field)}-error` : undefined} />
            </Field>
          );
          const text = (field: "first_name" | "last_name" | "document_number", label: string, placeholder: string) => (
            <Field id={id(field)} label={label} error={fieldError(key(field))}>
              <Input id={id(field)} value={field === "first_name" && nameFromCustomer ? customer.first_name : field === "last_name" && nameFromCustomer ? customer.last_name : traveler[field]}
                readOnly={nameFromCustomer && (field === "first_name" || field === "last_name")} placeholder={placeholder} autoComplete="off"
                aria-invalid={Boolean(fieldError(key(field)))} aria-describedby={fieldError(key(field)) ? `${id(field)}-error` : undefined}
                onChange={event => setTraveler(index, { [field]: event.target.value })} className="h-control text-body" />
            </Field>
          );
          const date = (field: "date_of_birth" | "document_expiry", label: string, hint?: string) => (
            <Field id={id(field)} label={label} error={fieldError(key(field))} hint={hint}>
              <Input id={id(field)} type="date" value={traveler[field]} aria-invalid={Boolean(fieldError(key(field)))}
                aria-describedby={fieldError(key(field)) ? `${id(field)}-error` : undefined}
                onChange={event => setTraveler(index, { [field]: event.target.value })} className="h-control text-body" />
            </Field>
          );
          return (
            <fieldset key={index} aria-label={`${TYPE_LABEL[traveler.type]} ${number}`} className="flex min-w-0 flex-col gap-3 rounded-md border border-border px-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <legend className="text-section font-semibold text-foreground">{TYPE_LABEL[traveler.type]} {number}</legend>
                {traveler.type === "INF" ? (
                  <span className="text-label text-muted-foreground">Travels on an adult's lap</span>
                ) : (
                  <label className="flex items-center gap-2 text-body text-foreground">
                    <Checkbox checked={traveler.sameAsCustomer} onCheckedChange={checked => setTraveler(index, { sameAsCustomer: checked === true })} aria-label={`Same as customer, ${TYPE_LABEL[traveler.type]} ${number}`} />
                    Same as customer
                  </label>
                )}
              </div>
              {fieldError(`passengers.${index}`) && <p role="alert" className="text-body text-status-critical-text">{fieldError(`passengers.${index}`)}</p>}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field id={id("title")} label="Title" error={fieldError(key("title"))}>
                  <Select value={traveler.title} onValueChange={title => setTraveler(index, { title: title as Title })}>
                    <SelectTrigger id={id("title")} className="h-control text-body"><SelectValue /></SelectTrigger>
                    <SelectContent>{TITLES[traveler.type].map(([value, label]) => <SelectItem key={value} value={value} className="text-body">{label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                {text("first_name", "First name", "As on document")}
                {text("last_name", "Last name", "As on document")}
                {date("date_of_birth", "Date of birth", AGE_HINT[traveler.type])}
                {traveler.type === "INF" && (
                  <Field id={id("travels_with")} label="Travels with" error={fieldError(key("travels_with"))} hint="Each infant needs its own adult">
                    <Select value={String(traveler.travels_with)} onValueChange={value => setTraveler(index, { travels_with: Number(value) })}>
                      <SelectTrigger id={id("travels_with")} className="h-control text-body"><SelectValue /></SelectTrigger>
                      <SelectContent>{Array.from({ length: adults }, (_, adult) => <SelectItem key={adult} value={String(adult)} className="text-body">Adult {adult + 1}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                )}
                <Field id={id("id_type")} label="ID type" error={fieldError(key("id_type"))}>
                  <Select value={traveler.id_type} onValueChange={value => setTraveler(index, { id_type: value as Traveler["id_type"] })}>
                    <SelectTrigger id={id("id_type")} className="h-control text-body"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PSPT" className="text-body">Passport</SelectItem>
                      <SelectItem value="NATI" className="text-body">National ID</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                {text("document_number", "Document number", "Letters and digits")}
                {country("document_country", "Document country")}
                {traveler.type !== "INF" && country("nationality", "Nationality")}
                {date("document_expiry", "Document expiry")}
              </div>
            </fieldset>
          );
        })}
      </section>

      {errors.message && <p role="alert" className="rounded-md border border-status-critical/40 bg-status-critical-soft px-3 py-2 text-body text-status-critical-text">{errors.message}</p>}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void submit()} disabled={pending || check !== null} className="h-control bg-teal text-body text-teal-foreground hover:bg-teal/90">
            {pending ? "Holding seats…" : "Hold seats"}
          </Button>
          <Button type="button" variant="outline" className="h-control text-body" onClick={() => navigate(searchUrl)}>Back to results</Button>
        </div>
        <p className="text-body text-muted-foreground">
          {mode === "book"
            ? "Holding reserves the seats until the time limit. Payment and issuing happen on the booking's Payments tab."
            : "Holding reserves the seats until the time limit. No payment is taken."}
        </p>
      </div>

      <FareCheckDialog
        state={check}
        onCancel={() => setCheck(null)}
        onBack={() => navigate(searchUrl)}
        onContinue={() => {
          if (check?.kind !== "changed") return;
          onDraft({ ...draft, quote: check.quote, acceptPriceChange: true, confirmedAt: new Date().toISOString() });
          setCheck(null);
          setErrors({ fields: {}, message: null });
        }}
        onTryAgain={() => { setCheck(null); void recheck(false); }}
        onSearchAgain={() => navigate(searchUrl)}
        onEditSearch={() => navigate(searchUrl)}
      />
    </div>
  );
}

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-label font-medium text-muted-foreground">{label}</label>
      {children}
      {hint && <p className="text-label text-muted-foreground">{hint}</p>}
      {error && <p id={`${id}-error`} className={cn("text-label text-status-critical-text")}>{error}</p>}
    </div>
  );
}
