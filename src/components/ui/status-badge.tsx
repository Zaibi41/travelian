import { cn } from "@/lib/utils";
import { SEVERITY_LABEL } from "@/lib/admin-dashboard/severity";
import type { Severity } from "@/lib/admin-dashboard/types";

/**
 * Badges and tags with the public site's badge shape: pill, 22px high, 10px sides, 12px semibold
 * text, 1px border. Admin colours (unchanged). A status colour is never the only signal: the
 * text always names the status.
 */
export const BADGE = "inline-flex h-badge max-w-full items-center whitespace-nowrap rounded-pill border px-badge-x text-helper font-semibold";

const TONE: Record<Severity, string> = {
  critical: "border-transparent bg-status-critical-soft text-status-critical-text",
  action: "border-transparent bg-status-action-soft text-status-action-text",
  fine: "border-transparent bg-status-fine-soft text-status-fine-text",
};

/** Status pill (critical, needs action, fine) with its text label. */
export function StatusBadge({ severity, children, className }: { severity: Severity; children?: React.ReactNode; className?: string }) {
  return (
    <span className={cn(BADGE, TONE[severity], className)}>
      <span className="truncate">{children ?? SEVERITY_LABEL[severity]}</span>
    </span>
  );
}

const TAG_TONE = {
  neutral: "border-border bg-muted text-foreground",
  navy: "border-brand-navy/20 bg-accent text-brand-navy",
  teal: "border-teal/20 bg-teal-soft text-teal",
} as const;

/** Neutral label (Sample data, a status that is not a severity, a count). */
export function Tag({ tone = "neutral", title, children, className }: { tone?: keyof typeof TAG_TONE; title?: string; children: React.ReactNode; className?: string }) {
  return <span title={title} className={cn(BADGE, TAG_TONE[tone], className)}><span className="truncate">{children}</span></span>;
}
