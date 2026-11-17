import { Check, Clock } from "lucide-react";
import { useCountdown } from "@/components/admin/search/FlightsSearch";
import { countdownLabel } from "@/lib/admin-search/group-holds";
import { cn } from "@/lib/utils";

const STEPS = ["Search results", "Traveler details", "Hold seats", "Payment and tickets"] as const;

/** The 4 steps of the Group Ticketing booking flow (mockup pages 10-13). `current` is 1-based. */
export function GroupBookingSteps({ current }: { current: 2 | 3 | 4 }) {
  return (
    <ol aria-label="Booking steps" className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
      {STEPS.map((label, index) => {
        const number = index + 1;
        const done = number < current;
        const active = number === current;
        return (
          <li key={label} aria-current={active ? "step" : undefined} className="flex min-w-0 items-center gap-3">
            {index > 0 && <span aria-hidden="true" className="hidden h-px w-8 bg-border sm:block" />}
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-helper font-semibold",
                done && "bg-teal text-teal-foreground", active && "bg-brand-navy text-primary-foreground", !done && !active && "border border-border bg-card text-muted-foreground",
              )}>
                {done ? <Check className="h-3.5 w-3.5" /> : number}
              </span>
              <span className={cn("whitespace-nowrap text-label", active ? "font-semibold text-brand-navy" : "text-foreground")}>
                {label}<span className="sr-only">{done ? " (done)" : active ? " (current step)" : ""}</span>
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Amber "Hold expires, 28:14 left" (red "Hold expired" once over). The time limit comes from the gateway. */
/** `note`: the gateway's hold_time_note ("Hold time from supplier" / "Hold time estimated (45 min default)"), sent only
 *  to viewers with supplier access; shown under the countdown. */
export function HoldCountdown({ expiresAt, expired, note }: { expiresAt?: string | null; expired?: boolean; note?: string | null }) {
  const countdown = useCountdown(expiresAt ?? undefined);
  const over = expired || (countdown !== null && countdown.seconds === 0);
  if (!expiresAt && !expired) return null;
  const badge = (
    <span role="timer" aria-live="off" className={cn(
      "inline-flex h-badge max-w-full items-center gap-1.5 whitespace-nowrap rounded-pill px-badge-x text-helper font-semibold",
      over ? "bg-status-critical-soft text-status-critical-text" : "bg-status-action-soft text-status-action-text",
    )}>
      <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {over ? "Hold expired" : `Hold expires, ${countdownLabel(countdown?.seconds ?? 0)} left`}
    </span>
  );
  if (!note) return badge;
  return (
    <span className="inline-flex min-w-0 max-w-full flex-col items-start gap-1 sm:items-end">
      {badge}
      <span className="max-w-full truncate text-label text-muted-foreground" title={note}>{note}</span>
    </span>
  );
}

/** True once the gateway's time limit has passed (ticks every second while a countdown is shown). */
export function useHoldOver(expiresAt?: string | null) {
  const countdown = useCountdown(expiresAt ?? undefined);
  return countdown !== null && countdown.seconds === 0;
}
