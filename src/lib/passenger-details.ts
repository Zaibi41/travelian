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

export const TITLE_OPTIONS = [["mr", "Mr"], ["ms", "Ms"], ["mrs", "Mrs"], ["master", "Master"], ["miss", "Miss"]] as const;

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

/** What's missing or wrong, per field (empty when complete). `travelDate`: the last travel date (ISO), so the passport
 *  must still be valid then. */
export function passengerErrors(passenger: PassengerDetails, travelDate?: string): Partial<Record<PassengerField, string>> {
  const errors: Partial<Record<PassengerField, string>> = {};
  const passport = usesPassport(passenger);
  if (!passenger.gender) errors.gender = "Gender is required";
  if (!passenger.firstName.trim()) errors.firstName = "First name is required";
  if (!passenger.lastName.trim()) errors.lastName = "Last name is required";
  if (!passenger.dob) errors.dob = "Date of birth is required";
  else if (passenger.dob >= today()) errors.dob = "Date of birth must be in the past";
  if (!passenger.docNumber.trim()) errors.docNumber = `${passport ? "Passport" : "CNIC"} number is required`;
  else if (!passengerDocValid(passenger)) errors.docNumber = passport ? "Enter a valid passport number (6-12 letters/digits)" : "Enter a valid 13-digit CNIC";
  if (passport) {
    if (!passenger.expiryDate) errors.expiryDate = "Expiry date is required";
    else if (travelDate && passenger.expiryDate <= travelDate) errors.expiryDate = `Passport must be valid after the travel date (${dayText(travelDate)})`;
    else if (passenger.expiryDate <= today()) errors.expiryDate = "This passport has expired";
  }
  return errors;
}

export const passengerComplete = (passenger: PassengerDetails, travelDate?: string) => Object.keys(passengerErrors(passenger, travelDate)).length === 0;
