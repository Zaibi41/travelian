import { describe, expect, it } from "vitest";
import { RETIRED_FINANCE_KEYS, clearRetiredFinanceData } from "./retired-finance-data";

describe("old fake Finance data (#73)", () => {
  it("is cleared from the browser; other keys stay", () => {
    for (const key of RETIRED_FINANCE_KEYS) localStorage.setItem(key, JSON.stringify([{ amount: 125000 }]));
    localStorage.setItem("travelian.session.v1", "keep");
    clearRetiredFinanceData();
    expect(RETIRED_FINANCE_KEYS.map(key => localStorage.getItem(key)).filter(value => value !== null)).toEqual([]);
    expect(RETIRED_FINANCE_KEYS).toContain("travelian.admin.announcements.v1");
    expect(localStorage.getItem("travelian.session.v1")).toBe("keep");
  });
});
