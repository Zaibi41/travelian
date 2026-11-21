import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PRERENDERED_PAGE_PRELOADS } from "./prerendered-pages";

describe("prerendered page preloads", () => {
  it("cover every prerendered route except the home page", () => {
    const script = readFileSync("scripts/prerender.mjs", "utf8");
    const routes = [...script.match(/PRERENDER_ROUTES = \[([^\]]*)\]/)![1].matchAll(/"([^"]+)"/g)].map(m => m[1]);
    expect(routes.length).toBeGreaterThan(1);
    expect(Object.keys(PRERENDERED_PAGE_PRELOADS).sort()).toEqual(routes.filter(r => r !== "/").sort());
  });
});
