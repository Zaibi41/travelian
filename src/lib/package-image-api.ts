import type { UmrahPackage } from "@/data/models";

import { API_BASE_URL } from "./api-config";

type PackageImageCategory = Extract<UmrahPackage["category"], "umrah" | "tour" | "visa">;

interface UploadUrlResponse {
  key: string;
  uploadUrl: string;
  publicUrl: string;
  expiresIn: number;
}

interface PackageImageItem {
  key: string;
  url: string;
  updatedAt?: string;
  size?: number;
}

export async function uploadPackageImage(category: PackageImageCategory, file: File): Promise<string> {
  const uploadResponse = await fetch(`${API_BASE_URL}/content/package-images/upload-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category,
      fileName: file.name,
      contentType: file.type || "image/jpeg",
    }),
  });
  if (!uploadResponse.ok) throw new Error("Unable to prepare image upload");
  const payload = await uploadResponse.json();
  const item = payload.item as UploadUrlResponse;
  if (!item?.uploadUrl || !item.publicUrl) throw new Error("Invalid image upload response");

  const putResponse = await fetch(item.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "image/jpeg" },
    body: file,
  });
  if (!putResponse.ok) throw new Error("Unable to upload image");
  return item.publicUrl;
}

export async function getRandomPackageImage(category: PackageImageCategory): Promise<string | undefined> {
  const response = await fetch(`${API_BASE_URL}/content/package-images/random?${new URLSearchParams({ category }).toString()}`);
  if (!response.ok) throw new Error("Unable to load package images");
  const payload = await response.json();
  const item = payload.item as PackageImageItem | null;
  return item?.url || undefined;
}
