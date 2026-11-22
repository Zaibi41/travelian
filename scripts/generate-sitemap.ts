// Generates public/sitemap.xml before dev and build. Entries and XML: scripts/sitemap.ts.
import { writeFileSync } from "fs";
import { resolve } from "path";
import { SITE_URL } from "../src/lib/site-config";
import { buildSitemap } from "./sitemap";

const { xml, count } = buildSitemap({
  // VITE_SITE_URL from the shell when set (this runs in Node, outside Vite), else the app's default.
  baseUrl: process.env.VITE_SITE_URL?.trim() || SITE_URL,
  umrah: process.env.SITEMAP_UMRAH === "true",
  lastmod: new Date().toISOString().slice(0, 10),
});
writeFileSync(resolve("public/sitemap.xml"), xml);
console.log(`sitemap.xml written (${count} entries)`);
