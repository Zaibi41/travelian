import type { Severity } from "./types";

/** Needs-action and risk cards: 0 is fine (green); otherwise the card's own severity. */
export function severityForCount(count: number, whenPositive: Exclude<Severity, "fine">): Severity {
  return count > 0 ? whenPositive : "fine";
}

/** Text label paired with every status color. */
export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  action: "Needs action",
  fine: "Fine",
};
