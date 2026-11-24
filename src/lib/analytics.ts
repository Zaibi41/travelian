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

/** Admin pages and booking access links are never sent to Google, not even by GA's own automatic events. */
export function isBlockedPath(pathname: string): boolean {
  return !isTrackedPath(pathname) || SECRET_PATHS.some(([pattern]) => pattern.test(pathname));
}

function setDisabled(id: string, pathname: string): void {
  // GA's documented opt-out flag; checked on every hit, including enhanced measurement.
  (window as unknown as Record<string, unknown>)[`ga-disable-${id}`] = isBlockedPath(pathname);
}

// GA's "page changes based on browser history events" fires on pushState / popstate with the real
// URL. Wrapping history before gtag.js loads (so GA wraps ours) sets the opt-out flag first.
function installHistoryGuard(id: string): void {
  const pathOf = (url: string | URL | null | undefined) =>
    url == null ? window.location.pathname : new URL(String(url), window.location.href).pathname;
  for (const method of ["pushState", "replaceState"] as const) {
    const original = window.history[method].bind(window.history);
    window.history[method] = (data: unknown, unused: string, url?: string | URL | null) => {
      setDisabled(id, pathOf(url));
      return original(data, unused, url);
    };
  }
  window.addEventListener("popstate", () => setDisabled(id, window.location.pathname), true);
}

/** What Google sees for a page: path, URL and title are all derived from the masked path. */
export function pageContext(pathname: string, origin: string = window.location.origin) {
  // Admin pages are never reported; a placeholder replaces them in any automatic GA event.
  const path = isTrackedPath(pathname) ? reportedPath(pathname) : "/admin";
  return {
    page_path: path,
    page_location: `${origin}${path}`,
    // Never document.title: it can still be the previous (admin) page's title when this runs.
    page_title: path,
  };
}

let previousLocation: string | null = null;

// Fields set with gtag("set") apply to every later hit, including GA's own automatic events
// (enhanced measurement, user_engagement), so the real URL, referrer and title never leave.
function applyPageContext(pathname: string): ReturnType<typeof pageContext> {
  const context = pageContext(pathname);
  window.gtag!("set", { ...context, page_referrer: previousLocation ?? "" });
  previousLocation = context.page_location;
  return context;
}

function ensureLoaded(id: string, pathname: string): boolean {
  if (loadedId === id) return true;
  if (typeof window === "undefined" || typeof document === "undefined" || isAutomatedBrowser()) return false;
  if (isBlockedPath(pathname)) return false;
  setDisabled(id, pathname);
  installHistoryGuard(id);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // gtag.js reads the arguments object, not an array.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  applyPageContext(pathname);
  // Page views are sent by trackPageView so client-side navigation is counted once per page.
  window.gtag("config", id, { send_page_view: false, ...pageContext(pathname) });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
  loadedId = id;
  return true;
}

export function trackPageView(pathname: string, measurementId: string | null = analyticsMeasurementId()): boolean {
  if (!measurementId) return false;
  if (isBlockedPath(pathname)) {
    // Never loaded from these pages; if already loaded, GA is switched off and the URL masked.
    if (loadedId === measurementId) {
      setDisabled(measurementId, pathname);
      applyPageContext(pathname);
    }
    return false;
  }
  const firstLoad = loadedId !== measurementId;
  if (!ensureLoaded(measurementId, pathname)) return false;
  setDisabled(measurementId, pathname);
  const context = firstLoad ? pageContext(pathname) : applyPageContext(pathname);
  window.gtag!("event", "page_view", context);
  return true;
}

/** Test hook. */
export function resetAnalyticsForTests(): void {
  if (loadedId) delete (window as unknown as Record<string, unknown>)[`ga-disable-${loadedId}`];
  loadedId = null;
  previousLocation = null;
  delete window.gtag;
  delete window.dataLayer;
}
