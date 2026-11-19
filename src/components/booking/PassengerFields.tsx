import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CountryPicker } from "@/components/ui/country-picker";
import { CountrySelect } from "@/components/admin/search/CountrySelect";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { addDaysIso, todayIso } from "@/lib/date-iso";
import { TITLE_OPTIONS, usesPassport, type PassengerDetails, type PassengerField } from "@/lib/passenger-details";
import { cn } from "@/lib/utils";

// One passenger's fields, shared by the website checkout and the admin hold form so both ask for the same things in
// the same order with the same labels and checks (lib/passenger-details). Only the control sizing follows each
// surface ("public": the website's 44px rounded fields; "admin": the admin control scale).

const STYLES = {
  public: {
    grid: "grid grid-cols-1 gap-4 md:grid-cols-2",
    span: "md:col-span-2",
    label: "text-sm font-medium",
    control: "mt-1.5 h-11 rounded-xl",
    gap: "mt-1.5",
    helper: "text-xs text-muted-foreground",
    error: "mt-1 text-xs text-destructive",
  },
  admin: {
    grid: "grid grid-cols-1 gap-3 sm:grid-cols-2",
    span: "sm:col-span-2",
    label: "text-label font-medium text-muted-foreground",
    control: "mt-1 h-control rounded-md text-body",
    gap: "mt-1",
    helper: "text-helper text-muted-foreground",
    error: "mt-1 text-helper text-status-critical-text",
  },
} as const;

