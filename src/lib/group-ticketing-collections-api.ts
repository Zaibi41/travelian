const API_BASE_URL = (import.meta.env.VITE_TRAVELIAN_API_BASE_URL || "https://api.travelian.pk").replace(/\/$/, "");

export interface GroupTicketingCollection {
  slug: string;
  publicLabel: string;
  supplierName: string;
  providerId: string;
  secretId: string;
  sortOrder?: number;
  enabled?: boolean;
}

export type GroupTicketingCollectionInput = GroupTicketingCollection & {
  originalSlug?: string;
  sortOrder?: number;
  enabled?: boolean;
};

export type GroupTicketingCollectionRecord = GroupTicketingCollectionInput & {
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
};

function normalizeCollection(record: Record<string, unknown>): GroupTicketingCollectionRecord {
  return {
    slug: String(record.slug || ""),
    publicLabel: String(record.publicLabel || ""),
    supplierName: String(record.supplierName || ""),
    providerId: String(record.providerId || ""),
    secretId: String(record.secretId || ""),
    sortOrder: Number(record.sortOrder || 0),
    enabled: record.enabled !== false,
    createdAt: record.createdAt ? String(record.createdAt) : undefined,
    updatedAt: record.updatedAt ? String(record.updatedAt) : undefined,
    deletedAt: record.deletedAt ? String(record.deletedAt) : undefined,
  };
}

export async function listGroupTicketingCollections(): Promise<GroupTicketingCollectionRecord[]> {
  const response = await fetch(`${API_BASE_URL}/content/group-ticketing-collections`);
  if (!response.ok) throw new Error("Unable to load group ticketing collections");
  const payload = await response.json();
  return Array.isArray(payload.items) ? payload.items.map(normalizeCollection) : [];
}

export async function listPublicGroupTicketingCollections(): Promise<Pick<GroupTicketingCollectionRecord, "slug" | "publicLabel" | "sortOrder">[]> {
  const response = await fetch(`${API_BASE_URL}/content/group-ticketing-collections/public`);
  if (!response.ok) throw new Error("Unable to load group ticketing collections");
  const payload = await response.json();
  return Array.isArray(payload.items) ? payload.items.map(normalizeCollection) : [];
}

export async function saveGroupTicketingCollection(collection: GroupTicketingCollectionInput): Promise<GroupTicketingCollectionRecord> {
  const response = await fetch(`${API_BASE_URL}/content/group-ticketing-collections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(collection),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || "Unable to save group ticketing collection");
  return normalizeCollection(payload.item);
}

export async function deleteGroupTicketingCollection(slug: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/content/group-ticketing-collections/${encodeURIComponent(slug)}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Unable to delete group ticketing collection");
}
