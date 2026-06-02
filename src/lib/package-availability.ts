import type { UmrahPackage } from "@/data/models";

export function isPackageExpired(item: Pick<UmrahPackage, "expiresAt">, today = localDateKey()) {
  return Boolean(item.expiresAt && item.expiresAt < today);
}

export function isPublishedUmrahPackage(item: UmrahPackage) {
  return isPublishedPackage(item, "umrah");
}

export function isPublishedPackage(item: UmrahPackage, category: UmrahPackage["category"]) {
  return item.category === category &&
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
