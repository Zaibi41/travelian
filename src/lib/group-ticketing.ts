export interface GroupTicketLeg {
  id?: string;
  sequence?: number;
  flightNumber?: string;
  flightDate?: string;
  origin?: string;
  destination?: string;
  baggage?: string;
  departureTime?: string;
  arrivalTime?: string;
}

export interface GroupTicket {
  id: string;
  categorySlug?: string;
  categoryLabel?: string;
  categoryImage?: string;
  airlineName?: string;
  airlineCode?: string;
  airlineLogo?: string;
  sector?: string;
  tripType?: "one-way" | "round-trip";
  itinerary?: GroupTicketLeg[];
  departureDate?: string;
  returnDate?: string;
  flightNumber?: string;
  baggage?: string;
  seatsAvailable?: number | string;
  fare?: number | string;
  currency?: string;
  status?: string;
  terms?: string;
  cancellationRules?: string;
  supplierRemarks?: string;
}

const API_BASE = (import.meta.env.VITE_TRAVELIAN_API_BASE_URL || "https://api.travelian.pk").replace(/\/$/, "");
const ALL_GROUPS_SLUG = "all";
const SITE_BASE = "https://www.travelian.pk";

function unwrapArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ["groups", "data", "available_groups", "result", "results"]) {
      if (Array.isArray(record[key])) return record[key] as unknown[];
    }
  }
  return [];
}

function value(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const next = record[key];
    if (next !== undefined && next !== null && next !== "") return next;
  }
  return undefined;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleize(input: string) {
  return input
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeLeg(input: unknown): GroupTicketLeg {
  const record = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  return {
    id: String(value(record, ["id"]) || ""),
    sequence: Number(value(record, ["sr", "sequence", "segment"]) || 0),
    flightNumber: value(record, ["flight_no", "flight_number", "flightNumber"]) as string | undefined,
    flightDate: value(record, ["flight_date", "flightDate", "date", "departure_date"]) as string | undefined,
    origin: value(record, ["origin", "from", "departure"]) as string | undefined,
    destination: value(record, ["destination", "to", "arrival"]) as string | undefined,
    baggage: value(record, ["baggage", "bags"]) as string | undefined,
    departureTime: value(record, ["dept_time", "departure_time", "departureTime"]) as string | undefined,
    arrivalTime: value(record, ["arv_time", "arrival_time", "arrivalTime"]) as string | undefined,
  };
}

function routeFromLegs(legs: GroupTicketLeg[]) {
  if (!legs.length) return undefined;
  return [legs[0].origin, ...legs.map((leg) => leg.destination)].filter(Boolean).join("-");
}

function isRoundTrip(legs: GroupTicketLeg[], sector?: string) {
  if (legs.length < 2) return false;
  const firstOrigin = String(legs[0].origin || "").toUpperCase();
  const finalDestination = String(legs[legs.length - 1].destination || "").toUpperCase();
  if (firstOrigin && finalDestination && firstOrigin === finalDestination) return true;
  const routeParts = String(sector || "").toUpperCase().split("-").filter(Boolean);
  return routeParts.length > 2 && routeParts[0] === routeParts[routeParts.length - 1];
}

export function normalizeGroupTicket(input: unknown): GroupTicket {
  const record = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const airlineRecord = record.airline && typeof record.airline === "object" ? record.airline as Record<string, unknown> : {};
  const itinerary = (Array.isArray(record.itinerary) ? record.itinerary : Array.isArray(record.details) ? record.details : []).map(normalizeLeg);
  const firstDetail = itinerary[0] || {};
  const lastDetail = itinerary[itinerary.length - 1] || {};
  const airline = value(record, ["airline_name", "airlineName", "carrier_name", "carrier"]) || value(airlineRecord, ["airline_name", "name", "short_name"]);
  const rawCategory = value(record, ["type_name", "type", "category", "group_type", "country", "destination", "sector"]);
  const categoryLabel = rawCategory ? titleize(String(rawCategory)) : "Available Group";
  const sector = (value(record, ["sector", "route", "routing"]) || routeFromLegs(itinerary)) as string | undefined;
  const roundTrip = isRoundTrip(itinerary, sector);
  return {
    id: String(value(record, ["id", "group_id", "groupId", "booking_id"]) || ""),
    categorySlug: slugify(categoryLabel),
    categoryLabel,
    categoryImage: value(record, ["category_image", "image", "banner", "thumbnail"]) as string | undefined,
    airlineName: airline ? String(airline) : undefined,
    airlineCode: value(airlineRecord, ["short_name", "iata", "code"]) as string | undefined,
    airlineLogo: (value(record, ["airline_logo", "logo", "airlineLogo"]) || value(airlineRecord, ["logo_url", "logo", "logo_path"])) as string | undefined,
    sector,
    tripType: roundTrip ? "round-trip" : "one-way",
    itinerary,
    departureDate: (value(record, ["dept_date", "departure_date", "departureDate", "effective_dept_date"]) || firstDetail.flightDate) as string | undefined,
    returnDate: roundTrip ? (value(record, ["return_date", "returnDate"]) || lastDetail.flightDate) as string | undefined : undefined,
    flightNumber: (value(record, ["flight_no", "flight_number", "flightNumber"]) || firstDetail.flightNumber) as string | undefined,
    baggage: (value(record, ["baggage", "bagage", "bags"]) || firstDetail.baggage) as string | undefined,
    seatsAvailable: value(record, ["seats", "available_seats", "available_no_of_pax", "seatsAvailable"]) as number | string | undefined,
    fare: value(record, ["fare", "price", "amount", "selling_price"]) as number | string | undefined,
    currency: String(value(record, ["currency"]) || "PKR"),
    status: (value(record, ["status", "availability"]) || (Number(value(record, ["available_no_of_pax"]) || 0) > 0 ? "available" : "sold out")) as string | undefined,
    terms: value(record, ["terms", "terms_conditions", "termsAndConditions"]) as string | undefined,
    cancellationRules: value(record, ["cancellation", "refund_policy", "cancellationRules"]) as string | undefined,
    supplierRemarks: value(record, ["remarks", "supplier_remarks", "supplierRemarks"]) as string | undefined,
  };
}

async function request(path: string, signal?: AbortSignal) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) throw new Error("Group ticketing service is unavailable.");
  return response.json();
}

