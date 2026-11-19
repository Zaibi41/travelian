// Generates public/sitemap.xml before dev and build.
import { writeFileSync } from "fs";
import { resolve } from "path";
import { isPublicPathVisible } from "../src/lib/public-services";

const BASE_URL = "https://travelian.pk";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const entries: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/hotels-search", changefreq: "daily", priority: "0.9" },
  { path: "/flights-search", changefreq: "daily", priority: "0.9" },
  // D39: Umrah is hidden; listed again when built with SITEMAP_UMRAH=true (the sitemap is a static file).
  ...(process.env.SITEMAP_UMRAH === "true" ? [{ path: "/umrah-packages", changefreq: "weekly" as const, priority: "0.8" }] : []),
  { path: "/deals", changefreq: "daily", priority: "0.8" },
  { path: "/blog-public", changefreq: "weekly", priority: "0.6" },
  { path: "/about", changefreq: "monthly", priority: "0.5" },
  { path: "/contact", changefreq: "monthly", priority: "0.5" },
  { path: "/careers", changefreq: "monthly", priority: "0.4" },
  { path: "/faq", changefreq: "monthly", priority: "0.4" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/signin", changefreq: "monthly", priority: "0.3" },
  { path: "/register", changefreq: "monthly", priority: "0.3" },
];

function generateSitemap(items: SitemapEntry[]) {
  const urls = items.map(e => [
    `  <url>`,
    `    <loc>${BASE_URL}${e.path}</loc>`,
    e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
    e.priority ? `    <priority>${e.priority}</priority>` : null,
    `  </url>`,
  ].filter(Boolean).join("\n"));
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

const visibleEntries = entries.filter((entry) => isPublicPathVisible(entry.path));
writeFileSync(resolve("public/sitemap.xml"), generateSitemap(visibleEntries));
console.log(`sitemap.xml written (${visibleEntries.length} entries)`);
