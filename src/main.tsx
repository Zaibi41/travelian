import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { PRERENDERED_PAGE_PRELOADS } from "@/pages/public/prerendered-pages";

declare global {
  interface Window {
    /** Set by scripts/prerender.mjs only. */
    __TRAVELIAN_PRERENDER__?: boolean;
    __travelianRenderToString?: () => Promise<string>;
  }
}

const container = document.getElementById("root")!;
// A prerendered page (scripts/prerender.mjs) is already on screen. Load its code first, then let React
// reuse that HTML (hydrate) instead of drawing the page again. (On any other URL the page's guard
// script has already emptied #root, and the app renders from scratch.)
const path = window.location.pathname.replace(/\/+$/, "") || "/";
const prerendered = container.dataset.prerendered === path && container.hasChildNodes();
const preload = prerendered ? PRERENDERED_PAGE_PRELOADS[path] : undefined;

// The saved HTML is a signed-out visitor with the default currency and language. A visitor whose
// browser holds any of these sees a different navbar on the first render, so React draws the page
// afresh for them (as before) instead of hydrating HTML that cannot match.
const PERSONAL_KEYS = ["travelian.session.v1", "travelian.currency", "travelian.language"];
function matchesPrerenderedVisitor() {
  try {
    return PERSONAL_KEYS.every(key => localStorage.getItem(key) === null);
  } catch {
    return true; // No storage: the app reads the same defaults the page was saved with.
  }
}

// The prerender saves the app's first render as React's server renderer writes it, so hydration
// finds exactly what it expects (Suspense markers, text separators, useId values).
if (window.__TRAVELIAN_PRERENDER__) {
  window.__travelianRenderToString = async () => (await import("react-dom/server")).renderToString(<App />);
}

Promise.resolve(preload?.())
  .catch(() => undefined)
  .then(() => {
    if (prerendered && matchesPrerenderedVisitor()) hydrateRoot(container, <App />);
    else createRoot(container).render(<App />);
  });
