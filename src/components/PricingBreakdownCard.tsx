import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateSellingPrice, type MarkupRule } from "@/lib/markup-engine";

export function PricingBreakdownCard({ rule, baseCost, discount = 0 }: { rule: Pick<MarkupRule, "percentage" | "fixedAmount" | "minimumMargin">; baseCost: number; discount?: number }) {
  const pricing = calculateSellingPrice(baseCost, rule, discount);

  return (
    <Card className="border-primary/10 bg-primary/5 shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-display">Margin Preview</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
        <Row label="Base cost" value={`Rs ${pricing.baseCost.toLocaleString()}`} />
        <Row label="Price adjustment" value={`Rs ${pricing.markupAmount.toLocaleString()}`} />
        <Row label="Discount" value={`Rs ${pricing.discountAmount.toLocaleString()}`} />
        <Row label="Final selling price" value={`Rs ${pricing.finalSellingPrice.toLocaleString()}`} strong />
        <Row label="Travelian profit" value={`Rs ${pricing.profit.toLocaleString()}`} strong />
        <Row label="Margin" value={`${pricing.marginPercent.toFixed(1)}%`} />
        {pricing.minimumMarginProtected && (
          <p className="sm:col-span-2 rounded-lg bg-warning/10 px-3 py-2 text-xs font-medium text-warning">
            Discount was capped to protect the minimum margin. Super Admin approval is required to go lower.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-card/70 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-bold text-primary" : "font-semibold text-foreground"}>{value}</span>
    </div>
  );
}
