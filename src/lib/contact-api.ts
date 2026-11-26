// gateway#114: the Contact page's message, sent to POST /v1/public/contact (no sign-in). The gateway validates, rate-limits
// and delivers it to the team (admin Notifications and email).
import type { components } from "@/lib/gateway/schema";

export type ContactMessage = components["schemas"]["ContactMessage"];

export class ContactError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

const base = () => (import.meta.env.VITE_TRAVELIAN_GATEWAY_BASE_URL?.trim() || "").replace(/\/+$/, "");
const UNAVAILABLE = "Your message couldn't be sent right now. Please try again, or message us on WhatsApp.";

export async function sendContactMessage(message: ContactMessage, fetchImpl: typeof fetch = fetch): Promise<string> {
  const url = base();
  if (!url) throw new ContactError(UNAVAILABLE);
  let response: Response;
  try {
    response = await fetchImpl(`${url}/v1/public/contact`, {
      method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(message),
    });
  } catch {
    throw new ContactError("You seem to be offline. Check your connection and try again.");
  }
  const answer = await response.json().catch(() => null) as { message?: string; detail?: unknown } | null;
  if (response.ok) return answer?.message || "Thanks, your message has been sent.";
  if (response.status === 429) throw new ContactError("You've sent several messages already. Please wait a while, or message us on WhatsApp.", 429);
  if (response.status === 422 && typeof answer?.detail === "string") throw new ContactError(answer.detail, 422);
  if (response.status === 422) throw new ContactError("Please check the form and try again.", 422);
  throw new ContactError(UNAVAILABLE, response.status);
}
