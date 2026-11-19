// Public website booking through the Travelian gateway (/v1/public). No login: a booking is opened with its
// reference plus the private token the gateway issued when it was made. Prices and what a guest sees are decided
// by the gateway; this module only sends and displays.
import { countries } from "@/data/countries";
import type { GroupTicket } from "@/lib/group-ticketing";

export class PublicBookingError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string, readonly fieldErrors: { path: (string | number)[]; message: string }[] = []) {
    super(message);
  }
}

function baseUrl() {
  return (import.meta.env.VITE_TRAVELIAN_GATEWAY_BASE_URL?.trim() || "").replace(/\/+$/, "");
}

async function call<T>(path: string, init: { method?: string; body?: unknown; token?: string; signal?: AbortSignal } = {}): Promise<T> {
  const base = baseUrl();
  if (!base) throw new PublicBookingError("Booking isn't available right now.", 503, "not_configured");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (init.token) headers["X-Booking-Token"] = init.token;
  let response: Response;
  try {
    response = await fetch(`${base}/v1/public${path}`, {
      method: init.method || (init.body !== undefined ? "POST" : "GET"),
      headers, body: init.body !== undefined ? JSON.stringify(init.body) : undefined, signal: init.signal,
    });
  } catch (error) {
    if ((error as Error)?.name === "AbortError") throw error;
    throw new PublicBookingError("We couldn't reach Travelian. Check your connection and try again.", 0, "network");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body?.detail;
    const fieldErrors = Array.isArray(detail)
      ? detail.filter((item) => item && Array.isArray(item.loc) && typeof item.msg === "string")
        .map((item) => ({ path: item.loc.filter((part: unknown, index: number) => !(index === 0 && part === "body")), message: String(item.msg).replace(/^Value error, /, "") }))
      : [];
    const message = typeof detail === "string" ? detail : typeof body?.message === "string" ? body.message
      : fieldErrors[0]?.message || "Something went wrong. Please try again.";
    throw new PublicBookingError(message, response.status, body?.code, fieldErrors);
  }
  return body as T;
}

// ---------- search ----------

interface Money { amount_minor: number; currency: string }
interface PublicLeg {
  direction?: string; flight_number?: string; origin?: string; destination?: string;
  departure_date?: string; departure_time?: string; arrival_date?: string; arrival_time?: string; baggage?: string;
}
interface PublicTicket {
  id: string; sector?: string; airline?: string; flight_number?: string; departure_date?: string; departure_time?: string;
  baggage?: string; hand_carry?: string; meal?: string; ticket_type?: string; legs?: PublicLeg[]; selling_price?: Money;
  fare_terms?: { notice?: string; refund?: string };
}
interface PublicGroup { id: string; sector?: string; airline?: string; logo_url?: string; tickets: PublicTicket[] }

/** Marks group fares that are booked through the gateway (GroupTicket.provider). */
export const GATEWAY_GROUP_PROVIDER = "travelian-group";

function logoUrl(path?: string) {
  if (!path) return undefined;
  return /^https?:/i.test(path) ? path : `${baseUrl()}${path}`;
}

function toGroupTicket(group: PublicGroup, ticket: PublicTicket): GroupTicket {
  const legs = ticket.legs || [];
  const returning = legs.some((leg) => leg.direction === "return");
  const baggage = [ticket.baggage, ticket.hand_carry].filter(Boolean).join("+");
  return {
    id: ticket.id,
    provider: GATEWAY_GROUP_PROVIDER,
    airlineName: ticket.airline || group.airline,
    airlineLogo: logoUrl(group.logo_url),
    sector: ticket.sector || group.sector,
    tripType: returning ? "round-trip" : "one-way",
    itinerary: legs.map((leg, index) => ({
      sequence: index + 1, flightNumber: leg.flight_number, flightDate: leg.departure_date, origin: leg.origin,
      destination: leg.destination, baggage: leg.baggage, departureTime: leg.departure_time, arrivalTime: leg.arrival_time,
    })),
    departureDate: ticket.departure_date,
    returnDate: legs.find((leg) => leg.direction === "return")?.departure_date,
    flightNumber: ticket.flight_number,
    baggage: baggage ? `${baggage} kg` : undefined,
    fare: ticket.selling_price ? ticket.selling_price.amount_minor / 100 : undefined,
    currency: ticket.selling_price?.currency || "PKR",
    status: "available",
    terms: ticket.fare_terms?.notice,
    cancellationRules: ticket.fare_terms?.refund,
  };
}

