/// <reference types="node" />
// Guard: the admin design system (docs/design-system.md). Admin files use the admin tokens
// (src/styles/tokens.css) only: one type scale (tailwind fontSize: page-title, kpi, kpi-sm,
// section, nav, body, table, label, helper), no arbitrary pixel sizes, inline font sizes or
// Tailwind's default size classes, no hard-coded colours (hex, rgb/hsl, Tailwind palette colours)
// and no arbitrary radii. Nothing below 12px in the scale; the admin colours stay as they are.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

// Token files read from disk (Vitest turns CSS imports into empty stylesheets, even with ?raw).
const tokensCss = readFileSync(`${process.cwd()}/src/styles/tokens.css`, "utf8");
// The admin's colour block in the shared token file (the public values are in :root above it).
const adminCss = tokensCss.slice(tokensCss.search(/^:root\[data-app-theme="admin"\]/m));
const themeCss = readFileSync(`${process.cwd()}/src/styles/theme.css`, "utf8");

// Raw source of every admin file (Vite reads them at test time).
const sources = {
  ...import.meta.glob("/src/components/admin/**/*.{ts,tsx}", { query: "?raw", import: "default", eager: true }),
  ...import.meta.glob([
    "/src/components/AdminLayout.tsx", "/src/components/AdminSidebar.tsx", "/src/components/AdminProfileDialog.tsx",
    "/src/pages/DashboardPage.tsx", "/src/pages/AccessDeniedPage.tsx", "/src/pages/AdminSearchPage.tsx", "/src/pages/InternalSearchPage.tsx",
    "/src/pages/AdminBookingsPage.tsx", "/src/pages/AdminBookingDetailPage.tsx", "/src/pages/HoldFlightPage.tsx", "/src/pages/HoldResultPage.tsx",
    "/src/pages/CustomersTravelersPage.tsx", "/src/pages/SavedPersonPage.tsx",
    // Older admin pages (moved to the admin components and the type scale on 11 November 2026).
    "/src/pages/AgenciesPage.tsx", "/src/pages/PackagesPage.tsx", "/src/pages/UsersPage.tsx", "/src/pages/RBACPage.tsx",
    "/src/pages/HotelsPage.tsx", "/src/pages/FlightsPage.tsx", "/src/pages/FlightOperationsPage.tsx",
    "/src/pages/WalletPage.tsx", "/src/pages/PaymentsPage.tsx", "/src/pages/CouponsPage.tsx", "/src/pages/BlogPage.tsx",
    "/src/pages/NotificationsPage.tsx", "/src/pages/SettingsPage.tsx", "/src/pages/ProviderSystemsPage.tsx",
    "/src/pages/GroupTicketingCollectionsPage.tsx", "/src/pages/ReportsPage.tsx", "/src/pages/CustomerPortalPage.tsx",
    "/src/pages/RoadmapPlaceholderPage.tsx", "/src/pages/AdminBookingsRoutes.tsx", "/src/components/AdminHotelSearchPanel.tsx",
  ], { query: "?raw", import: "default", eager: true }),
} as Record<string, string>;
const files = Object.keys(sources).filter(file => !/\.test\./.test(file)).sort();

