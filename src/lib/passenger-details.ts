// One passenger's details as the public booking form collects them (B27): the same fields, order, labels and checks on
// the website checkout and the admin hold form (PassengerFields renders them). Dates are ISO yyyy-MM-dd; countries are
// names as the country picker shows them (the gateway gets ISO alpha-3 codes via countryCode()).

export type PassengerKind = "adult" | "child" | "infant";
export type DocType = "passport" | "cnic";

export interface PassengerDetails {
  passengerType: PassengerKind;
  label: string;
  /** mr, ms, mrs, master, miss */
  title: string;
  firstName: string;
  lastName: string;
  /** male, female ("" until chosen) */
  gender: string;
  dob?: string;
  docType?: DocType;
  docNumber: string;
  nationality: string;
  issuanceCountry: string;
  expiryDate?: string;
}

/** Issue #11: Mr, Mrs, Ms, Mstr, Miss everywhere (Mstr is the gateway's MASTER; Ms travels as MISS). */
export const TITLE_OPTIONS = [["mr", "Mr"], ["mrs", "Mrs"], ["ms", "Ms"], ["master", "Mstr"], ["miss", "Miss"]] as const;

const TITLE_WORDS: Record<string, string> = { MR: "Mr", MRS: "Mrs", MS: "Ms", MSTR: "Mstr", MASTER: "Mstr", MISS: "Miss" };
/** A stored title (MR, MASTER, mr, ...) as people read it: Mr, Mrs, Ms, Mstr, Miss. */
export const titleText = (code?: string | null) => (code ? TITLE_WORDS[code.trim().toUpperCase()] ?? code : "");

/** The website's title words to the gateway's (Ms travels as MISS). */
export const GATEWAY_TITLE: Record<string, "MR" | "MRS" | "MISS" | "MASTER"> = { mr: "MR", mrs: "MRS", ms: "MISS", miss: "MISS", master: "MASTER" };
/** The gateway's back to the form's. */
export const FORM_TITLE: Record<string, string> = { MR: "mr", MRS: "mrs", MISS: "miss", MASTER: "master" };

export const AGE_TEXT: Record<PassengerKind, string> = { adult: "12+ years", child: "2-11 years", infant: "Under 2 years" };

export function createPassengerDetails(passengerType: PassengerKind, label: string): PassengerDetails {
  return {
    passengerType,
    label,
    title: passengerType === "adult" ? "mr" : "master",
    firstName: "",
    lastName: "",
    gender: "",
    docNumber: "",
    nationality: "Pakistan",
    issuanceCountry: "Pakistan",
  };
}

/** #155: the gender a title implies (Mr, Mstr: male; Mrs, Ms, Miss: female), "" for anything else. Still editable. */
export function genderForTitle(title: string | null | undefined): "male" | "female" | "" {
  const code = String(title ?? "").trim().toLowerCase();
  if (code === "mr" || code === "master") return "male";
  if (code === "mrs" || code === "ms" || code === "miss") return "female";
  return "";
}

