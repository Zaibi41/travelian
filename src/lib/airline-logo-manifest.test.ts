import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "../../public/airline-logos/index.json";

// gateway#62: public/airline-logos/index.json is the one source for airline logos (website, admin and the gateway's PDF).
describe("airline logo manifest", () => {
  it("every logo it names exists under public/", () => {
    const missing = Object.values(manifest.logos).filter(path => !existsSync(resolve(__dirname, "../../public", path.replace(/^\//, ""))));
    expect(missing).toEqual([]);
  });

  it("keys are lower case and codes are IATA codes", () => {
    for (const key of [...Object.keys(manifest.codes), ...Object.keys(manifest.logos)]) expect(key).toBe(key.toLowerCase());
    for (const code of Object.values(manifest.codes)) expect(code).toMatch(/^[A-Z0-9]{2}$/);
  });

  it("the airlines named in gateway#62 have a logo by IATA code (the PDF looks them up by code)", () => {
    for (const code of ["pk", "pa", "9p", "ek", "qr", "tk", "wy", "gf", "z8"]) expect(manifest.logos[code as keyof typeof manifest.logos]).toBeTruthy();
  });
});
