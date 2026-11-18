// One upload path for every admin screen (B13, D38): the gateway signs a one-time S3 POST for a purpose, the browser
// uploads the file straight to S3, and the screen saves only the returned key on its record. Never a local file or path.
import { gatewayPost } from "@/lib/gateway/client";

export type UploadPurpose = "site_logo" | "payment_qr" | "payment_proof";
const TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export async function uploadImage(purpose: UploadPurpose, file: File): Promise<{ assetKey: string; publicUrl?: string | null }> {
  if (!(TYPES as readonly string[]).includes(file.type)) throw new Error("Choose a PNG, JPEG or WebP image.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("The image must be 2 MB or smaller.");
  const signed = await gatewayPost("/v1/admin/uploads", { purpose, content_type: file.type as (typeof TYPES)[number] }, {
    unavailableMessage: "Uploads aren't available right now.",
  });
  const form = new FormData();
  Object.entries(signed.fields).forEach(([key, value]) => form.append(key, value));
  form.append("file", file);
  const response = await fetch(signed.url, { method: "POST", body: form });
  if (!response.ok) throw new Error("The image couldn't be uploaded. Nothing was changed.");
  return { assetKey: signed.asset_key, publicUrl: signed.public_url };
}
