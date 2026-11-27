// Pricing & Revenue > Flight Pricing & Rules: the flight suppliers and the Rs-per-passenger rules on their fares.
// Stored and applied by the gateway (Super Admin only; it refuses everyone else); this file only fetches and sends.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { gatewayDelete, gatewayGet, gatewayPost, gatewayPut } from "@/lib/gateway/client";
import type { components } from "@/lib/gateway/schema";
import { CARRIER_CODE_TO_AIRLINE } from "@/lib/airline-normalization";
import logoManifest from "../../public/airline-logos/index.json";

export type FlightSupplier = components["schemas"]["FlightSupplier"];
export type FlightPricingRule = components["schemas"]["FlightPricingRule"];
export type FlightPricingRuleInput = components["schemas"]["FlightPricingRuleInput"];

const KEY = ["flight-pricing"] as const;
const unavailableMessage = "Flight pricing rules can't be reached right now. Try again in a minute.";

export function useFlightSuppliers() {
  return useQuery({
    queryKey: [...KEY, "suppliers"],
    queryFn: ({ signal }) => gatewayGet("/v1/admin/flight-pricing/suppliers", undefined, { signal, unavailableMessage }),
    retry: 1,
  });
}

export function useFlightPricingRules() {
  return useQuery({
    queryKey: [...KEY, "rules"],
    queryFn: ({ signal }) => gatewayGet("/v1/admin/flight-pricing/rules", undefined, { signal, unavailableMessage }),
    retry: 1,
  });
}

export function useFlightPricingActions() {
  const queryClient = useQueryClient();
  const refresh = () => void queryClient.invalidateQueries({ queryKey: [...KEY, "rules"] });
  const saveMessage = "The rule couldn't be saved right now. Nothing was changed.";
  const create = useMutation({
    mutationFn: (body: FlightPricingRuleInput) => gatewayPost("/v1/admin/flight-pricing/rules", body, { unavailableMessage: saveMessage }),
    onSuccess: refresh,
  });
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: FlightPricingRuleInput }) =>
      gatewayPut("/v1/admin/flight-pricing/rules/{rule_id}", body, { pathParams: { rule_id: id }, unavailableMessage: saveMessage }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) => gatewayDelete("/v1/admin/flight-pricing/rules/{rule_id}", { pathParams: { rule_id: id }, unavailableMessage: saveMessage }),
    onSuccess: refresh,
  });
  return { create, update, remove };
}

/** "-Rs 100" / "+Rs 500" from paisa. */
export function ruleAmountText(amountMinor: number) {
  const rupees = Math.abs(amountMinor) / 100;
  return `${amountMinor < 0 ? "-" : "+"}Rs ${rupees.toLocaleString("en-PK")}`;
}

const titleCase = (text: string) => text.replace(/\b[a-z]/g, letter => letter.toUpperCase());

/** Every airline we know by code (the logo list's names), "PK" -> "PIA", sorted by name. */
export const AIRLINE_OPTIONS: { code: string; name: string }[] = (() => {
  const names = new Map<string, string>();
  for (const [name, code] of Object.entries(logoManifest.codes as Record<string, string>)) {
    const upper = code.toUpperCase();
    if (name.toLowerCase() === upper.toLowerCase()) continue;
    const current = names.get(upper);
    if (!current || name.length > current.length) names.set(upper, name);
  }
  for (const [code, name] of Object.entries(CARRIER_CODE_TO_AIRLINE)) names.set(code.toUpperCase(), name);
  return [...names.entries()]
    .map(([code, name]) => ({ code, name: CARRIER_CODE_TO_AIRLINE[code] ?? titleCase(name) }))
    .sort((a, b) => a.name.localeCompare(b.name));
})();

export function airlineName(code?: string | null) {
  if (!code) return "Any airline";
  return AIRLINE_OPTIONS.find(option => option.code === code)?.name ?? code;
}
