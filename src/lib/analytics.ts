// Google Analytics 4 for the public site (issue #20).
// Off unless VITE_GA_MEASUREMENT_ID is set at build time. Admin pages are never tracked, and
// page views are sent without the query string or hash, so booking references, emails and
// tokens in URLs never reach Google.

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

const MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{4,20}$/;

let loadedId: string | null = null;

export function analyticsMeasurementId(raw: string | undefined = import.meta.env.VITE_GA_MEASUREMENT_ID): string | null {
  const id = raw?.trim().toUpperCase();
  return id && MEASUREMENT_ID_PATTERN.test(id) ? id : null;
}

// Paths that carry a secret (a booking access link) are reported by their route, not the value.
const SECRET_PATHS: Array<[RegExp, string]> = [[/^\/my-bookings\/view\/[^/]+/, "/my-bookings/view/:token"]];

export function reportedPath(pathname: string): string {
  for (const [pattern, replacement] of SECRET_PATHS) {
    if (pattern.test(pathname)) return pathname.replace(pattern, replacement);
  }
  return pathname;
}

export function isTrackedPath(pathname: string): boolean {
  return !/^\/admin(\/|$)/.test(pathname);
}

function isAutomatedBrowser(): boolean {
  // Prerendering (scripts/prerender.mjs) and Playwright run in an automated browser.
  return typeof navigator !== "undefined" && navigator.webdriver === true;
}

function ensureLoaded(id: string): boolean {
  if (loadedId === id) return true;
  if (typeof window === "undefined" || typeof document === "undefined" || isAutomatedBrowser()) return false;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // gtag.js reads the arguments object, not an array.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  // Page views are sent by trackPageView so client-side navigation is counted once per page.
  window.gtag("config", id, { send_page_view: false });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
  loadedId = id;
  return true;
}

export function trackPageView(pathname: string, measurementId: string | null = analyticsMeasurementId()): boolean {
  if (!measurementId || !isTrackedPath(pathname)) return false;
  if (!ensureLoaded(measurementId)) return false;
  const path = reportedPath(pathname);
  window.gtag!("event", "page_view", {
    page_path: path,
    page_location: `${window.location.origin}${path}`,
    page_title: document.title,
  });
  return true;
}

/** Test hook. */
export function resetAnalyticsForTests(): void {
  loadedId = null;
  delete window.gtag;
  delete window.dataLayer;
}
