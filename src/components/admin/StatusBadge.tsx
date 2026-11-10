import { cn } from "@/lib/utils";
import { SEVERITY_LABEL } from "@/lib/admin-dashboard/severity";
import type { Severity } from "@/lib/admin-dashboard/types";

const TONE: Record<Severity, string> = {
  critical: "bg-status-critical-soft text-status-critical-text",
  action: "bg-status-action-soft text-status-action-text",
  fine: "bg-status-fine-soft text-status-fine-text",
};

/** Status pill. Color is never the only signal: the text names the status. */
export function StatusBadge({ severity, children, className }: { severity: Severity; children?: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex h-badge max-w-full items-center whitespace-nowrap rounded-pill px-2 text-helper font-medium", TONE[severity], className)}>
      <span className="truncate">{children ?? SEVERITY_LABEL[severity]}</span>
    </span>
  );
}
