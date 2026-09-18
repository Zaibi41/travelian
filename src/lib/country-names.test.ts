import { describe, expect, it } from "vitest";
import { formatAirportSubtitle, getCountryName } from "./country-names";

describe("country-names", () => {
  it("resolves ISO country codes to full country names", () => {
    expect(getCountryName("IE")).toBe("Ireland");
    expect(getCountryName("ie")).toBe("Ireland");
    expect(getCountryName("US")).toBe("United States");
    expect(getCountryName("us")).toBe("United States");
    expect(getCountryName("PK")).toBe("Pakistan");
    expect(getCountryName("pk")).toBe("Pakistan");
    expect(getCountryName("AU")).toBe("Australia");
    expect(getCountryName("AE")).toBe("United Arab Emirates");
    expect(getCountryName("GB")).toBe("United Kingdom");
    expect(getCountryName("CA")).toBe("Canada");
  });

  it("handles empty or unknown country codes gracefully", () => {
    expect(getCountryName("")).toBe("");
    expect(getCountryName(null)).toBe("");
    expect(getCountryName(undefined)).toBe("");
    expect(getCountryName("XYZ")).toBe("XYZ");
  });

  it("formats airport subtitles with clean comma separator", () => {
    expect(formatAirportSubtitle("Dublin Airport", "IE")).toBe("Dublin Airport, Ireland");
    expect(formatAirportSubtitle("Allama Iqbal International Airport", "PK")).toBe("Allama Iqbal International Airport, Pakistan");
    expect(formatAirportSubtitle("W H 'Bud' Barron Airport", "US")).toBe("W H 'Bud' Barron Airport, United States");
    expect(formatAirportSubtitle("Dubbo City Regional Airport", "AU")).toBe("Dubbo City Regional Airport, Australia");
  });

  it("avoids duplicate country name if airport name already ends with country name", () => {
    expect(formatAirportSubtitle("Shannon Airport, Ireland", "IE")).toBe("Shannon Airport, Ireland");
  });

  it("handles missing airport name or country code", () => {
    expect(formatAirportSubtitle("", "PK")).toBe("Pakistan");
    expect(formatAirportSubtitle("Heathrow Airport", "")).toBe("Heathrow Airport");
  });
});
