// Safe pricing wording used across all Travelian service pages.
// Never render "Rs 0" or an unconfirmed fixed price.

export const PRICING_DISCLAIMER =
  "Final price will be confirmed after checking availability, supplier update, travel date, customer profile and selected services.";

function amount(value: number) {
  return Math.round(value).toLocaleString("en-US");
}

export function isPriced(value?: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/** "Starting from PKR 285,000" or "On Request" */
export function startingFrom(value?: number | null, currency: "PKR" | "SAR" | "EUR" | "USD" = "PKR") {
  return isPriced(value) ? `Starting from ${currency} ${amount(value)}` : "On Request";
}

/** "PKR 285,000" or the given fallback */
export function priceOr(value?: number | null, currency: "PKR" | "SAR" | "EUR" | "USD" = "PKR", fallback = "On Request") {
  return isPriced(value) ? `${currency} ${amount(value)}` : fallback;
}

/** Compact value only: "285,000" or "On request" */
export function priceValue(value?: number | null, fallback = "On request") {
  return isPriced(value) ? amount(value) : fallback;
}

export function contactForPrice(value?: number | null, currency: "PKR" | "SAR" | "EUR" | "USD" = "PKR") {
  return isPriced(value) ? `Starting from ${currency} ${amount(value)}` : "Contact for updated price";
}
