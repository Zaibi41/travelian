import type { TravelTicket } from "@/data/models";

import { API_BASE_URL } from "./api-config";

export async function listTickets(includeDeleted = false): Promise<TravelTicket[]> {
  const query = includeDeleted ? "?includeDeleted=true" : "";
  const response = await fetch(`${API_BASE_URL}/content/tickets${query}`);
  if (!response.ok) throw new Error("Unable to load tickets");
  const payload = await response.json();
  return Array.isArray(payload.items) ? payload.items : [];
}

export async function saveTicket(ticket: TravelTicket): Promise<TravelTicket> {
  const response = await fetch(`${API_BASE_URL}/content/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ticket),
  });
  if (!response.ok) throw new Error("Unable to save ticket");
  const payload = await response.json();
  return payload.item;
}

export async function softDeleteTicket(ticketId: string): Promise<TravelTicket> {
  const response = await fetch(`${API_BASE_URL}/content/tickets/${encodeURIComponent(ticketId)}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Unable to delete ticket");
  const payload = await response.json();
  return payload.item;
}