export async function searchPublicGroups(query: { origin?: string; destination?: string; departureDate?: string; adults?: number }, signal?: AbortSignal): Promise<GroupTicket[]> {
  const body = await call<{ data: PublicGroup[] }>("/group-ticketing/search", {
    body: { origin: query.origin || null, destination: query.destination || null, departure_date: query.departureDate || null, adults: query.adults || 1 },
    signal,
  });
  return (body.data || []).flatMap((group) => group.tickets.filter((ticket) => ticket.selling_price).map((ticket) => toGroupTicket(group, ticket)));
}

// ---------- book ----------

export interface PublicBooking {
  reference: string;
  status: "requested" | "held" | "confirmed" | "issued" | "expired" | "released" | "processing" | "unknown" | "not_recorded";
  payment_status: "unpaid" | "part_paid" | "paid";
  live: boolean;
  can_pay: boolean;
  total: Money;
  paid: Money;
  hold_expires_at?: string;
  final_pnr?: string;
  tickets?: string[];
}

export interface GuestPassenger {
  title: string; firstName: string; lastName: string; gender?: string; dob?: string;
  docNumber?: string; nationality?: string; issuanceCountry?: string; expiryDate?: string;
}

/** A country name or code from the public form → ISO 3166 alpha-3 ("Pakistan" / "PK" / "PAK" → "PAK"). */
export function countryCode(value?: string): string | undefined {
  const text = (value || "").trim();
  if (!text) return undefined;
  const upper = text.toUpperCase();
  const match = countries.find((country) => country.code === upper || country.name.toLowerCase() === text.toLowerCase());
  return match?.code;
}

const TITLES: Record<string, string> = { mr: "MR", mrs: "MRS", ms: "MISS", miss: "MISS", master: "MASTER" };

export function toGatewayPassenger(passenger: GuestPassenger) {
  const title = TITLES[passenger.title.toLowerCase()] || passenger.title.toUpperCase();
  const gender = passenger.gender?.toLowerCase().startsWith("f") ? "F" : passenger.gender?.toLowerCase().startsWith("m") ? "M" : undefined;
  return {
    type: "ADT", title, first_name: passenger.firstName.trim(), last_name: passenger.lastName.trim(), gender,
    date_of_birth: passenger.dob, id_type: "PSPT", document_number: (passenger.docNumber || "").replace(/\s+/g, "").toUpperCase(),
    document_country: countryCode(passenger.issuanceCountry || passenger.nationality), document_expiry: passenger.expiryDate,
    nationality: countryCode(passenger.nationality),
  };
}

export async function bookGroupFare(input: { ticketId: string; passengers: GuestPassenger[]; contact: { firstName: string; lastName: string; phone: string; email?: string }; fareTermsAcknowledged: boolean; paymentMethod?: "card" | "bank_transfer" | "jazzcash" }) {
  return call<{ reference: string; access_token: string; booking: PublicBooking }>("/group-ticketing/bookings", {
    body: {
      ticket_id: input.ticketId, adults: input.passengers.length, fare_terms_acknowledged: input.fareTermsAcknowledged,
      payment_method: input.paymentMethod ?? "card",
      contact: { first_name: input.contact.firstName, last_name: input.contact.lastName, phone: input.contact.phone, email: input.contact.email || null },
      passengers: input.passengers.map(toGatewayPassenger),
    },
  });
}

export function getPublicBooking(reference: string, token: string, signal?: AbortSignal) {
  return call<PublicBooking>(`/bookings/${encodeURIComponent(reference)}`, { token, signal });
}

export function startPayFastCheckout(reference: string, token: string) {
  return call<{ action: string; fields: Record<string, string>; sandbox: boolean }>(`/bookings/${encodeURIComponent(reference)}/payments/payfast`, { method: "POST", token });
}

/** Forwards what PayFast sent the customer back with; the gateway verifies it. */
export function confirmPayFastReturn(params: Record<string, string>) {
  return call<{ reference?: string; result: string }>("/payments/payfast/return", { body: params });
}

export function isPayFastReturn(params: URLSearchParams) {
  return params.has("validation_hash") || params.has("VALIDATION_HASH") || params.has("err_code") || params.has("basket_id");
}

// ---------- self-service lookup (reference + email or phone, read-only) ----------

export interface BookingLookup {
  reference: string;
  product: string;
  status: "requested" | "held" | "paid" | "issued" | "expired" | "cancelled";
  payment_status: "unpaid" | "part_paid" | "paid";
  total: Money;
  paid: Money;
  hold_expires_at?: string;
  legs?: { flight_number?: string; origin?: string; destination?: string; departure_date?: string; departure_time?: string; arrival_time?: string }[];
  travelers?: string[];
  airline_pnr?: string;
  tickets?: string[];
  next_steps: string;
}

