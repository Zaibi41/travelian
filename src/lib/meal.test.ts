import { describe, expect, it } from "vitest";
import { mealStatus, mealText } from "./meal";

describe("meal text (#154, #198)", () => {
  it("missing or unclear data shows 'No Meal' (#198)", () => {
    for (const value of [undefined, null, "", "  ", "null", "undefined", "N/A", "-", "Subject to supplier rules", "Meal info not available"]) {
      expect(mealText(value)).toBe("No Meal");
      expect(mealStatus(value)).toBe("unknown");
    }
  });

  it("'No Meal' when the fare says so", () => {
    for (const value of ["No", "No Meal", "no meals", "Nil", "Not included", "Meal not included", "Chargeable", false]) expect(mealText(value)).toBe("No Meal");
  });

  it("'Meal' when the fare says one is served", () => {
    for (const value of ["Yes", "Meal included", "Snacks", "Hot meal", "Complimentary meal", true]) expect(mealText(value)).toBe("Meal");
  });
});
