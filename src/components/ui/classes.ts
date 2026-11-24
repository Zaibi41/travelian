// Class builders and helpers shared by the public site and the admin (issue 118). Kept apart from
// the component files so React fast refresh works. docs/DESIGN_STANDARD.md, docs/design-system.md.
import { cn } from "@/lib/utils";

/** Choice chip (Suggested routes, quick filters): public chip shape, pressed state filled primary. */
export const chipClass = (pressed: boolean) => cn(
  "inline-flex min-h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-md border px-2.5 py-1 text-helper font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
  pressed ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted/30 text-muted-foreground hover:border-primary/30 hover:bg-muted hover:text-primary",
);

/** Dense table: 13px text, 28px header on the muted background, 30px rows. */
export const TABLE = {
  wrap: "overflow-x-auto rounded-xl border border-border bg-card shadow-card",
  table: "w-full border-collapse text-table",
  headRow: "bg-muted text-left",
  th: "h-table-header whitespace-nowrap px-2.5 font-semibold text-foreground",
  row: "border-t border-border",
  td: "h-table-row px-2.5 py-1.5 align-middle",
} as const;

/** aria-describedby for a control inside FieldShell (src/components/ui/field.tsx). */
export const describedBy = (id: string, { hint, error }: { hint?: unknown; error?: unknown }) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

/** Panel dialog: rounded-xl, never taller than 85% of the viewport, scrolling inside (AGENTS.md modal rule). */
export const DIALOG_PANEL = "flex max-h-[85vh] w-[calc(100%-2rem)] flex-col gap-3 overflow-y-auto rounded-xl sm:rounded-xl";
