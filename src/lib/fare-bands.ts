// Fare calendar colours (#55), shared by the website's and the admin's fare calendars. Display classification only:
// the prices themselves come from the gateway and are never changed here.
//   Low  = within 10% of the cheapest (price <= cheapest x 1.10)
//   High = 25% or more above the cheapest (price >= cheapest x 1.25)
//   Avg  = in between
// When every price is within 5% of the others (max <= min x 1.05) the dates are all one band, "low": they are all
// about as cheap as the cheapest, so marking some of them Avg or High would suggest a difference that isn't there.

export type FareBand = "low" | "avg" | "high";

export interface FareBands {
  /** Band per key (date), for each price given. */
  bands: Map<string, FareBand>;
  /** The cheapest price given (minor units), or null when there are none. */
  cheapest: number | null;
  /** All prices within 5% of each other: one band only. */
  uniform: boolean;
}

/** prices: [key, amount in minor units]. Integer maths (x100) so 10% / 25% / 5% borders are exact. */
export function classifyFares(prices: ReadonlyArray<readonly [string, number]>): FareBands {
  if (!prices.length) return { bands: new Map(), cheapest: null, uniform: false };
  const amounts = prices.map(([, amount]) => amount);
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  const uniform = max * 100 <= min * 105;
  const band = (amount: number): FareBand =>
    uniform || amount * 100 <= min * 110 ? "low" : amount * 100 >= min * 125 ? "high" : "avg";
  return { bands: new Map(prices.map(([key, amount]) => [key, band(amount)])), cheapest: min, uniform };
}

/** 1,850,000 paisa -> "Rs 18,500" (PKR is shown as "Rs"; another currency keeps its code). */
export function formatFare(amountMinor: number, currency = "PKR"): string {
  const label = currency === "PKR" ? "Rs" : currency;
  return `${label} ${Math.round(amountMinor / 100).toLocaleString("en-PK")}`;
}
