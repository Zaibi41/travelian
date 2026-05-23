export type MarkupScope =
  | "global"
  | "service"
  | "supplier"
  | "airline"
  | "route"
  | "cabin"
  | "agency"
  | "b2c"
  | "seasonal"
  | "city"
  | "country";

export interface MarkupRule {
  id: string;
  name: string;
  service: "flights" | "hotels" | "umrah" | "tours" | "visas" | "all";
  scope: MarkupScope;
  target?: string;
  percentage: number;
  fixedAmount: number;
  minimumMargin: number;
  enabled: boolean;
}

export interface PricingBreakdown {
  baseCost: number;
  markupAmount: number;
  discountAmount: number;
  finalSellingPrice: number;
  profit: number;
  marginPercent: number;
  minimumMarginProtected: boolean;
}

export function calculateSellingPrice(baseCost: number, rule: Pick<MarkupRule, "percentage" | "fixedAmount" | "minimumMargin">, discountAmount = 0): PricingBreakdown {
  const percentageMarkup = baseCost * (Math.max(0, rule.percentage) / 100);
  const rawMarkup = percentageMarkup + Math.max(0, rule.fixedAmount);
  const minimumMarkup = Math.max(0, rule.minimumMargin);
  const markupAmount = Math.max(rawMarkup, minimumMarkup);
  const maxDiscount = Math.max(0, markupAmount - minimumMarkup);
  const protectedDiscount = Math.min(Math.max(0, discountAmount), maxDiscount);
  const finalSellingPrice = baseCost + markupAmount - protectedDiscount;
  const profit = finalSellingPrice - baseCost;

  return {
    baseCost,
    markupAmount,
    discountAmount: protectedDiscount,
    finalSellingPrice,
    profit,
    marginPercent: baseCost > 0 ? (profit / baseCost) * 100 : 0,
    minimumMarginProtected: discountAmount > protectedDiscount,
  };
}

export const defaultMarkupRules: MarkupRule[] = [];
