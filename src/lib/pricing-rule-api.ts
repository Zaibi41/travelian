import type { MarkupRule } from "@/lib/markup-engine";

const API_BASE_URL = (import.meta.env.VITE_TRAVELIAN_API_BASE_URL || "https://api.travelian.pk").replace(/\/$/, "");

export async function listPricingRules(service: MarkupRule["service"] = "flights"): Promise<MarkupRule[]> {
  const query = new URLSearchParams({ service });
  const response = await fetch(`${API_BASE_URL}/content/pricing-rules?${query.toString()}`);
  if (!response.ok) throw new Error("Unable to load pricing rules");
  const payload = await response.json();
  return Array.isArray(payload.items) ? payload.items.map(normalizePricingRule) : [];
}

export async function savePricingRule(rule: Omit<MarkupRule, "id"> & { id?: string }): Promise<MarkupRule> {
  const { id, ...pricingRule } = rule;
  const response = await fetch(`${API_BASE_URL}/content/pricing-rules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...pricingRule,
      ruleId: id || undefined,
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || "Unable to save pricing rule");
  return normalizePricingRule(payload.item);
}

export async function deletePricingRule(service: MarkupRule["service"], ruleId: string) {
  const response = await fetch(`${API_BASE_URL}/content/pricing-rules/${encodeURIComponent(service)}/${encodeURIComponent(ruleId)}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Unable to delete pricing rule");
}

export async function fetchEnabledFlightProviders(): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) return [];
  const payload = await response.json();
  return Array.isArray(payload.providers) ? payload.providers : [];
}

function normalizePricingRule(rule: Record<string, unknown>): MarkupRule {
  return {
    id: String(rule.id || rule.ruleId || ""),
    name: String(rule.name || "Pricing rule"),
    service: String(rule.service || "flights") as MarkupRule["service"],
    scope: String(rule.scope || "global") as MarkupRule["scope"],
    target: String(rule.target || ""),
    percentage: Number(rule.percentage || 0),
    fixedAmount: Number(rule.fixedAmount || 0),
    minimumMargin: Number(rule.minimumMargin || 0),
    enabled: rule.enabled !== false,
  };
}
