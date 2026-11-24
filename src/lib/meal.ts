// What a fare says about meals (#154). A fare that says a meal is served is "Meal"; anything else, including missing,
// empty or unclear data, is shown as "No Meal" (#198).

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

/** "Meal" or "No Meal" (#198: missing or unclear meal data is "No Meal" too). */
export function mealText(value: unknown): string {
  const status = mealStatus(value);
  return status === "included" ? "Meal" : "No Meal";
}
