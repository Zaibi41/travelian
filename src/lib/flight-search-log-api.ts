import { API_BASE_URL } from "./api-config";

export interface FlightSearchLogRecord {
  searchLogId: string;
  route: string;
  tripType: string;
  departureDate: string;
  returnDate?: string;
  resultsCount: number;
  status: "found" | "not_found" | "error";
  providers: Record<string, string>;
  createdAt: string;
}

export async function listFlightSearchLogs(): Promise<FlightSearchLogRecord[]> {
  const response = await fetch(`${API_BASE_URL}/content/flight-search-logs`);
  if (!response.ok) throw new Error("Unable to load failed-search history");
  const payload = await response.json();
  return Array.isArray(payload.items) ? payload.items : [];
}
