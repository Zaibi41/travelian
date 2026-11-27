// Gateway-shaped data for the Flights hold flow tests (no real people or documents).
import type { HoldDraft } from "@/lib/admin-search/hold";

export const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });

// What the fare check hands over for staff without supplier permissions: no supplier fields.
export const STAFF_DRAFT: HoldDraft = {
  mode: "hold", searchId: "s1", confirmedAt: "2026-11-19T10:05:00", acceptPriceChange: false,
  request: { trip: "oneway", from: "LHE", to: "KHI", date: "2026-11-19", moreLegs: [], adults: 1, children: 0, infants: 1 },
  picks: [{
    journey: { direction: "outbound", origin: "LHE", destination: "KHI", flights: [] },
    flight: { id: "f1", airline_code: "Z8", airline_name: "South Air", flight_number: "Z8266", departure_local: "2026-11-19T00:25",
      arrival_local: "2026-11-19T02:35", duration_minutes: 130, stops: 0, stop_cities: [], segments: [], fares: [] },
    fare: { id: "x1", name: "EB", baggage: "No checked baggage", selling_price: rs(13_597), booking_mode: "hold" },
  }],
  quote: {
    quote_id: "q1", expires_at: new Date(Date.now() + 9 * 60_000).toISOString(), selling_total: rs(15_316), new_total: rs(15_316),
    passengers: [{ type: "ADT", count: 1, selling_each: rs(13_597) }, { type: "INF", count: 1, selling_each: rs(1_719) }],
    price_changed: false, booking_enabled: true, booking_mode: "hold", new_price_per_adult: rs(13_597),
  },
};

// The same for a role the gateway sends supplier fields to.
export const ADMIN_DRAFT: HoldDraft = {
  ...STAFF_DRAFT,
  picks: [{ ...STAFF_DRAFT.picks[0], fare: { ...STAFF_DRAFT.picks[0].fare, supplier: "southair", supplier_cost: rs(13_330) } }],
  quote: { ...STAFF_DRAFT.quote, supplier_total: rs(15_015), margin: rs(301) },
};