/** #155: names as on the passport: letters, spaces, hyphen and apostrophe only. */
export const NAME_PATTERN = /^[A-Za-z][A-Za-z' -]*$/;
export const NAME_LETTERS_ONLY = "Use letters only, as on the passport";
/** About this many letters (first and last name together) and airlines may shorten the name on the ticket. */
export const LONG_NAME_LETTERS = 50;
export const LONG_NAME_WARNING = "Airlines may shorten long names";
export const nameIsLong = (passenger: Pick<PassengerDetails, "firstName" | "lastName">) =>
  passenger.firstName.trim().length + passenger.lastName.trim().length > LONG_NAME_LETTERS;

/** #155: a passport number as typed or pasted ("ab 123 4567") as the airline wants it ("AB1234567"). */
export const cleanPassportNumber = (value: string) => value.replace(/\s+/g, "").toUpperCase();

/** #155: where the date-of-birth calendar opens when nothing is picked yet: a year that fits the traveler (adult about
 *  30 years ago, child about 6, infant about 1), ISO yyyy-MM-01. */
export function dobCalendarStart(passengerType: PassengerKind, today: Date = new Date()): string {
  const years = passengerType === "adult" ? 30 : passengerType === "child" ? 6 : 1;
  return `${today.getFullYear() - years}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
}

/** "Mr Ali KHAN": a traveler's full name for checking (title, first name, last name in capitals as on the ticket). */
export const travelerFullName = (passenger: Pick<PassengerDetails, "title" | "firstName" | "lastName">) =>
  [titleText(passenger.title), passenger.firstName.trim(), passenger.lastName.trim().toUpperCase()].filter(Boolean).join(" ");

export const usesPassport = (passenger: Pick<PassengerDetails, "docType">) => (passenger.docType ?? "passport") === "passport";

export function passengerDocValid(passenger: Pick<PassengerDetails, "docType" | "docNumber">) {
  if (usesPassport(passenger)) return /^[A-Z0-9]{6,12}$/i.test(passenger.docNumber.replace(/\s+/g, ""));
  return /^\d{13}$/.test(passenger.docNumber.replace(/-/g, ""));
}

/** Field names of one passenger's errors. */
export type PassengerField = "gender" | "firstName" | "lastName" | "dob" | "docNumber" | "expiryDate";

const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

/** "24 Nov 2026" for a message. */
const dayText = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

/** A traveler whose airline asks for a specific document on this fare (the gateway's fare check: documents). */
export interface RequiredDocument { type: "ADT" | "CHD" | "INF"; number: number; document: DocType }

const GATEWAY_KIND: Record<PassengerKind, RequiredDocument["type"]> = { adult: "ADT", child: "CHD", infant: "INF" };

/** The document each passenger (in form order) must give, from the gateway's list (numbered per passenger type). */
export function requiredDocuments(passengers: Pick<PassengerDetails, "passengerType">[], documents?: RequiredDocument[] | null): (DocType | undefined)[] {
  const seen: Partial<Record<PassengerKind, number>> = {};
  return passengers.map(({ passengerType }) => {
    const number = (seen[passengerType] = (seen[passengerType] ?? 0) + 1);
    return documents?.find(d => d.type === GATEWAY_KIND[passengerType] && d.number === number)?.document;
  });
}

export const REQUIRED_DOC_TEXT: Record<DocType, string> = {
  cnic: "This airline needs the traveler's CNIC / B-form for this flight.",
  passport: "This airline needs the traveler's passport for this flight.",
};

/** Whole years on `on` (both ISO yyyy-MM-dd): the birthday counts on the day itself. */
export function ageOn(dob: string, on: string): number {
  const [by, bm, bd] = dob.split("-").map(Number);
  const [y, m, d] = on.split("-").map(Number);
  return y - by - ((m < bm || (m === bm && d < bd)) ? 1 : 0);
}

/** The fare type for an age on the travel date (airline rule): under 2 infant, 2-11 child, 12+ adult. */
export const kindForAge = (age: number): PassengerKind => (age < 2 ? "infant" : age < 12 ? "child" : "adult");

const KIND_WORD: Record<PassengerKind, string> = { adult: "an Adult", child: "a Child", infant: "an Infant" };
const KIND_NAME: Record<PassengerKind, string> = { adult: "Adult", child: "Child", infant: "Infant" };

/** Issue #52: the traveler's age on the last travel date and the fare type it gives, shown at the date of birth as soon
 *  as it is picked. `matches` false: the date of birth doesn't fit the traveler's type (the booking would be refused). */
export function dobFareNote(passenger: Pick<PassengerDetails, "dob" | "passengerType">, travelDate?: string): { text: string; matches: boolean } | null {
  if (!passenger.dob || !travelDate || passenger.dob >= travelDate) return null;
  const age = ageOn(passenger.dob, travelDate);
  const kind = kindForAge(age);
  const years = age < 1 ? "under 1" : String(age);
  if (kind === passenger.passengerType) return { text: `Will be ${years} on the travel date (${dayText(travelDate)}), that's ${KIND_WORD[kind]} fare.`, matches: true };
  return {
    text: `Will be ${years} on the travel date (${dayText(travelDate)}), that's ${KIND_WORD[kind]} fare, not ${KIND_NAME[passenger.passengerType]}. `
      + "Check the date of birth, or search again with the right number of adults, children and infants.",
    matches: false,
  };
}

/** What's missing or wrong, per field (empty when complete). `travelDate`: the last travel date (ISO), so the passport
 *  must still be valid then and the age on it must fit the passenger type. `requiredDoc`: the document the airline asks for on this fare (CNIC up front). */
export function passengerErrors(passenger: PassengerDetails, travelDate?: string, requiredDoc?: DocType): Partial<Record<PassengerField, string>> {
  const errors: Partial<Record<PassengerField, string>> = {};
  const passport = usesPassport(passenger);
  if (requiredDoc && (passenger.docType ?? "passport") !== requiredDoc) {
    errors.docNumber = requiredDoc === "cnic" ? `${REQUIRED_DOC_TEXT.cnic} Choose CNIC / B-form and enter the 13 digits.`
      : `${REQUIRED_DOC_TEXT.passport} Choose Passport and enter its details.`;
  }
  if (!passenger.gender) errors.gender = "Gender is required";
  if (!passenger.firstName.trim()) errors.firstName = "First name is required";
  else if (!NAME_PATTERN.test(passenger.firstName.trim())) errors.firstName = NAME_LETTERS_ONLY;
  if (!passenger.lastName.trim()) errors.lastName = "Last name is required";
  else if (!NAME_PATTERN.test(passenger.lastName.trim())) errors.lastName = NAME_LETTERS_ONLY;
  if (!passenger.dob) errors.dob = "Date of birth is required";
  else if (passenger.dob >= today()) errors.dob = "Date of birth must be in the past";
  else {
    const note = dobFareNote(passenger, travelDate);
    if (note && !note.matches) errors.dob = note.text;
  }
  if (errors.docNumber) { /* the wrong document type: said above */ }
  else if (!passenger.docNumber.trim()) errors.docNumber = `${passport ? "Passport" : "CNIC"} number is required`;
  else if (!passengerDocValid(passenger)) errors.docNumber = passport ? "Enter a valid passport number (6-12 letters/digits)" : "Enter a valid 13-digit CNIC";
  if (passport) {
    if (!passenger.expiryDate) errors.expiryDate = "Expiry date is required";
    else if (travelDate && passenger.expiryDate <= travelDate) errors.expiryDate = `Passport must be valid after the travel date (${dayText(travelDate)})`;
    else if (passenger.expiryDate <= today()) errors.expiryDate = "This passport has expired";
  }
  return errors;
}

export const passengerComplete = (passenger: PassengerDetails, travelDate?: string, requiredDoc?: DocType) =>
  Object.keys(passengerErrors(passenger, travelDate, requiredDoc)).length === 0;
