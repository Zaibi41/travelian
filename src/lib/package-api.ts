import type { UmrahPackage } from "@/data/models";

const API_BASE_URL = (import.meta.env.VITE_TRAVELIAN_API_BASE_URL || "https://api.travelian.pk").replace(/\/$/, "");

export async function listPackages(category: UmrahPackage["category"], includeDeleted = false): Promise<UmrahPackage[]> {
  const query = new URLSearchParams({ category });
  if (includeDeleted) query.set("includeDeleted", "true");
  const response = await fetch(`${API_BASE_URL}/content/packages?${query.toString()}`);
  if (!response.ok) throw new Error("Unable to load packages");
  const payload = await response.json();
  return Array.isArray(payload.items) ? payload.items : [];
}

export async function getPackage(category: UmrahPackage["category"], packageId: string): Promise<UmrahPackage> {
  const response = await fetch(`${API_BASE_URL}/content/packages/${encodeURIComponent(category)}/${encodeURIComponent(packageId)}`);
  if (!response.ok) throw new Error("Unable to load package");
  const payload = await response.json();
  return payload.item;
}

export async function savePackage(packageData: UmrahPackage): Promise<UmrahPackage> {
  const response = await fetch(`${API_BASE_URL}/content/packages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(packageData),
  });
  if (!response.ok) throw new Error("Unable to save package");
  const payload = await response.json();
  return payload.item;
}

export async function softDeletePackage(category: UmrahPackage["category"], packageId: string): Promise<UmrahPackage> {
  const response = await fetch(`${API_BASE_URL}/content/packages/${encodeURIComponent(category)}/${encodeURIComponent(packageId)}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Unable to delete package");
  const payload = await response.json();
  return payload.item;
}
