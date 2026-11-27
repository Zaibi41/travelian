// The admin Group Ticketing Collections page and its save/delete calls are removed (menu cleanup, 2026-11-27):
// group ticketing comes from the supplier APIs. The public site still reads the labels below until the
// Group Ticketing provider's "Public label" and "Category" fields (Integrations → Suppliers) replace them.
import { API_BASE_URL } from "./api-config";

export interface GroupTicketingCollection {
  slug: string;
  publicLabel: string;
  supplierName: string;
  providerId: string;
  integrationProvider?: string;
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
    integrationProvider: record.integrationProvider ? String(record.integrationProvider) : undefined,
    secretId: String(record.secretId || ""),
    sortOrder: Number(record.sortOrder || 0),
    enabled: record.enabled !== false,
    createdAt: record.createdAt ? String(record.createdAt) : undefined,
    updatedAt: record.updatedAt ? String(record.updatedAt) : undefined,
    deletedAt: record.deletedAt ? String(record.deletedAt) : undefined,
  };
}

function apiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`.replace(/\/+$/, "") || API_BASE_URL;
}

export async function listPublicGroupTicketingCollections(): Promise<Pick<GroupTicketingCollectionRecord, "slug" | "publicLabel" | "supplierName" | "sortOrder">[]> {
  const response = await fetch(apiUrl("/content/group-ticketing-collections/public"));
  if (!response.ok) throw new Error(`Unable to load group ticketing collections (${response.status})`);
  const payload = await response.json();
  return Array.isArray(payload.items) ? payload.items.map(normalizeCollection) : [];
}
