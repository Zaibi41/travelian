// Search > Flights booking flow (mockups flights-fare-check, flights-hold-form, flights-hold-result).
// Every price, total and message here comes from the gateway; the page never computes money.

import { GatewayError } from "@/lib/gateway/client";
import type { components } from "@/lib/gateway/schema";
import type { FareView, FlightSearch, FlightView, JourneyView, RepriceView } from "./flights";

export const HOLD_PATH = "/admin/search/flights/hold";
export const HOLD_RESULT_PATH = "/admin/search/flights/hold/result";

/** request: a restricted airline (D32): sent to Travelian's team as a request to book, never a supplier hold. */
export type HoldMode = "hold" | "book" | "request";

export interface HoldPick {
  journey: JourneyView;
  flight: FlightView;
  fare: FareView;
}

/** What the fare check hands to the booking page (router state; nothing personal). */
export interface HoldDraft {
  mode: HoldMode;
  searchId: string;
  request: FlightSearch;
  picks: HoldPick[];
  quote: RepriceView;
  /** When the gateway confirmed the fare (the reprice answer arrived), ISO time. */
  confirmedAt: string;
  /** The user clicked "Continue at new price" for this quote. */
  acceptPriceChange: boolean;
}

/** Fare-check states that need a dialog. "Price unchanged" has none: the booking page opens. */
export type FareCheckState =
  | { kind: "checking" }
  | { kind: "changed"; quote: RepriceView }
  | { kind: "gone" | "unconfirmed" | "adults_only"; message: string };

/** Which dialog a reprice refusal shows, from the gateway's code (its message is shown as given). */
export function fareCheckFailure(error: unknown): FareCheckState {
  const message = error instanceof GatewayError ? error.message : "The fare couldn't be checked. Try again in a moment.";
  const code = error instanceof GatewayError ? error.code : undefined;
  if (code === "fare_gone" || code === "search_expired") return { kind: "gone", message };
  if (code === "adults_only") return { kind: "adults_only", message };
  // 503: the gateway or a service behind it (e.g. sign-in verification) is unavailable; say so plainly, with its reason.
  if (error instanceof GatewayError && error.status === 503) {
    return { kind: "unconfirmed", message: `Fare check unavailable, try again.${error.message ? ` ${error.message}` : ""}` };
  }
  return { kind: "unconfirmed", message };
}

export const travelerCount = (quote: RepriceView) => quote.passengers.reduce((total, passenger) => total + passenger.count, 0);

export type HoldRequest = components["schemas"]["HoldRequest"];
export type HoldView = components["schemas"]["HoldView"];
