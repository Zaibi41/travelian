import { listPricingRules } from "./content.mjs";

export async function applyFlightPricingRules(offers) {
  let rules;
  try {
    rules = await listPricingRules({ service: "flights" });
  } catch (error) {
    console.error("flight-pricing-rules-unavailable", error);
    return offers;
  }
  const enabledRules = rules.filter(rule => rule.enabled !== false);
  if (!enabledRules.length) return offers;
  return offers.map(offer => applyRulesToOffer(offer, enabledRules));
}

function applyRulesToOffer(offer, rules) {
  const matchingRules = rules.filter(rule => ruleMatchesOffer(rule, offer));
  if (!matchingRules.length) return offer;
  const price = adjustPrice(offer.price, matchingRules);
  return {
    ...offer,
    fareOptions: Array.isArray(offer.fareOptions)
      ? offer.fareOptions.map(option => ({ ...option, price: adjustPrice(option.price, matchingRules) }))
      : offer.fareOptions,
    price,
    pricingRulesApplied: matchingRules.map(rule => ({
      ruleId: rule.ruleId,
      name: rule.name,
      scope: rule.scope,
    })),
  };
}

function ruleMatchesOffer(rule, offer) {
  const target = normalize(rule.target);
  if (rule.scope === "global" || rule.scope === "service" || rule.scope === "b2c") return true;
  if (rule.scope === "supplier") return normalize(offer.provider) === target;
  if (rule.scope === "airline") {
    return normalize(offer.airline) === target || normalize(String(offer.flightNumber || "").split(/[-\s/]/)[0]) === target;
  }
  if (rule.scope === "route") return normalize(`${offer.origin}-${offer.destination}`) === target;
  if (rule.scope === "cabin") return normalize(offer.cabin) === target;
  return false;
}

function adjustPrice(price, rules) {
  if (!price || !Number.isFinite(Number(price.total))) return price;
  const base = Number(price.total);
  const adjustment = rules.reduce((total, rule) => {
    const percentage = Number(rule.percentage || 0);
    const fixedAmount = Number(rule.fixedAmount || 0);
    return total + (base * percentage / 100) + fixedAmount;
  }, 0);
  const minimumMargin = rules.reduce((total, rule) => total + Math.max(0, Number(rule.minimumMargin || 0)), 0);
  const protectedAdjustment = minimumMargin > 0 ? Math.max(adjustment, minimumMargin) : adjustment;
  const total = Math.max(0, Math.round((base + protectedAdjustment) * 100) / 100);
  return {
    ...price,
    base,
    total,
    pricingAdjustment: Math.round(protectedAdjustment * 100) / 100,
  };
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}
