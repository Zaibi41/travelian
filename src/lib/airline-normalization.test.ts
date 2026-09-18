import { describe, expect, it } from "vitest";
import { normalizeAirlineName, isSameAirline } from "./airline-normalization";

describe("airline-normalization", () => {
  it("normalizes Air Sial and AirSial to the same canonical name", () => {
    expect(normalizeAirlineName("Air Sial")).toBe("AirSial");
    expect(normalizeAirlineName("AirSial")).toBe("AirSial");
    expect(normalizeAirlineName("air sial")).toBe("AirSial");
    expect(isSameAirline("Air Sial", "AirSial")).toBe(true);
  });

  it("normalizes Fly Jinnah and FlyJinnah", () => {
    expect(normalizeAirlineName("Fly Jinnah")).toBe("Fly Jinnah");
    expect(normalizeAirlineName("FlyJinnah")).toBe("Fly Jinnah");
    expect(isSameAirline("Fly Jinnah", "FlyJinnah")).toBe(true);
  });

  it("normalizes Fly Dubai and Flydubai", () => {
    expect(normalizeAirlineName("Fly Dubai")).toBe("Flydubai");
    expect(normalizeAirlineName("Flydubai")).toBe("Flydubai");
    expect(isSameAirline("Fly Dubai", "Flydubai")).toBe(true);
  });

  it("normalizes PIA and Pakistan International Airlines", () => {
    expect(normalizeAirlineName("PIA")).toBe("PIA");
    expect(normalizeAirlineName("Pakistan International Airlines")).toBe("PIA");
    expect(isSameAirline("PIA", "Pakistan International Airlines")).toBe(true);
  });

  it("falls back to original trimmed text for unknown airlines", () => {
    expect(normalizeAirlineName("Custom Charter Air")).toBe("Custom Charter Air");
  });
});
