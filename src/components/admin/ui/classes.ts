// Class builders and helpers shared by the admin components (kept apart from the component files
// so React fast refresh works). docs/design-system.md.
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Admin button: the public site's button shape (rounded-md, 40px, 14px medium text, 16px icons,
 * 2px focus ring with 2px offset) in the admin's colours (docs/design-system.md).
 *
 * Variants
 *   primary   filled teal: the main action on a screen (Hold, Continue, View booking).
 *   default   filled navy: kept for the buttons that are navy today (Save, Add Customer).
 *             Colours are not unified yet (see the report / docs); do not recolour.
 *   secondary soft grey; outline bordered; ghost text only; danger filled red; link.
 * Sizes: default 40px (44px on touch), sm 36px, lg 48px (search form), icon 40px square.
 */
export const adminButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-body font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-action text-action-foreground hover:bg-action/90",
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-control px-4",
        sm: "h-9 px-3",
        lg: "h-control-lg rounded-field px-6 font-semibold",
        icon: "h-control w-control",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

/** Choice chip (Suggested routes, quick filters): public chip shape, pressed state filled navy. */
export const chipClass = (pressed: boolean) => cn(
  "inline-flex min-h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-md border px-2.5 py-1 text-helper font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
  pressed ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted/30 text-muted-foreground hover:border-primary/30 hover:bg-muted hover:text-primary",
);

/** Dense admin table: 13px text, 28px header on the muted background, 30px rows. */
export const TABLE = {
  wrap: "overflow-x-auto rounded-xl border border-border bg-card shadow-card",
  table: "w-full border-collapse text-table",
  headRow: "bg-muted text-left",
  th: "h-table-header whitespace-nowrap px-2.5 font-semibold text-foreground",
  row: "border-t border-border",
  td: "h-table-row px-2.5 py-1.5 align-middle",
} as const;

/** aria-describedby for a control inside FieldShell. */
export const describedBy = (id: string, { hint, error }: { hint?: unknown; error?: unknown }) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