const RULES: [string, RegExp][] = [
  ["arbitrary font size (text-[Npx])", /\btext-\[\d[^\]]*\]/],
  ["inline font size", /\bfontSize\b|font-size\s*:/],
  ["Tailwind default size instead of the admin scale", /(^|[\s"'`:])text-(xs|sm|base|lg|xl|[2-9]xl)(?=[\s"'`]|$)/],
  ["hard-coded hex colour (use a colour token)", /#[0-9a-fA-F]{3,8}\b(?![\w-])/],
  ["hard-coded rgb/hsl colour (use a colour token)", /\b(rgb|hsl)a?\(\s*\d/],
  ["Tailwind palette colour (use a colour token)", /\b(bg|text|border|ring|fill|stroke|from|via|to|outline|divide|decoration|accent|caret)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/],
  ["import from the public site (copy the look into src/components/admin/ui instead)", /from\s+["']@\/(components|pages)\/public\//],
  ["arbitrary radius (use a radius token)", /\brounded(-[a-z]{1,2})?-\[[^\]]+\]|border-?[Rr]adius/],
];

// Known exception (docs/roadmap.md): the legacy agency-role search on /admin/search renders the
// public site's whole search form. Every other admin file must not import from public folders.
const PUBLIC_IMPORT_EXCEPTIONS = new Set(["/src/pages/AdminSearchPage.tsx", "/src/components/AdminHotelSearchPanel.tsx"]);

// Known exception (docs/design-system.md, "Colours"): Tailwind palette colours in older pages. They
// are kept exactly as they are because the admin's colours are not changed without Zohaib's
// decision; moving them to the status tokens would shift their shade. Listed by file and exact
// class list, so any new palette colour still fails.
const PALETTE_EXCEPTIONS: Record<string, string[]> = {
  "/src/pages/WalletPage.tsx": ["text-amber-600"],
  "/src/pages/ProviderSystemsPage.tsx": ["border-blue-200 bg-blue-50 text-blue-700", "text-blue-600"],
};
const PALETTE_RULE = "Tailwind palette colour (use a colour token)";
const allowedPalette = (file: string, line: string) => (PALETTE_EXCEPTIONS[file] ?? []).some(classes => line.includes(classes));
const rulesFor = (file: string) => RULES.filter(([rule]) => !(PUBLIC_IMPORT_EXCEPTIONS.has(file) && rule.startsWith("import from the public site")));

describe("admin type scale", () => {
  it("covers the admin files", () => {
    expect(files.length).toBeGreaterThan(30);
  });

  it.each(files)("%s uses only the shared scale", file => {
    const problems = sources[file].split("\n").flatMap((line, index) =>
      rulesFor(file).filter(([rule, pattern]) => pattern.test(line) && !(rule === PALETTE_RULE && allowedPalette(file, line))).map(([rule]) => `${file}:${index + 1} ${rule}`));
    expect(problems).toEqual([]);
  });

  it("the scale: nothing below 12px; body 14px; labels and tables 13px; headings from the public site", () => {
    const css = tokensCss;
    const size = (token: string) => Number(css.match(new RegExp(`--text-${token}:\\s*(\\d+)px`))?.[1]);
    expect({ body: size("body"), label: size("label"), table: size("table"), helper: size("helper"), section: size("section"), title: size("page-title"), kpi: size("kpi") })
      .toEqual({ body: 14, label: 13, table: 13, helper: 12, section: 18, title: 24, kpi: 24 });
    const all = [...css.matchAll(/--text-[a-z-]+:\s*(\d+(?:\.\d+)?)px/g)].map(match => Number(match[1]));
    expect(Math.min(...all)).toBeGreaterThanOrEqual(12);
  });
});

// Admin colours are not unified with the public site (Zohaib, 2026-11-11; confirmed 2026-11-21 when
// the tokens became one file). A change here must be a deliberate decision, not a side effect.
describe("admin colours stay as they are", () => {
  const value = (token: string) => adminCss.match(new RegExp(`--${token}:\\s*([^;]+);`))?.[1].trim();

  it("primary action buttons stay the current admin teal", () => {
    expect(value("brand-teal")).toBe("184.8 98.4% 24.9%");
    expect(value("action-primary")).toBe("var(--brand-teal)");
    expect(value("action-primary-foreground")).toBe("0 0% 100%");
    expect(value("teal")).toBe("var(--brand-teal)");
  });

  // Borders and the amber stripe changed on purpose (Part 4, TV-readable contrast, approved 20 Nov 2026).
  it("navy, surfaces, borders and status colours are the approved values", () => {
    expect({
      navy: value("brand-navy"), primary: value("primary"), sidebar: value("sidebar-background"), background: value("background"),
      foreground: value("foreground"), border: value("border"), muted: value("muted-foreground"), ring: value("ring"),
      critical: value("status-critical-text"), criticalSoft: value("status-critical-soft"), action: value("status-action-text"),
      actionSoft: value("status-action-soft"), fine: value("status-fine-text"), fineSoft: value("status-fine-soft"),
      stripe: value("status-action"), input: value("input"),
    }).toEqual({
      navy: "216.8 100% 18.2%", primary: "var(--brand-navy)", sidebar: "var(--brand-navy)", background: "217 33% 97%",
      foreground: "222 47% 11%", border: "218 22% 86%", muted: "217 12% 42%", ring: "var(--brand-navy)",
      critical: "0 72% 42%", criticalSoft: "0 86% 96%", action: "38 90% 28%", actionSoft: "38 92% 92%", fine: "152 60% 28%", fineSoft: "152 50% 93%",
      stripe: "37 97% 39%", input: "219 13% 60%",
    });
  });

  it("one token file: shared :root, admin colours in their own block; the layout layer holds no colour", () => {
    expect(tokensCss).toMatch(/^:root\s*\{/m);
    expect(adminCss).toMatch(/^:root\[data-app-theme="admin"\]\s*\{/);
    // The admin block holds colours only: type, sizes, radii, spacing and motion are shared.
    expect(adminCss).not.toMatch(/--(text|control|radius|space|focus|motion)-/);
    expect(themeCss).not.toContain("@import");
    expect(themeCss.replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/\d+(\.\d+)?%|#[0-9a-f]{3,8}\b|hsl\(/i);
  });
});

describe("cn keeps every scale size next to a text colour", () => {
  it.each(["page-title", "kpi", "kpi-sm", "section", "nav", "body", "table", "label", "helper"])("text-%s", async size => {
    const { cn } = await import("@/lib/utils");
    expect(cn(`text-${size}`, "text-status-action-text")).toContain(`text-${size}`);
  });
});
