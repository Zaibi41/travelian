import type { Hotel } from "@/data/models";

import { API_BASE_URL } from "./api-config";

export async function listContentHotels(): Promise<Hotel[]> {
  const response = await fetch(`${API_BASE_URL}/content/hotels`);
  if (response.status === 404) return [];
  if (!response.ok) throw new Error("Unable to load hotels");
  const payload = await response.json();
  return Array.isArray(payload.items) ? payload.items : [];
}
