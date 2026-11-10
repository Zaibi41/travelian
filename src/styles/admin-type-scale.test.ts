/// <reference types="node" />
// Guard: the admin uses one type scale (src/styles/theme.css, tailwind fontSize: page-title, kpi,
// kpi-sm, section, nav, body, table, label, helper). No arbitrary pixel sizes, inline font sizes
// or Tailwind's default size classes in the admin source; nothing below 12px in the scale.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

// theme.css read from disk (Vitest turns CSS imports into empty stylesheets, even with ?raw).
const themeCss = readFileSync(`${process.cwd()}/src/styles/theme.css`, "utf8");

// Raw source of every admin file (Vite reads them at test time).
const sources = {
  ...import.meta.glob("/src/components/admin/**/*.{ts,tsx}", { query: "?raw", import: "default", eager: true }),
  ...import.meta.glob([
    "/src/components/AdminLayout.tsx", "/src/components/AdminSidebar.tsx", "/src/components/AdminProfileDialog.tsx",
    "/src/pages/DashboardPage.tsx", "/src/pages/AccessDeniedPage.tsx", "/src/pages/AdminSearchPage.tsx", "/src/pages/InternalSearchPage.tsx",
    "/src/pages/AdminBookingsPage.tsx", "/src/pages/AdminBookingDetailPage.tsx", "/src/pages/HoldFlightPage.tsx", "/src/pages/HoldResultPage.tsx",
    "/src/pages/CustomersTravelersPage.tsx", "/src/pages/SavedPersonPage.tsx",
  ], { query: "?raw", import: "default", eager: true }),
} as Record<string, string>;
const files = Object.keys(sources).filter(file => !/\.test\./.test(file)).sort();

const RULES: [string, RegExp][] = [
  ["arbitrary font size (text-[Npx])", /\btext-\[\d[^\]]*\]/],
  ["inline font size", /\bfontSize\b|font-size\s*:/],
  ["Tailwind default size instead of the admin scale", /(^|[\s"'`:])text-(xs|sm|base|lg|xl|[2-9]xl)(?=[\s"'`]|$)/],
];

describe("admin type scale", () => {
  it("covers the admin files", () => {
    expect(files.length).toBeGreaterThan(30);
  });

  it.each(files)("%s uses only the shared scale", file => {
    const problems = sources[file].split("\n").flatMap((line, index) =>
      RULES.filter(([, pattern]) => pattern.test(line)).map(([rule]) => `${file}:${index + 1} ${rule}`));
    expect(problems).toEqual([]);
  });

  it("the scale: nothing below 12px; body 14px; labels and tables 13px; headings from the public site", () => {
    const css = themeCss;
    const size = (token: string) => Number(css.match(new RegExp(`--text-${token}:\\s*(\\d+)px`))?.[1]);
    expect({ body: size("body"), label: size("label"), table: size("table"), helper: size("helper"), section: size("section"), title: size("page-title"), kpi: size("kpi") })
      .toEqual({ body: 14, label: 13, table: 13, helper: 12, section: 18, title: 24, kpi: 24 });
    const all = [...css.matchAll(/--text-[a-z-]+:\s*(\d+(?:\.\d+)?)px/g)].map(match => Number(match[1]));
    expect(Math.min(...all)).toBeGreaterThanOrEqual(12);
  });
});

describe("cn keeps every scale size next to a text colour", () => {
  it.each(["page-title", "kpi", "kpi-sm", "section", "nav", "body", "table", "label", "helper"])("text-%s", async size => {
    const { cn } = await import("@/lib/utils");
    expect(cn(`text-${size}`, "text-status-action-text")).toContain(`text-${size}`);
  });
});
