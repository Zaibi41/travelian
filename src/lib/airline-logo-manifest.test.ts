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

  it("#164 / #97 / #136: British Airways, SriLankan and Centrum Air by code and name; AirSial uses its square mark", () => {
    const logos = manifest.logos as Record<string, string>;
    const codes = manifest.codes as Record<string, string>;
    expect([logos.ba, logos["british airways"]]).toEqual(["/airline-logos/british-airways.png", "/airline-logos/british-airways.png"]);
    expect([logos.ul, logos["srilankan airlines"]]).toEqual(["/airline-logos/srilankan-airlines.png", "/airline-logos/srilankan-airlines.png"]);
    expect([logos.c6, logos["centrum air"]]).toEqual(["/airline-logos/centrum-air.png", "/airline-logos/centrum-air.png"]);
    expect([codes["british airways"], codes["srilankan airlines"], codes["centrum air"]]).toEqual(["BA", "UL", "C6"]);
    for (const key of ["pf", "airsial", "air sial"]) expect(logos[key]).toBe("/airline-logos/airsial-mark.png");
  });

  it("#171 / #172: Uzbekistan Airways and Azerbaijan Airlines by code and name", () => {
    const logos = manifest.logos as Record<string, string>;
    const codes = manifest.codes as Record<string, string>;
    for (const key of ["hy", "uzbekistan airways", "uzbekistan"]) expect(logos[key]).toBe("/airline-logos/uzbekistan-airways.png");
    for (const key of ["j2", "azerbaijan airlines", "azerbaijan", "azal"]) expect(logos[key]).toBe("/airline-logos/azerbaijan-airlines.png");
    expect([codes["uzbekistan airways"], codes["azerbaijan airlines"]]).toEqual(["HY", "J2"]);
  });

  it("#216: SATA (Azores Airlines S4, SATA Air Açores SP) by code and name", () => {
    const logos = manifest.logos as Record<string, string>;
    const codes = manifest.codes as Record<string, string>;
    for (const key of ["s4", "sp", "sata", "sata international", "azores airlines", "sata air açores"]) expect(logos[key]).toBe("/airline-logos/sata.png");
    expect([codes["sata international"], codes["azores airlines"], codes["sata air acores"]]).toEqual(["S4", "S4", "SP"]);
  });

  it("#216: EVA Air (BR) and Japan Airlines (JL) by code and name", () => {
    const logos = manifest.logos as Record<string, string>;
    const codes = manifest.codes as Record<string, string>;
    for (const key of ["br", "eva air", "eva airways"]) expect(logos[key]).toBe("/airline-logos/eva-air.png");
    for (const key of ["jl", "japan airlines", "jal"]) expect(logos[key]).toBe("/airline-logos/japan-airlines.png");
    expect([codes["eva air"], codes["japan airlines"], codes.jal]).toEqual(["BR", "JL", "JL"]);
  });

  it("#216: LOT Polish Airlines (LO) by code and name", () => {
    const logos = manifest.logos as Record<string, string>;
    for (const key of ["lo", "lot", "lot polish airlines"]) expect(logos[key]).toBe("/airline-logos/lot-polish-airlines.png");
    expect((manifest.codes as Record<string, string>)["lot polish airlines"]).toBe("LO");
  });

  it("#216: Avianca (AV) by code and name", () => {
    for (const key of ["av", "avianca"]) expect((manifest.logos as Record<string, string>)[key]).toBe("/airline-logos/avianca.png");
    expect((manifest.codes as Record<string, string>).avianca).toBe("AV");
  });
});
