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

export interface GroupTicketCollection {
  slug: string;
  publicLabel: string;
  supplierName: string;
  providerId: string;
  secretId: string;
}

export const GROUP_TICKET_COLLECTIONS: GroupTicketCollection[] = [
  {
    slug: "collection-1",
    publicLabel: "Group Collection 1",
    supplierName: "Al Haider",
    providerId: "alhaider",
    secretId: "travelian/providers/alhaider",
  },
  {
    slug: "collection-2",
    publicLabel: "Group Collection 2",
    supplierName: "Dhillon & Sahi",
    providerId: "dhilluandsahi",
    secretId: "travelian/providers/dhilluandsahi",
  },
  {
    slug: "collection-3",
    publicLabel: "Group Collection 3",
    supplierName: "Sahi Skypass",
    providerId: "skypass",
    secretId: "travelian/providers/skypass",
  },
];

export const GROUP_TICKET_SUPPLIER_LABELS: Record<string, string> = Object.fromEntries(
  GROUP_TICKET_COLLECTIONS.map((entry) => [entry.slug, entry.publicLabel]),
);

/** Real supplier names — shown in admin and via card tooltip / detail for staff identification. */
export const GROUP_TICKET_SUPPLIER_INTERNAL_LABELS: Record<string, string> = Object.fromEntries(
  GROUP_TICKET_COLLECTIONS.map((entry) => [entry.slug, entry.supplierName]),
);

export function groupTicketSupplierInternalLabel(slug?: string) {
  if (slug && GROUP_TICKET_SUPPLIER_INTERNAL_LABELS[slug]) {
    return GROUP_TICKET_SUPPLIER_INTERNAL_LABELS[slug];
  }
  return undefined;
}

export function groupTicketCollectionLabel(group: GroupTicket) {
  return groupTicketCategoryLabel(group.categorySlug) || group.categoryLabel || "Group Collection";
}

export function groupTicketDisplayTitle(group: GroupTicket, index?: number) {
  const route = group.sector?.trim();
  if (route) return `${route} Group`;
  if (index !== undefined) return `Group Ticket ${index + 1}`;
  return "Group Ticket";
}

export function groupTicketCategoryLabel(slug?: string, fallback?: string) {
  if (slug && GROUP_TICKET_SUPPLIER_LABELS[slug]) return GROUP_TICKET_SUPPLIER_LABELS[slug];
  if (fallback && GROUP_TICKET_SUPPLIER_LABELS[fallback]) return GROUP_TICKET_SUPPLIER_LABELS[fallback];
  return "Group Collection";
}

export function maskCategoryForDisplay(category: GroupTicketCategory): GroupTicketCategory {
  return {
    ...category,
    label: groupTicketCategoryLabel(category.slug),
  };
}

export function maskGroupTicketForDisplay(group: GroupTicket, index?: number): GroupTicket {
  return {
    ...group,
    categoryLabel: groupTicketCategoryLabel(group.categorySlug),
    provider: undefined,
    airlineName: undefined,
    airlineCode: undefined,
    airlineLogo: undefined,
    flightNumber: undefined,
    supplierRemarks: undefined,
    itinerary: group.itinerary?.map((leg) => ({ ...leg, flightNumber: undefined })),
    terms: group.terms ? "Available — confirm with Travelian before booking." : undefined,
    cancellationRules: group.cancellationRules ? "Subject to Travelian terms." : undefined,
    displayTitle: groupTicketDisplayTitle(group, index),
  };
}

export interface GroupTicket {
  id: string;
  provider?: string;
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
  displayTitle?: string;
}

export function groupTicketPrimaryDate(group: GroupTicket): string | undefined {
  const departure = group.departureDate?.trim();
  if (departure) {
    const normalized = normalizeGroupTicketDate(departure);
    if (normalized) return normalized;
  }
  for (const leg of group.itinerary || []) {
    const legDate = leg.flightDate?.trim();
    if (!legDate) continue;
    const normalized = normalizeGroupTicketDate(legDate);
    if (normalized) return normalized;
  }
  return undefined;
}

const AIRPORT_NAME_TO_CODE: Record<string, string> = {
  islamabad: "ISB",
  lahore: "LHE",
  karachi: "KHI",
  peshawar: "PEW",
  sialkot: "SKT",
  faisalabad: "LYP",
  dammam: "DMM",
  riyadh: "RUH",
  jeddah: "JED",
  medina: "MED",
  madinah: "MED",
  muscat: "MCT",
  dubai: "DXB",
  sharjah: "SHJ",
  "abu dhabi": "AUH",
};

export function normalizeGroupTicketDate(value?: string): string | undefined {
  const raw = String(value || "").trim();
  if (!raw) return undefined;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  const dashMatch = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) {
    const [, day, month, year] = dashMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return undefined;
}

function airportCodeFromText(value?: string): string | undefined {
  const text = String(value || "").trim();
  if (!text) return undefined;
  const upper = text.toUpperCase();
  if (/^[A-Z]{3}$/.test(upper)) return upper;
  const lower = text.toLowerCase();
  for (const [name, code] of Object.entries(AIRPORT_NAME_TO_CODE)) {
    if (lower.includes(name)) return code;
  }
  return undefined;
}

function iataCodesFromSector(sector?: string) {
  return String(sector || "")
    .toUpperCase()
    .split("-")
    .map((part) => part.trim())
    .filter((part) => /^[A-Z]{3}$/.test(part));
}

