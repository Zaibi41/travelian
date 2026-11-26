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
  window.gtag("config", id, { send_page_view: false, anonymize_ip: true, allow_google_signals: false, allow_ad_personalization_signals: false });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
}

/** Count a page view for a public page; private pages are never sent (and never load the script on their own). */
export function trackPageView(pathname: string, search = "") {
  const id = analyticsId();
  if (!id || isPrivatePath(pathname)) return;
  load(id);
  window.gtag?.("event", "page_view", { page_path: pathname + search, page_location: window.location.origin + pathname + search, page_title: document.title });
}