export async function fetchGroupTickets(category = ALL_GROUPS_SLUG, signal?: AbortSignal): Promise<GroupTicket[]> {
  const query = new URLSearchParams({ category });
  const payload = await request(`/group-ticketing/groups?${query.toString()}`, signal);
  const groups = unwrapArray(payload).map(normalizeGroupTicket).filter((group) => group.id);

  return groups;
}

export interface GroupTicketCategory {
  slug: string;
  label: string;
  count: number;
  image?: string;
}

export function deriveGroupTicketCategories(groups: GroupTicket[]): GroupTicketCategory[] {
  const bySlug = new Map<string, GroupTicketCategory>();
  groups.forEach((group) => {
    const slug = group.categorySlug || slugify(group.categoryLabel || "available-group");
    const label = group.categoryLabel || titleize(slug);
    const existing = bySlug.get(slug);
    if (existing) {
      existing.count += 1;
      if (!existing.image && group.categoryImage) existing.image = group.categoryImage;
      return;
    }
    bySlug.set(slug, { slug, label, count: 1, image: group.categoryImage });
  });
  return Array.from(bySlug.values()).sort((a, b) => a.label.localeCompare(b.label));
}

export async function fetchGroupTicketCategories(signal?: AbortSignal): Promise<GroupTicketCategory[]> {
  const payload = await request("/group-ticketing/categories", signal);
  const categories = unwrapArray(payload) as GroupTicketCategory[];
  if (categories.length) return categories;
  const groups = await fetchGroupTickets(ALL_GROUPS_SLUG, signal);
  return deriveGroupTicketCategories(groups);
}

export async function fetchGroupTicketDetail(groupId: string, signal?: AbortSignal): Promise<GroupTicket> {
  const payload = await request(`/group-ticketing/groups/${encodeURIComponent(groupId)}`, signal);
  const data = (payload && typeof payload === "object" && "group" in payload ? (payload as Record<string, unknown>).group : payload && typeof payload === "object" && "result" in payload ? (payload as Record<string, unknown>).result : payload);
  return normalizeGroupTicket(data);
}

export function groupTicketWhatsAppMessage(category: string, group: GroupTicket) {
  const itinerary = group.itinerary?.length
    ? ["", "Itinerary:", ...group.itinerary.map((leg) => `- ${leg.flightDate || "Date TBA"} ${leg.flightNumber || "Flight TBA"}: ${leg.origin || "Origin TBA"} to ${leg.destination || "Destination TBA"}${leg.departureTime || leg.arrivalTime ? ` (${leg.departureTime || "TBA"} - ${leg.arrivalTime || "TBA"})` : ""}`)]
    : [];
  return [
    "Hello Travelian,",
    "",
    "I want to inquire about this group ticket:",
    "",
    `Group Type: ${category}`,
    `Airline: ${group.airlineName || "Available group"}`,
    `Route: ${group.sector || "Please confirm"}`,
    `Departure Date: ${group.departureDate || "Please confirm"}`,
    `Return Date: ${group.returnDate || "Not listed"}`,
    `Baggage: ${group.baggage || "Please confirm"}`,
    `Seats Available: ${group.seatsAvailable || "Please confirm"}`,
    `Fare: ${group.fare ? `${group.currency || "PKR"} ${group.fare}` : "Please confirm"}`,
    `Group ID: ${group.id}`,
    `Listing URL: ${SITE_BASE}/group-ticketing/${group.categorySlug || "all"}`,
    ...itinerary,
    "",
    "Please share availability and booking details.",
  ].join("\n");
}
