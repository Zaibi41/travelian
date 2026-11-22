import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildSitemap, sitemapEntries } from "../../scripts/sitemap";

const locs = (xml: string) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);

describe("sitemap (travelian#127)", () => {
  it("leaves out /blog and /deals while they have no content", () => {
    const paths = sitemapEntries({ umrah: false }).map(e => e.path);
    expect(paths).not.toContain("/blog");
    expect(paths).not.toContain("/deals");
    expect(paths).toEqual(["/", "/flights-search", "/group-ticketing", "/hotels-search", "/about", "/contact", "/careers", "/faq", "/privacy", "/terms"]);
  });

  it("lists Umrah only when switched on, still without /blog and /deals", () => {
    const paths = sitemapEntries({ umrah: true }).map(e => e.path);
    expect(paths).toContain("/umrah-packages");
    expect(paths.filter(p => p === "/blog" || p === "/deals")).toEqual([]);
  });

  it("builds valid entries on the given site URL", () => {
    const { xml, count } = buildSitemap({ baseUrl: "https://travelian.pk/", umrah: false, lastmod: "2026-11-22" });
    expect(count).toBe(10);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')).toBe(true);
    expect(locs(xml)).toHaveLength(10);
    expect(locs(xml)[0]).toBe("https://travelian.pk/");
    expect(locs(xml).every(loc => loc.startsWith("https://travelian.pk/") && !loc.includes("//", 8))).toBe(true);
    expect(xml.match(/<lastmod>2026-11-22<\/lastmod>/g)).toHaveLength(10);
  });

  it("the committed public/sitemap.xml has no /blog or /deals", () => {
    const committed = locs(readFileSync("public/sitemap.xml", "utf8")).map(loc => new URL(loc).pathname);
    expect(committed).not.toContain("/blog");
    expect(committed).not.toContain("/deals");
    expect(committed).toEqual(sitemapEntries({ umrah: false }).map(e => e.path));
  });
});
