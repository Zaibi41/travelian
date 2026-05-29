import type { CustomerProfile } from "@/data/mock";

const API_BASE_URL = (import.meta.env.VITE_TRAVELIAN_API_BASE_URL || "https://api.travelian.pk").replace(/\/$/, "");

export async function listCustomers(): Promise<CustomerProfile[]> {
  const response = await fetch(`${API_BASE_URL}/content/customers`);
  if (!response.ok) throw new Error("Unable to load customers");
  const payload = await response.json();
  return Array.isArray(payload.items) ? payload.items : [];
}

export async function saveCustomer(customer: Omit<CustomerProfile, "customerId"> & { customerId?: string }): Promise<CustomerProfile> {
  const response = await fetch(`${API_BASE_URL}/content/customers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(customer),
  });
  if (!response.ok) throw new Error("Unable to save customer");
  const payload = await response.json();
  return payload.item;
}
