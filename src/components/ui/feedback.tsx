import * as React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { chipClass } from "@/components/ui/classes";

/**
 * Notices, panels, chips, tables and empty / loading / error states with the public site's look
 * (rounded-xl white cards with the card shadow, 20px sides, 14px text, 16px icons), shared by the
 * public site and the admin (issue 118); colours come from the tokens. docs/design-system.md.
 */

const NOTICE_TONE = {
  info: { box: "border-border bg-card text-foreground shadow-card", icon: Info, iconClass: "text-muted-foreground" },
  critical: { box: "border-status-critical/40 bg-status-critical-soft text-status-critical-text", icon: AlertCircle, iconClass: "" },
  action: { box: "border-status-action/40 bg-status-action-soft text-status-action-text", icon: AlertTriangle, iconClass: "" },
  fine: { box: "border-status-fine/40 bg-status-fine-soft text-status-fine-text", icon: CheckCircle2, iconClass: "" },
} as const;

/** A notice with an icon, an optional bold title and text. Critical notices are alerts. */
export function Notice({ tone = "info", title, children, className, role }: {
  tone?: keyof typeof NOTICE_TONE; title?: React.ReactNode; children?: React.ReactNode; className?: string; role?: "alert" | "status";
}) {
  const { box, icon: Icon, iconClass } = NOTICE_TONE[tone];
  return (
    <div role={role ?? (tone === "critical" ? "alert" : "status")} className={cn("flex items-start gap-2.5 rounded-lg border px-card py-3 text-body", box, className)}>
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconClass)} aria-hidden="true" />
      <div className="flex min-w-0 flex-col gap-0.5">
        {title && <p className="font-semibold text-foreground">{title}</p>}
        {children && <div className={cn(title && tone === "info" && "text-muted-foreground")}>{children}</div>}
      </div>
    </div>
  );
}

/** White card: rounded-xl, border, card shadow. `padded` gives the 20px sides and 14px top/bottom. */
export function Panel({ children, className, padded = true, as: As = "div", ...props }: React.HTMLAttributes<HTMLElement> & { padded?: boolean; as?: "div" | "section" | "article" }) {
  return <As className={cn("min-w-0 rounded-xl border border-border bg-card shadow-card", padded && "px-card py-3.5", className)} {...props}>{children}</As>;
}

/** Panel title row: 18px section heading, optional action on the right. */
export function PanelHeader({ id, title, action, className }: { id?: string; title: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-2", className)}>
      <h2 id={id} className="text-section font-semibold text-foreground">{title}</h2>
      {action}
    </div>
  );
}

export const Chip = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { pressed?: boolean }>(
  ({ pressed = false, className, type = "button", ...props }, ref) => (
    <button ref={ref} type={type} aria-pressed={pressed} className={cn(chipClass(pressed), className)} {...props} />
  ),
);
Chip.displayName = "Chip";

/** Nothing to show: a short title and what to do next, centred in a panel. */
export function EmptyState({ title, children, action, className }: { title: React.ReactNode; children?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div role="status" className={cn("flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-border bg-card px-card py-8 text-center", className)}>
      <p className="text-body font-semibold text-foreground">{title}</p>
      {children && <p className="max-w-prose text-body text-muted-foreground">{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Loading placeholders in the shape of what is coming (cards or rows). */
export function LoadingCards({ count, label = "Loading", className, itemClassName = "h-20" }: { count: number; label?: string; className?: string; itemClassName?: string }) {
  return (
    <div className={cn("grid gap-card-gap", className)} aria-busy="true" aria-label={label}>
      {Array.from({ length: count }, (_, index) => <Skeleton key={index} className={cn("rounded-xl", itemClassName)} />)}
    </div>
  );
}