export function groupTicketOriginCode(group: GroupTicket): string | undefined {
  const firstLeg = group.itinerary?.[0];
  const fromLeg = airportCodeFromText(firstLeg?.origin);
  if (fromLeg) return fromLeg;

  const sectorCodes = iataCodesFromSector(group.sector);
  if (sectorCodes.length) return sectorCodes[0];

  const sectorParts = String(group.sector || "").split("-").map((part) => part.trim()).filter(Boolean);
  return airportCodeFromText(sectorParts[0]);
}

export function groupTicketDestinationCode(group: GroupTicket): string | undefined {
  const legs = group.itinerary || [];
  const lastLeg = legs[legs.length - 1];
  const fromLeg = airportCodeFromText(lastLeg?.destination);
  if (fromLeg) return fromLeg;

  const sectorCodes = iataCodesFromSector(group.sector);
  if (sectorCodes.length) return sectorCodes[sectorCodes.length - 1];

  const sectorParts = String(group.sector || "").split("-").map((part) => part.trim()).filter(Boolean);
  return airportCodeFromText(sectorParts[sectorParts.length - 1]);
}

export interface GroupTicketSearchFilters {
  from?: string;
  to?: string;
  dateFrom?: string;
}

export function filterGroupTickets(groups: GroupTicket[], filters: GroupTicketSearchFilters = {}): GroupTicket[] {
  const from = filters.from?.trim().toUpperCase();
  const to = filters.to?.trim().toUpperCase();
  const dateFrom = filters.dateFrom ? normalizeGroupTicketDate(filters.dateFrom) : undefined;
  if (!from && !to && !dateFrom) return groups;

  return groups.filter((group) => {
    if (dateFrom) {
      const date = groupTicketPrimaryDate(group);
      if (!date || date !== dateFrom) return false;
    }
    if (from) {
      const origin = groupTicketOriginCode(group);
      if (!origin || origin !== from) return false;
    }
    if (to) {
      const destination = groupTicketDestinationCode(group);
      if (!destination || destination !== to) return false;
    }
    return true;
  });
}

/** @deprecated Use filterGroupTickets instead */
export function filterGroupTicketsByDateRange(
  groups: GroupTicket[],
  dateFrom?: string,
  dateTo?: string,
): GroupTicket[] {
  if (!dateFrom && !dateTo) return groups;
  return groups.filter((group) => {
    const date = groupTicketPrimaryDate(group);
    if (!date) return false;
    const normalizedFrom = dateFrom ? normalizeGroupTicketDate(dateFrom) : undefined;
    const normalizedTo = dateTo ? normalizeGroupTicketDate(dateTo) : undefined;
    if (normalizedFrom && date < normalizedFrom) return false;
    if (normalizedTo && date > normalizedTo) return false;
    return true;
  });
}

export interface GroupTicketSearchParams {
  dateFrom?: string;
  from?: string;
  to?: string;
}

export function parseGroupTicketSearchParams(searchParams: URLSearchParams): GroupTicketSearchParams {
  return {
    dateFrom: searchParams.get("dateFrom") || searchParams.get("date") || undefined,
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
  };
}

export function buildGroupTicketSearchParams(values: GroupTicketSearchParams): URLSearchParams {
  const params = new URLSearchParams();
  if (values.from) params.set("from", values.from.toUpperCase());
  if (values.to) params.set("to", values.to.toUpperCase());
  if (values.dateFrom) params.set("dateFrom", values.dateFrom);
  return params;
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
  const supplierCategorySlug = value(record, ["categorySlug"]) as string | undefined;
  const supplierCategoryLabel = value(record, ["categoryLabel"]) as string | undefined;
  const rawCategory = value(record, ["type_name", "type", "category", "group_type", "country", "destination", "sector"]);
  const categoryLabel = supplierCategoryLabel
    || (rawCategory ? titleize(String(rawCategory)) : "Available Group");
  const sector = (value(record, ["sector", "route", "routing"]) || routeFromLegs(itinerary)) as string | undefined;
  const roundTrip = isRoundTrip(itinerary, sector);
  const airline = value(record, ["airline_name", "airlineName", "carrier_name", "carrier"]) || value(airlineRecord, ["airline_name", "name", "short_name"]);
  return {
    id: String(value(record, ["id", "group_id", "groupId", "booking_id"]) || ""),
    provider: value(record, ["provider"]) as string | undefined,
    categorySlug: supplierCategorySlug || slugify(categoryLabel),
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
  const display = maskGroupTicketForDisplay(group);
  const itinerary = display.itinerary?.length
    ? ["", "Itinerary:", ...display.itinerary.map((leg) => `- ${leg.flightDate || "Date TBA"}: ${leg.origin || "Origin TBA"} to ${leg.destination || "Destination TBA"}${leg.departureTime || leg.arrivalTime ? ` (${leg.departureTime || "TBA"} - ${leg.arrivalTime || "TBA"})` : ""}`)]
    : [];
  return [
    "Hello Travelian,",
    "",
    "I want to inquire about this group ticket:",
    "",
    `Collection: ${category}`,
    `Route: ${display.sector || "Please confirm"}`,
    `Departure Date: ${display.departureDate || "Please confirm"}`,
    `Return Date: ${display.returnDate || "Not listed"}`,
    `Baggage: ${display.baggage || "Please confirm"}`,
    `Seats Available: ${display.seatsAvailable || "Please confirm"}`,
    `Fare: ${display.fare ? `${display.currency || "PKR"} ${display.fare}` : "Please confirm"}`,
    `Listing URL: ${SITE_BASE}/group-ticketing/${display.categorySlug || "all"}`,
    ...itinerary,
    "",
    "Please share availability and booking details.",
  ].join("\n");
}
