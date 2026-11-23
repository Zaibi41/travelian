import { describe, expect, it } from "vitest";
import { MAX_RESULTS, POPULAR_AIRPORT_CODES, buildIndex, isCommercialAirport, normalize, popularAirports, rankAirports, searchAirports, type Airport } from "./airports";

const a = (iata: string, city: string, name: string, country: string, type = "large"): Airport => ({ iata, city, name, country, countryCode: "XX", type });
const LIST = [
  a("KAR", "Kamarang", "Kamarang Airport", "Guyana", "small"),
  a("KHI", "Karachi", "Jinnah International Airport", "Pakistan"),
  a("LHE", "Lahore", "Allama Iqbal International Airport", "Pakistan"),
  a("LHR", "London", "Heathrow Airport", "United Kingdom"),
  a("GRU", "São Paulo", "Guarulhos International Airport", "Brazil"),
  a("KRL", "Korla", "Karachi Road Airfield", "China", "medium"),
  a("ZZK", "Smalltown", "Karachi Strip", "Nowhere", "small"),
  a("ZZM", "Midtown", "Karachi Field", "Nowhere", "medium"),
  a("PKX", "Beijing", "Daxing Airport", "China"),
];
const index = buildIndex(LIST);
const codes = (query: string) => searchAirports(index, query).map(airport => airport.iata);

describe("airport search", () => {
  it("ranks an exact code first for large and medium airports, not for small ones", () => {
    expect(codes("LHE")[0]).toBe("LHE");
    expect(codes("kar")[0]).toBe("KHI");                                 // KAR is small: after the Karachi city match
  });

  it("then city prefix, then IATA prefix, then airport name, then country", () => {
    expect(codes("kar")).toEqual(["KHI", "KAR", "KRL", "ZZM", "ZZK"]);   // city, small exact code, then names (larger first)
    expect(codes("lh")).toEqual(["LHE", "LHR", "GRU"]);                  // codes from 2 characters, then "Guarulhos"
    expect(codes("guarulhos")).toEqual(["GRU"]);
    expect(codes("chin")).toEqual(["PKX", "KRL"]);                        // country, larger airport first
  });

  it("ignores case, accents and extra spaces", () => {
    expect(normalize("  São   Paulo ")).toBe("sao paulo");
    expect(codes("SAO PAULO")).toEqual(["GRU"]);
    expect(codes("são  pau")).toEqual(["GRU"]);
    expect(codes("Lahore ")).toEqual(["LHE"]);
  });

  it("starts at 2 characters and returns at most 8", () => {
    expect(codes("k")).toEqual([]);
    const many = buildIndex(Array.from({ length: 20 }, (_, i) => a(`Q${String.fromCharCode(65 + i)}A`, `Quetta ${i}`, "Airport", "Pakistan")));
    expect(searchAirports(many, "quetta")).toHaveLength(MAX_RESULTS);
  });

  it("popular airports: in the set order, skipping codes not in the list", () => {
    expect(popularAirports(index).map(airport => airport.iata)).toEqual(["LHE", "KHI", "LHR"]);
  });

  it("the real list has every popular airport", async () => {
    const { loadAirports } = await import("./airports");
    expect(popularAirports(await loadAirports())).toHaveLength(POPULAR_AIRPORT_CODES.length);
  });

  it("returns nothing when nothing matches", () => {
    expect(codes("xyzzy")).toEqual([]);
  });

  it("the real list: Karachi, KHI, LHE, DXB and Islamabad first; Multan found", async () => {
    const real = buildIndex((await import("@/data/airports.json")).default as Airport[]);
    const top = (query: string) => searchAirports(real, query).map(x => x.iata);
    expect(top("kar")[0]).toBe("KHI");
    expect(top("khi")[0]).toBe("KHI");
    expect(top("lhe")[0]).toBe("LHE");
    expect(top("dxb")[0]).toBe("DXB");
    expect(top("isb")[0]).toBe("ISB");
    expect(top("mux")).toContain("MUX");
  });

  it("the real list keeps only the six fields and finds Lahore and Karachi", async () => {
    const real = (await import("@/data/airports.json")).default as Airport[];
    expect(Object.keys(real[0]).sort()).toEqual(["city", "country", "countryCode", "iata", "name", "type"]);
    const full = buildIndex(real);
    expect(searchAirports(full, "lhe")[0]).toMatchObject({ iata: "LHE", city: "Lahore" });
    expect(searchAirports(full, "kar").map(x => x.iata)).toContain("KHI");
  });

  // #157: one ranking for every From / To field: exact code, then the city's main airport, no military fields.
  it("the real list: the main airport of a city first, exact codes first, no military fields", async () => {
    const real = buildIndex((await import("@/data/airports.json")).default as Airport[]);
    const top = (query: string) => searchAirports(real, query).map(x => x.iata);
    expect(top("dubai")[0]).toBe("DXB");
    expect(top("dubai")).toContain("DWC");
    // "dub" is also Dublin's exact code (exact codes come first); among the Dubai airports DXB leads.
    expect(top("dub").slice(0, 2)).toEqual(["DUB", "DXB"]);
    expect(top("dub").indexOf("DXB")).toBeLessThan(top("dub").indexOf("DWC"));
    expect(top("lah")[0]).toBe("LHE");
    expect(top("lah").slice(1)).toEqual(expect.arrayContaining(["LAH"]));
    expect(top("lahore")[0]).toBe("LHE");
    expect(top("london")[0]).toBe("LHR");
    expect(top("jeddah")[0]).toBe("JED");
    expect(top("ist")[0]).toBe("IST");
    expect(top("isla")[0]).toBe("ISB");
    expect(top("karachi")[0]).toBe("KHI");
    for (const query of ["dubai", "dub", "nhd", "al minhad", "ramstein", "lakenheath"]) {
      expect(top(query)).not.toContain("NHD");
      expect(top(query)).not.toContain("RMS");
      expect(top(query)).not.toContain("LKZ");
    }
    // A military code chosen before still resolves (e.g. a saved search), it just isn't offered.
    expect(real.byCode.get("NHD")?.city).toBe("Dubai");
  });

  it("military and non-commercial fields are recognised by name; joint-use airports stay", () => {
    const named = (name: string) => isCommercialAirport({ name });
    expect(named("Al Minhad Air Base")).toBe(false);
    expect(named("Ramstein Air Base")).toBe(false);
    expect(named("RAF Lakenheath")).toBe(false);
    expect(named("Wiesbaden Army Airfield")).toBe(false);
    expect(named("Naval Air Station Key West/Boca Chica Field")).toBe(false);
    expect(named("Dubai International Airport")).toBe(true);
    expect(named("Baghdad International Airport / New Al Muthana Air Base")).toBe(true);
    expect(named("Dover Civil Air Terminal/Dover Air Force Base")).toBe(true);
    expect(named("Allama Iqbal International Airport")).toBe(true);
  });

  it("ranks a short list the same way from one letter (the website's popular airports before the list loads)", () => {
    const short = [a("DWC", "Dubai(Jebel Ali)", "Al Maktoum International Airport", "UAE"), a("DXB", "Dubai", "Dubai International Airport", "UAE"),
      a("NHD", "Dubai", "Al Minhad Air Base", "UAE", "medium"), a("DOH", "Doha", "Hamad International Airport", "Qatar")];
    expect(rankAirports(short, "d").map(x => x.iata)).toEqual(["DXB", "DOH", "DWC"]);
    expect(rankAirports(short, "dubai").map(x => x.iata)).toEqual(["DXB", "DWC"]);
    expect(rankAirports(short, "")).toEqual([]);
  });
});
