// Admin sign-in guard rules (pure, unit-tested): when a session counts as usable, which
// return paths are safe after sign-in, and the sign-in URL that carries them.

import type { AuthSession } from "@/lib/auth-session";

export type SessionState = "none" | "expired" | "valid";

/** No session, a session whose access token has passed its expiry, or one that can be used. */
export function sessionState(session: AuthSession | null, now = Date.now()): SessionState {
  if (!session) return "none";
  if (session.expiresAt && session.expiresAt <= now) return "expired";
  return "valid";
}

export const SIGN_IN_PATH = "/signin";
export const EXPIRED_REASON = "expired";
export const EXPIRED_MESSAGE = "Your session expired. Sign in again.";

/** A path to return to after sign-in, only if it is a relative path inside /admin. Anything
 *  else (a full URL, //host, javascript:, a backslash trick, a path outside /admin) is refused. */
export function safeReturnPath(raw: string | null | undefined): string | null {
  if (!raw || raw.length > 2048) return null;
  if (!raw.startsWith("/") || raw.startsWith("//") || /[\\\u0000-\u001f]/.test(raw)) return null;
  let url: URL;
  try {
    url = new URL(raw, "https://travelian.invalid");
  } catch {
    return null;
  }
  if (url.origin !== "https://travelian.invalid") return null;
  if (url.pathname !== "/admin" && !url.pathname.startsWith("/admin/")) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

/** /signin?redirect=<page>[&reason=expired] for the page the person asked for. */
export function signInUrl(returnTo: string, expired = false): string {
  const params = new URLSearchParams();
  const safe = safeReturnPath(returnTo);
  if (safe) params.set("redirect", safe);
  if (expired) params.set("reason", EXPIRED_REASON);
  const query = params.toString();
  return query ? `${SIGN_IN_PATH}?${query}` : SIGN_IN_PATH;
}

/** What the sign-in page does before it renders anything: a valid session goes straight to the
 *  admin (or a safe page inside /admin); an expired session with a refresh token tries the
 *  refresh once first; otherwise the form. Roles are not decided here (the gateway and the
 *  admin's "no access" state do that). */
export type SignInDecision = { kind: "go"; to: string } | { kind: "refresh" } | { kind: "form" };

export function signInDecision(session: AuthSession | null, redirect: string | null | undefined, now = Date.now()): SignInDecision {
  const state = sessionState(session, now);
  if (state === "valid") return { kind: "go", to: safeReturnPath(redirect) ?? "/admin" };
  if (state === "expired" && session?.refreshToken) return { kind: "refresh" };
  return { kind: "form" };
}
