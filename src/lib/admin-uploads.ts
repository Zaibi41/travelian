// One upload path for every admin screen (B13, D38): the gateway signs a one-time S3 POST for a purpose, the browser
// uploads the file straight to S3, and the screen saves only the returned key on its record. Never a local file or path.
// Every failure says what went wrong ("Image upload failed: …"), so it is never silent.
import { gatewayPost } from "@/lib/gateway/client";

export type UploadPurpose = "site_logo" | "payment_qr" | "payment_proof";
const TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

const FAILED = "Image upload failed:";

/** S3's own error code from its XML answer (EntityTooLarge, AccessDenied, ...), if any. */
function s3ErrorCode(body: string): string | undefined {
  return /<Code>([^<]+)<\/Code>/.exec(body)?.[1];
}

function s3Message(code: string | undefined, status: number): string {
  switch (code) {
    case "EntityTooLarge":
      return `${FAILED} file too large (2 MB max).`;
    case "EntityTooSmall":
      return `${FAILED} the file is empty.`;
    case "AccessDenied":
      return `${FAILED} storage refused the upload (access denied, or the upload link expired). Try again.`;
    case "InvalidRequest":
    case "AuthorizationQueryParametersError":
    case "SignatureDoesNotMatch":
    case "InvalidAccessKeyId":
      return `${FAILED} storage rejected the upload signature (gateway S3 settings). Nothing was saved.`;
    default:
      return `${FAILED} storage answered ${code ?? `HTTP ${status}`}. Nothing was saved.`;
  }
}

const signUpload = (purpose: UploadPurpose, contentType: (typeof TYPES)[number]) =>
  gatewayPost("/v1/admin/uploads", { purpose, content_type: contentType }, { unavailableMessage: "Uploads aren't available right now." });

export async function uploadImage(purpose: UploadPurpose, file: File): Promise<{ assetKey: string; publicUrl?: string | null }> {
  if (!(TYPES as readonly string[]).includes(file.type)) throw new Error(`${FAILED} choose a PNG, JPEG or WebP image.`);
  if (file.size > MAX_UPLOAD_BYTES) throw new Error(`${FAILED} file too large (2 MB max).`);
  let signed: Awaited<ReturnType<typeof signUpload>>;
  try {
    signed = await signUpload(purpose, file.type as (typeof TYPES)[number]);
  } catch (error) {
    throw new Error(`${FAILED} ${error instanceof Error ? error.message : "the upload couldn't be prepared."}`);
  }
  const form = new FormData();
  Object.entries(signed.fields).forEach(([key, value]) => form.append(key, value));
  form.append("file", file);
  let response: Response;
  try {
    response = await fetch(signed.url, { method: "POST", body: form });
  } catch {
    // The browser blocks the answer when the bucket's CORS doesn't list this site's address, or the network is down.
    throw new Error(`${FAILED} the storage server couldn't be reached (network, or the bucket's CORS doesn't allow this site). Nothing was saved.`);
  }
  if (!response.ok) throw new Error(s3Message(s3ErrorCode(await response.text().catch(() => "")), response.status));
  return { assetKey: signed.asset_key, publicUrl: signed.public_url };
}
