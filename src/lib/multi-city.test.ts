import { describe, expect, it } from "vitest";
import { firstLegError, legErrors, nextLeg, remainingLegErrors, updateLeg, type Leg } from "./multi-city";

const d = (iso: string) => new Date(`${iso}T00:00:00`);
const today = d("2026-11-23");
const empty: Leg = { from: "", to: "", date: undefined };

describe("multi-city legs (#160)", () => {
  it("says what is missing on each leg and which field to fix first", () => {
    const errors = legErrors([empty, empty], today);
    expect(errors[0]).toEqual({ from: "Choose an origin", to: "Choose a destination", date: "Pick a date" });
    expect(firstLegError(errors)).toEqual([0, "from"]);
    const fine: Leg = { from: "LHE", to: "DXB", date: d("2026-12-08") };
    expect(firstLegError(legErrors([fine, { from: "DXB", to: "", date: undefined }], today))).toEqual([1, "to"]);
  });

  it("refuses the same airport twice, a past date and a date before the previous flight", () => {
    const errors = legErrors([
      { from: "LHE", to: "LHE", date: d("2026-11-20") },
      { from: "DXB", to: "JED", date: d("2026-12-08") },
      { from: "JED", to: "LHE", date: d("2026-12-01") },
    ], today);
    expect(errors[0]).toEqual({ to: "Choose a different destination", date: "Pick a date from today" });
    expect(errors[1]).toEqual({});
    expect(errors[2]).toEqual({ date: "Pick a date on or after Flight 2 (8 Dec)" });
    // The same day as the previous flight is fine.
    expect(legErrors([{ from: "LHE", to: "DXB", date: d("2026-12-08") }, { from: "DXB", to: "JED", date: d("2026-12-08") }], today)[1]).toEqual({});
  });

  it("a new leg starts where the last one lands, on its date", () => {
    expect(nextLeg([{ from: "LHE", to: "DXB", date: d("2026-12-08") }])).toEqual({ from: "DXB", to: "", date: d("2026-12-08") });
    expect(nextLeg([])).toEqual(empty);
  });

  it("choosing a destination fills the next leg's empty From; a typed one is kept", () => {
    const legs = updateLeg([empty, empty], 0, { to: "DXB" });
    expect(legs[1].from).toBe("DXB");
    // Changing Flight 1's destination moves the From it filled, but not one the user chose.
    expect(updateLeg(legs, 0, { to: "AUH" })[1].from).toBe("AUH");
    const chosen = updateLeg([{ ...empty, to: "DXB" }, { ...empty, from: "SHJ" }], 0, { to: "AUH" });
    expect(chosen[1].from).toBe("SHJ");
  });

  it("a later date on an earlier leg clears the later legs' dates that are now before it", () => {
    const legs: Leg[] = [{ from: "LHE", to: "DXB", date: d("2026-12-01") }, { from: "DXB", to: "JED", date: d("2026-12-05") }, { from: "JED", to: "LHE", date: d("2026-12-20") }];
    const moved = updateLeg(legs, 0, { date: d("2026-12-10") });
    expect(moved[1].date).toBeUndefined();
    expect(moved[2].date).toEqual(d("2026-12-20"));
  });

  it("after an edit only the messages still true stay (a pre-filled From clears its message)", () => {
    const shown = legErrors([empty, empty], today);
    const legs = updateLeg([empty, empty], 0, { to: "DXB" });
    const left = remainingLegErrors(shown, legs, today);
    expect(left[0]).toEqual({ from: "Choose an origin", date: "Pick a date" });
    expect(left[1]).toEqual({ to: "Choose a destination", date: "Pick a date" });
    expect(remainingLegErrors([], legs, today)).toEqual([]);
  });
});
