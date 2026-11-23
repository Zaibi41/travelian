// What a fare says about meals (#154). Only an explicit "no meal" from the fare data is "No Meal"; missing, empty or
// unclear data is "Meal info not available" (CLAUDE.md Flight Listing Rule), never guessed either way.

export const MEAL_UNKNOWN = "Meal info not available";
export type MealStatus = "included" | "none" | "unknown";

const UNCLEAR = /^(null|undefined|n\/a|na|-|—|none given|not available|unknown|see supplier details|subject to supplier rules|meal info not available|tba|tbc)$/i;
const NO_MEAL = /^(no|none|nil|nill|0|false|no meal|no meals|meal not included|meals not included|not included|without meal|no food|chargeable|paid|buy on board)$|\bno meals?\b|\bnot included\b|\bnil\b|\bchargeable\b/i;

export function mealStatus(value: unknown): MealStatus {
  if (value === true) return "included";
  if (value === false) return "none";
  const text = String(value ?? "").trim();
  if (!text || UNCLEAR.test(text)) return "unknown";
  if (NO_MEAL.test(text)) return "none";
  return "included";
}

/** "Meal", "No Meal" or "Meal info not available". */
export function mealText(value: unknown): string {
  const status = mealStatus(value);
  return status === "included" ? "Meal" : status === "none" ? "No Meal" : MEAL_UNKNOWN;
}
