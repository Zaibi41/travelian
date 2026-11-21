// Sitemap entries and XML, kept free of Node APIs so it can be unit tested (src/lib/sitemap.test.ts).
import { isPublicPathVisible } from "../src/lib/public-services";

export interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export interface SitemapOptions {
  baseUrl: string;
  /** D39: Umrah is hidden; listed again when built with SITEMAP_UMRAH=true (the sitemap is a static file). */
  umrah: boolean;
  /** YYYY-MM-DD */
  lastmod: string;
}

// travelian#127: /blog and /deals are left out while they have no content (no blog endpoint in the gateway yet,
// no offers). Add them back here when they show real content.
export function sitemapEntries({ umrah }: Pick<SitemapOptions, "umrah">): SitemapEntry[] {
  const entries: SitemapEntry[] = [
    { path: "/", changefreq: "daily", priority: "1.0" },
    { path: "/flights-search", changefreq: "daily", priority: "0.9" },
    { path: "/group-ticketing", changefreq: "daily", priority: "0.9" },
    { path: "/hotels-search", changefreq: "daily", priority: "0.9" },
    ...(umrah ? [{ path: "/umrah-packages", changefreq: "weekly" as const, priority: "0.8" }] : []),
    { path: "/about", changefreq: "monthly", priority: "0.5" },
    { path: "/contact", changefreq: "monthly", priority: "0.5" },
    { path: "/careers", changefreq: "monthly", priority: "0.4" },
    { path: "/faq", changefreq: "monthly", priority: "0.4" },
    { path: "/privacy", changefreq: "yearly", priority: "0.3" },
    { path: "/terms", changefreq: "yearly", priority: "0.3" },
  ];
  return entries.filter((entry) => isPublicPathVisible(entry.path));
}

export function buildSitemap({ baseUrl, umrah, lastmod }: SitemapOptions): { xml: string; count: number } {
  const base = baseUrl.replace(/\/+$/, "");
  const items = sitemapEntries({ umrah });
  const urls = items.map(e => [
    `  <url>`,
    `    <loc>${base}${e.path}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
    e.priority ? `    <priority>${e.priority}</priority>` : null,
    `  </url>`,
  ].filter(Boolean).join("\n"));
  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
  return { xml, count: items.length };
}
