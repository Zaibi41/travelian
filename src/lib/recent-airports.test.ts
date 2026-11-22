import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_RECENT_AIRPORTS, readRecentAirports, rememberRecentAirport } from "@/lib/recent-airports";

// "Recent searches" in the phone airport picker (#148).
describe("recent airports", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("keeps the newest first, once each, at most five", () => {
    for (const code of ["KHI", "LHE", "ISB", "DXB", "JED", "MUX"]) rememberRecentAirport("public", { code, city: code, name: `${code} Airport` });
    rememberRecentAirport("public", { code: "ISB", city: "Islamabad", name: "Islamabad International Airport", country: "PK" });
    const list = readRecentAirports("public");
    expect(list).toHaveLength(MAX_RECENT_AIRPORTS);
    expect(list.map(item => item.code)).toEqual(["ISB", "MUX", "JED", "DXB", "LHE"]);
    expect(list[0]).toEqual({ code: "ISB", city: "Islamabad", name: "Islamabad International Airport", country: "PK" });
  });

  it("keeps the website and the admin lists apart", () => {
    rememberRecentAirport("public", { code: "KHI", city: "Karachi", name: "Jinnah International Airport" });
    expect(readRecentAirports("admin")).toEqual([]);
  });

  it("ignores broken or foreign data", () => {
    window.localStorage.setItem("travelian.recentAirports.public.v1", "not json");
    expect(readRecentAirports("public")).toEqual([]);
    window.localStorage.setItem("travelian.recentAirports.public.v1", JSON.stringify([{ code: "lhe", city: "x", name: "y" }, { code: "KHI" }, null, { code: "DXB", city: "Dubai", name: "Dubai International" }]));
    expect(readRecentAirports("public").map(item => item.code)).toEqual(["DXB"]);
  });

  it("works without storage (private mode or blocked)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(() => rememberRecentAirport("public", { code: "KHI", city: "Karachi", name: "Jinnah International Airport" })).not.toThrow();
    expect(readRecentAirports("public")).toEqual([]);
  });
});
