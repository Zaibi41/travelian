import { lazyPage } from "@/lib/lazy-page";

export const ContactPage = lazyPage(() => import("./ContactPage"));
export const AboutPage = lazyPage(() => import("./AboutPage"));
export const DealsPage = lazyPage(() => import("./DealsPage"));
export const FaqPage = lazyPage(() => import("./FaqPage"));
export const PrivacyPage = lazyPage(() => import("./PrivacyPage"));
export const TermsPage = lazyPage(() => import("./TermsPage"));
export const CareersPage = lazyPage(() => import("./CareersPage"));
export const GroupTicketingPage = lazyPage(() => import("./GroupTicketingPage"));

// One entry per page in PRERENDER_ROUTES (scripts/prerender.mjs) except "/", whose page is in the
// main bundle. src/main.tsx loads the page's code before starting React, so the saved page is
// replaced by the same page and never by the "Loading page…" line.
export const PRERENDERED_PAGE_PRELOADS: Record<string, () => Promise<unknown>> = {
  "/group-ticketing": GroupTicketingPage.preload,
  "/about": AboutPage.preload,
  "/contact": ContactPage.preload,
  "/faq": FaqPage.preload,
  "/careers": CareersPage.preload,
  "/privacy": PrivacyPage.preload,
  "/terms": TermsPage.preload,
};
