export type GroupTicketCategory = "umrah" | "uae" | "ksa" | "oman" | "bahrain" | "kuwait" | "all";

export interface GroupTicket {
  id: string;
  airlineName?: string;
  airlineLogo?: string;
  sector?: string;
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

const API_BASE = import.meta.env.VITE_TRAVELIAN_API_BASE_URL || "";

function unwrapArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ["data", "groups", "available_groups", "result", "results"]) {
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

export function normalizeGroupTicket(input: unknown): GroupTicket {
  const record = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const airline = value(record, ["airline_name", "airline", "airlineName", "carrier_name", "carrier"]);
  return {
    id: String(value(record, ["id", "group_id", "groupId", "booking_id"]) || ""),
    airlineName: airline ? String(airline) : undefined,
    airlineLogo: value(record, ["airline_logo", "logo", "airlineLogo"]) as string | undefined,
    sector: value(record, ["sector", "route", "routing"]) as string | undefined,
    departureDate: value(record, ["dept_date", "departure_date", "departureDate"]) as string | undefined,
    returnDate: value(record, ["return_date", "arrival_date", "returnDate"]) as string | undefined,
    flightNumber: value(record, ["flight_no", "flight_number", "flightNumber"]) as string | undefined,
    baggage: value(record, ["baggage", "bagage", "bags"]) as string | undefined,
    seatsAvailable: value(record, ["seats", "available_seats", "seatsAvailable"]) as number | string | undefined,
    fare: value(record, ["fare", "price", "amount", "selling_price"]) as number | string | undefined,
    currency: String(value(record, ["currency"]) || "PKR"),
    status: value(record, ["status", "availability"]) as string | undefined,
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

export async function fetchGroupTickets(category: GroupTicketCategory, signal?: AbortSignal): Promise<GroupTicket[]> {
  const query = new URLSearchParams({
    type: "null",
    airline_id: "null",
    sector: "",
    dept_date: "null",
  });
  const payload = await request(`/api/available/groups?${query.toString()}`, signal);
  const groups = unwrapArray(payload).map(normalizeGroupTicket).filter((group) => group.id);

  if (category === "all") return groups;
  const keywordMap: Record<GroupTicketCategory, string[]> = {
    umrah: ["umrah", "jeddah", "madinah", "med", "jed", "makkah"],
    uae: ["uae", "dubai", "dxb", "sharjah", "auh"],
    ksa: ["ksa", "saudi", "riyadh", "jeddah", "madinah", "ruh", "jed", "med"],
    oman: ["oman", "muscat", "mct"],
    bahrain: ["bahrain", "bah"],
    kuwait: ["kuwait", "kwi"],
    all: [],
  };
  const keywords = keywordMap[category];
  return groups.filter((group) => {
    const haystack = `${group.sector || ""} ${group.airlineName || ""}`.toLowerCase();
    return keywords.some((keyword) => haystack.includes(keyword));
  });
}

export async function fetchGroupTicketDetail(groupId: string, signal?: AbortSignal): Promise<GroupTicket> {
  const payload = await request(`/api/group/detail/${encodeURIComponent(groupId)}`, signal);
  const data = (payload && typeof payload === "object" && "data" in payload ? (payload as Record<string, unknown>).data : payload);
  return normalizeGroupTicket(data);
}

export function groupTicketWhatsAppMessage(category: string, group: GroupTicket) {
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
    "",
    "Please share availability and booking details.",
  ].join("\n");
}
