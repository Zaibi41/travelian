import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { SEVERITY_LABEL } from "@/lib/admin-dashboard/severity";
import type { Severity } from "@/lib/admin-dashboard/types";

const STRIPE: Record<Severity, string> = {
  critical: "border-l-status-critical",
  action: "border-l-status-action",
  fine: "border-l-status-fine",
};

const VALUE_TONE: Record<Severity, string> = {
  critical: "text-status-critical-text",
  action: "text-status-action-text",
  fine: "text-status-fine-text",
};

interface StatusKpiCardProps {
  label: string;
  value: string;
  /** Omit for neutral business cards. */
  severity?: Severity;
  hint?: string;
  /** Full value for screen readers and hover when `value` is abbreviated. */
  fullValue?: string;
  to?: string;
  size?: "default" | "sm";
  /** The card's filter is applied (shown with an outline and aria-current). */
  selected?: boolean;
  /** Show the severity tag ("Needs action"...). Off only where the mockup shows none and the value is itself the label. */
  showBadge?: boolean;
  /** The figure per product (e.g. Flights, Group), one line each under the value. */
  breakdown?: { label: string; value: string }[];
}

export function StatusKpiCard({ label, value, severity, hint, fullValue, to, size = "default", selected = false, showBadge = true, breakdown }: StatusKpiCardProps) {
  const body = (
    <div
      className={cn(
        "flex h-full min-w-0 flex-col gap-1 rounded-xl border border-border bg-card px-card py-3 shadow-card",
        severity && ["border-l-[length:var(--status-stripe)]", STRIPE[severity]],
        to && "transition-colors group-hover:border-brand-navy/30 group-hover:bg-accent/40",
        // An outline, not a ring: .shadow-card sets box-shadow and would hide a ring.
        selected && "outline outline-2 outline-offset-1 outline-brand-navy",
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <span className="min-w-0 text-label text-muted-foreground">{label}</span>
        {severity && showBadge && <StatusBadge severity={severity} className="shrink-0" />}
      </div>
      <span
        title={fullValue}
        className={cn(
          "break-words font-semibold tabular-nums",
          size === "sm" ? "text-kpi-sm" : "text-kpi",
          severity ? VALUE_TONE[severity] : "text-foreground",
        )}
      >
        {value}
      </span>
      {breakdown && breakdown.length > 0 && (
        <dl className="flex flex-col gap-0.5 text-label">
          {breakdown.map(line => (
            <div key={line.label} className="flex min-w-0 justify-between gap-2">
              <dt className="shrink-0 text-muted-foreground">{line.label}</dt>
              <dd className="min-w-0 break-words text-right font-medium tabular-nums text-foreground">{line.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {hint && <span className="text-label text-muted-foreground">{hint}</span>}
    </div>
  );

  const split = breakdown?.length ? ` (${breakdown.map(line => `${line.label} ${line.value}`).join(", ")})` : "";
  const accessibleName = `${label}: ${fullValue ?? value}${split}${severity ? `, ${SEVERITY_LABEL[severity]}` : ""}${hint ? `. ${hint}` : ""}`;
  return to ? (
    <Link to={to} aria-label={accessibleName} aria-current={selected ? "true" : undefined} className="group block min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
      {body}
    </Link>
  ) : (
    <div role="group" aria-label={accessibleName} className="min-w-0">{body}</div>
  );
}