export function PassengerFields({ idPrefix, value, onChange, errors = {}, appearance = "public", travelDate }: {
  /** Unique per passenger, e.g. "passenger-0": field ids and the data-error-key of each field ("passenger-0-firstName"). */
  idPrefix: string;
  value: PassengerDetails;
  onChange: (patch: Partial<PassengerDetails>) => void;
  /** Messages to show now, per field (the page decides when: after Continue, or the gateway's answer). */
  errors?: Partial<Record<PassengerField | string, string>>;
  appearance?: "public" | "admin";
  /** The last travel date (ISO): passport expiry must be after it, so earlier days can't be picked. */
  travelDate?: string;
}) {
  const s = STYLES[appearance];
  const passport = usesPassport(value);
  const id = (field: string) => `${idPrefix}-${field}`;
  const describedBy = (field: string, helper?: boolean) =>
    [helper ? `${id(field)}-helper` : null, errors[field] ? `${id(field)}-error` : null].filter(Boolean).join(" ") || undefined;
  const error = (field: string) => errors[field] && <p id={`${id(field)}-error`} className={s.error}>{errors[field]}</p>;
  const nameHelperId = `${idPrefix}-name-helper`;
  const today = todayIso();
  // Passport expiry: after the travel date (or today, without one).
  const expiryMin = addDaysIso(travelDate && travelDate > today ? travelDate : today, 1);
  const thisYear = new Date().getFullYear();
  // Countries: the website's picker (names, the common countries with flags); the admin's full searchable list (all
  // countries, ISO alpha-3 codes). Same field, label and place; countryCode() reads either when the request is built.
  const country = (field: "nationality" | "issuanceCountry", current: string, set: (value: string) => void) => appearance === "admin"
    ? <CountrySelect id={id(field)} value={current} onChange={set} invalid={Boolean(errors[field])} describedBy={describedBy(field)} />
    : <CountryPicker id={id(field)} value={current} onChange={set} />;

  return (
    <div className={s.grid}>
      <div>
        <label htmlFor={id("title")} className={s.label}>Title *</label>
        <Select value={value.title} onValueChange={title => onChange({ title })}>
          <SelectTrigger id={id("title")} className={s.control}>
            <SelectValue placeholder="Select title" />
          </SelectTrigger>
          <SelectContent>
            {TITLE_OPTIONS.map(([option, text]) => <SelectItem key={option} value={option}>{text}</SelectItem>)}
          </SelectContent>
        </Select>
        {error("title")}
      </div>
      <div data-error-key={id("gender")}>
        <label htmlFor={id("gender")} className={s.label}>Gender *</label>
        <Select value={value.gender} onValueChange={gender => onChange({ gender })}>
          <SelectTrigger id={id("gender")} className={s.control} aria-invalid={Boolean(errors.gender) || undefined} aria-describedby={describedBy("gender")}>
            <SelectValue placeholder="Select gender" />
          </SelectTrigger>
          <SelectContent position="popper" side="bottom" align="start" sideOffset={4}>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
          </SelectContent>
        </Select>
        {error("gender")}
      </div>
      <div data-error-key={id("firstName")}>
        <label htmlFor={id("firstName")} className={s.label}>First Name *</label>
        <Input id={id("firstName")} placeholder="Given Name" className={s.control} value={value.firstName} autoComplete="off" maxLength={30}
          aria-invalid={Boolean(errors.firstName) || undefined} aria-describedby={[nameHelperId, errors.firstName ? `${id("firstName")}-error` : null].filter(Boolean).join(" ")}
          onChange={event => onChange({ firstName: event.target.value })} />
        {error("firstName")}
      </div>
      <div data-error-key={id("lastName")}>
        <label htmlFor={id("lastName")} className={s.label}>Last Name *</label>
        <Input id={id("lastName")} placeholder="Surnames" className={s.control} value={value.lastName} autoComplete="off" maxLength={30}
          aria-invalid={Boolean(errors.lastName) || undefined} aria-describedby={[nameHelperId, errors.lastName ? `${id("lastName")}-error` : null].filter(Boolean).join(" ")}
          onChange={event => onChange({ lastName: event.target.value })} />
        {error("lastName")}
      </div>
      <p id={nameHelperId} className={cn(s.span, "-mt-2", s.helper)}>
        Name must match exactly as shown on your {passport ? "passport" : "CNIC"}.
      </p>

      <div data-error-key={id("dob")}>
        <label htmlFor={id("dob")} className={s.label}>Date of Birth *</label>
        <div className={s.gap}>
          <DatePickerField id={id("dob")} value={value.dob} onChange={dob => onChange({ dob })} placeholder="Select date of birth"
            min={`${thisYear - 120}-01-01`} max={today} appearance={appearance} invalid={Boolean(errors.dob)} describedBy={describedBy("dob")} />
        </div>
        {error("dob")}
      </div>
      <div>
        <label htmlFor={id("docType")} className={s.label}>Document *</label>
        <Select value={value.docType ?? "passport"}
          onValueChange={docType => onChange({ docType: docType as PassengerDetails["docType"], docNumber: "", expiryDate: undefined })}>
          <SelectTrigger id={id("docType")} className={s.control} aria-label={`Document for ${value.label}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" side="bottom" align="start" sideOffset={4}>
            <SelectItem value="passport">Passport</SelectItem>
            <SelectItem value="cnic">CNIC / B-form (Pakistan)</SelectItem>
          </SelectContent>
        </Select>
        {error("docType")}
      </div>
      <div data-error-key={id("docNumber")}>
        <label htmlFor={id("docNumber")} className={s.label}>{passport ? "Passport Number *" : "CNIC / B-form Number *"}</label>
        <Input id={id("docNumber")} placeholder={passport ? "e.g. AB1234567" : "e.g. 3520112345671"} className={s.control} value={value.docNumber}
          autoComplete="off" maxLength={passport ? 12 : 13} aria-invalid={Boolean(errors.docNumber) || undefined} aria-describedby={describedBy("docNumber", true)}
          onChange={event => onChange({ docNumber: passport ? event.target.value.toUpperCase() : event.target.value.replace(/[^\d]/g, "") })} />
        <p id={`${id("docNumber")}-helper`} className={cn("mt-1", s.helper)}>
          {passport ? "Use the passport number without spaces." : "Use 13 digits without dashes."}
        </p>
        {error("docNumber")}
      </div>
      <div>
        <label htmlFor={id("nationality")} className={s.label}>Nationality *</label>
        <div className={s.gap}>
          {country("nationality", value.nationality, nationality => onChange({ nationality }))}
        </div>
        {error("nationality")}
      </div>
      {passport && (
        <>
          <div>
            <label htmlFor={id("issuanceCountry")} className={s.label}>Country of Issuance *</label>
            <div className={s.gap}>
              {country("issuanceCountry", value.issuanceCountry, issuanceCountry => onChange({ issuanceCountry }))}
            </div>
            {error("issuanceCountry")}
          </div>
          <div className={s.span} data-error-key={id("expiryDate")}>
            <label htmlFor={id("expiryDate")} className={s.label}>Date of Expiry *</label>
            <div className={s.gap}>
              <DatePickerField id={id("expiryDate")} value={value.expiryDate} onChange={expiryDate => onChange({ expiryDate })} placeholder="Select expiry date"
                min={expiryMin} max={`${thisYear + 25}-12-31`} appearance={appearance} invalid={Boolean(errors.expiryDate)} describedBy={describedBy("expiryDate")} />
            </div>
            {error("expiryDate")}
          </div>
        </>
      )}
    </div>
  );
}
