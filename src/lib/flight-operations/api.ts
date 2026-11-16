// Flight Operations lists from travelian-api-gateway (/v1/admin/flight-operations/...), with the user's token.

import { gatewayGet, type GatewayOptions } from "@/lib/gateway/client";
import type { components } from "@/lib/gateway/schema";

export type GroupDepartures = components["schemas"]["GroupDeparturesWithoutFinalPnr"];
export type GroupDeparture = components["schemas"]["GroupDeparture"];

/** Paid group bookings without a final PNR departing within 48 hours, soonest first (the gateway decides the list). */
export const fetchGroupDeparturesWithoutFinalPnr = (options?: GatewayOptions) =>
  gatewayGet("/v1/admin/flight-operations/group-departures-without-final-pnr", undefined, options);
