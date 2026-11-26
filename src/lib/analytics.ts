// Google Analytics 4 (#20). Loads only when VITE_GA_MEASUREMENT_ID is set (a public "G-…" id in .env.production), and
// only counts public pages: never the admin, checkout, account, sign-in or other private pages (src/lib/private-paths.ts).
// Page views are sent on each route change (the SPA doesn't reload). No personal data is sent: path and title only.
import { isPrivatePath } from "@/lib/private-paths";

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window { dataLayer?: unknown[]; gtag?: Gtag }
}

const ID = String(import.meta.env.VITE_GA_MEASUREMENT_ID || "").trim();

export const analyticsId = (): string | null => (/^G-[A-Z0-9]{4,20}$/.test(ID) ? ID : null);

let loaded = false;

function load(id: string) {
  if (loaded || typeof document === "undefined") return;
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer!.push(arguments); }; // eslint-disable-line prefer-rest-params
  window.gtag("js", new Date());
  // Page views are sent by hand on route changes; IP anonymised; no ad personalisation signals.
  window.gtag("config", id, { send_page_view: false, page_location: window.location.origin + "/", anonymize_ip: true, allow_google_signals: false, allow_ad_personalization_signals: false });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
}

/** Lower-cased, percent-decoded, duplicate and trailing slashes removed: routes match case-insensitively, so the
 * private-page check must too ("/Admin" is the admin). */
export function normalisePath(pathname: string): string {
  let path = pathname;
  try { path = decodeURIComponent(pathname); } catch { /* keep as is */ }
  path = ("/" + path.toLowerCase()).replace(/\/{2,}/g, "/");
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

/** Only these search parameters are ever sent (search pages); anything else in the query (tokens, references, email) is dropped. */
const SAFE_PARAMS = new Set(["from", "to", "depart", "return", "trip", "cabin", "adults", "children", "infants", "currency",
  "city", "destination", "checkin", "checkout", "rooms", "guests"]);

export function safeSearch(search: string): string {
  const kept = new URLSearchParams();
  new URLSearchParams(search).forEach((value, key) => { if (SAFE_PARAMS.has(key.toLowerCase())) kept.append(key, value); });
  const query = kept.toString();
  return query ? `?${query}` : "";
}

const disable = (id: string, off: boolean) => { (window as unknown as Record<string, unknown>)[`ga-disable-${id}`] = off; };

/** Count a page view for a public page. Private pages are never sent: they don't load the script on their own, and once it
 * is loaded GA is switched off (ga-disable-<id>) while one is open, so no automatic event can carry its address. */
export function trackPageView(pathname: string, search = "") {
  const id = analyticsId();
  if (!id) return;
  const path = normalisePath(pathname);
  if (isPrivatePath(path)) {
    if (loaded) disable(id, true);
    return;
  }
  disable(id, false);
  load(id);
  const page = path + safeSearch(search);
  const location = window.location.origin + page;
  window.gtag?.("set", { page_location: location, page_path: page });
  window.gtag?.("event", "page_view", { page_path: page, page_location: location, page_title: document.title });
}
