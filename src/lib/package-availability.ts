import type { UmrahPackage } from "@/data/models";

export function isPackageExpired(item: Pick<UmrahPackage, "expiresAt">, today = localDateKey()) {
  return Boolean(item.expiresAt && item.expiresAt < today);
}

export function isPublishedUmrahPackage(item: UmrahPackage) {
  return item.category === "umrah" &&
    item.status === "active" &&
    !item.archivedAt &&
    !item.deletedAt &&
    !isPackageExpired(item);
}

function localDateKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
