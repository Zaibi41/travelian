import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

export default function ReportsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold font-display">Reports</h1>
        <p className="text-sm text-muted-foreground">Sales, financial, agency and operational reports — unified hub.</p>
      </div>
      <EmptyState
        icon={BarChart3}
        title="Reports hub coming soon"
        description="The report builder (sales, wallet, agency, staff performance, API performance, refunds) is on the Sprint 4 roadmap. Until then, drill into the source modules directly."
      />
    </div>
  );
}
