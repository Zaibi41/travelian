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

export const usesPassport = (passenger: Pick<PassengerDetails, "docType">) => (passenger.docType ?? "passport") === "passport";

export function passengerDocValid(passenger: Pick<PassengerDetails, "docType" | "docNumber">) {
  if (usesPassport(passenger)) return /^[A-Z0-9]{6,12}$/i.test(passenger.docNumber);
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

/** What's missing or wrong, per field (empty when complete). `travelDate`: the last travel date (ISO), so the passport
 *  must still be valid then. `requiredDoc`: the document the airline asks for on this fare (CNIC up front). */
export function passengerErrors(passenger: PassengerDetails, travelDate?: string, requiredDoc?: DocType): Partial<Record<PassengerField, string>> {
  const errors: Partial<Record<PassengerField, string>> = {};
  const passport = usesPassport(passenger);
  if (requiredDoc && (passenger.docType ?? "passport") !== requiredDoc) {
    errors.docNumber = requiredDoc === "cnic" ? `${REQUIRED_DOC_TEXT.cnic} Choose CNIC / B-form and enter the 13 digits.`
      : `${REQUIRED_DOC_TEXT.passport} Choose Passport and enter its details.`;
  }
  if (!passenger.gender) errors.gender = "Gender is required";
  if (!passenger.firstName.trim()) errors.firstName = "First name is required";
  if (!passenger.lastName.trim()) errors.lastName = "Last name is required";
  if (!passenger.dob) errors.dob = "Date of birth is required";
  else if (passenger.dob >= today()) errors.dob = "Date of birth must be in the past";
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