export function lookupBooking(reference: string, contact: string, signal?: AbortSignal) {
  return call<BookingLookup>("/bookings/lookup", { body: { reference: reference.trim(), contact: contact.trim() }, signal });
}

/** The group fare calendar for one sector (D33): real lowest prices per day, or no availability. */
export function publicGroupCalendar(origin: string, destination: string, adults = 1, signal?: AbortSignal) {
  return call<{ origin: string; destination: string; days: { date: string; available: boolean; lowest_price?: Money | null; fares?: number }[] }>(
    "/group-ticketing/calendar", { body: { origin, destination, adults }, signal });
}

// ---------- payment methods offered at checkout (from the gateway) ----------

/** Travelian's receiving account, in full (D40): customers need the number or IBAN to pay. */
export interface BankAccountDisplay { bank_name?: string | null; account_title?: string | null; account_number?: string | null; iban?: string | null; qr_url?: string | null }
export interface PaymentMethods { card: boolean; bank_transfer: boolean; jazzcash: boolean; bank_accounts?: BankAccountDisplay[]; logo_url?: string | null }

export function getPaymentMethods(signal?: AbortSignal) {
  return call<PaymentMethods>("/payment-methods", { signal });
}

let siteLogo: Promise<string | null> | null = null;
/** The admin-uploaded site logo (S3, via the gateway), or null for the built-in one. Fetched once per page load. */
export function loadSiteLogo(): Promise<string | null> {
  siteLogo ??= getPaymentMethods().then((methods) => methods.logo_url ?? null).catch(() => null);
  return siteLogo;
}

/** Flight fare calendar: the lowest real fare per date from recent searches; unchecked dates have no price. */
export function publicFlightCalendar(origin: string, destination: string, adults: number, cabin: string, signal?: AbortSignal, start?: string) {
  return call<{ origin: string; destination: string; pending: boolean;
    days: { date: string; checked: boolean; available: boolean; lowest_price?: Money | null; checked_at?: string }[] }>(
    "/flights/calendar", { body: { origin, destination, adults, cabin, ...(start ? { start } : {}) }, signal });
}

/** Site switches from the gateway (D39): read at page load, so they change with a server setting and no rebuild. */
export function getSiteConfig(signal?: AbortSignal) {
  return call<{ umrah_enabled: boolean }>("/site-config", { signal });
}

// ---------- website flight booking: a request, never a ticket (B19, D43, D45) ----------

export interface FlightRequestTraveler extends GuestPassenger { passengerType?: "adult" | "child" | "infant"; docType?: "passport" | "cnic" }

const TYPES = { adult: "ADT", child: "CHD", infant: "INF" } as const;

/** A checkout traveler in the gateway's flight shape (passport or CNIC; countries as ISO alpha-3). */
export function toGatewayFlightPassenger(traveler: FlightRequestTraveler) {
  const base = toGatewayPassenger(traveler);
  const cnic = traveler.docType === "cnic";
  return {
    type: TYPES[traveler.passengerType ?? "adult"], title: base.title, first_name: base.first_name, last_name: base.last_name,
    date_of_birth: base.date_of_birth, id_type: cnic ? "NATI" : "PSPT", document_number: base.document_number.replace(/-/g, ""),
    document_country: cnic ? undefined : base.document_country, document_expiry: cnic ? undefined : base.document_expiry,
    nationality: base.nationality, // saved to (or matched with) Customers & Travelers by the gateway (B23)
  };
}

/** Sends the chosen gateway fare as a booking request. The gateway reprices it, saves the customer and travelers, and
 *  alerts Travelian's team. Nothing is held, ticketed or charged, and no PNR is given. */
export function requestPublicFlight(input: {
  searchId: string; fareIds: string[]; travelers: FlightRequestTraveler[];
  contact: { firstName: string; lastName: string; phoneCode: string; phone: string; email: string };
}) {
  return call<{ reference: string; access_token: string; booking: PublicBooking }>("/flights/requests", {
    body: {
      search_id: input.searchId, fare_ids: input.fareIds, passengers: input.travelers.map(toGatewayFlightPassenger),
      contact: { first_name: input.contact.firstName, last_name: input.contact.lastName, email: input.contact.email,
        phone_code: input.contact.phoneCode.replace(/\D/g, ""), phone: input.contact.phone.replace(/\D/g, "").replace(/^0+/, "") },
    },
  });
}
