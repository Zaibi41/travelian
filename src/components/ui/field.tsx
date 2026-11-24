import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";


/**
 * Form fields for the public site and the admin (issue 118), with the public site's field look: 40px (44px on touch), rounded-md, 1px input
 * border, white fill, 14px text, muted placeholder, 2px focus ring with 2px offset. Labels sit
 * above (13px medium, muted); hints and errors below (12px / 13px). docs/design-system.md.
 */
export const FIELD_CONTROL = "flex h-control w-full min-w-0 rounded-md border border-input bg-background px-3 text-body ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, type, ...props }, ref) => (
  <input ref={ref} type={type} className={cn(FIELD_CONTROL, "py-2 file:border-0 file:bg-transparent file:text-body file:font-medium", className)} {...props} />
));
Input.displayName = "FieldInput";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(FIELD_CONTROL, "h-auto min-h-20 py-2", className)} {...props} />
));
Textarea.displayName = "FieldTextarea";

/** Field label on the 13px label scale (13px medium). */
export const Label = React.forwardRef<React.ElementRef<typeof LabelPrimitive.Root>, React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn("text-label font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)} {...props} />
));
Label.displayName = "FieldLabelText";

export function FieldLabel({ htmlFor, id, children, className }: { htmlFor?: string; id?: string; children: React.ReactNode; className?: string }) {
  const classes = cn("text-label font-medium text-muted-foreground", className);
  return htmlFor ? <label htmlFor={htmlFor} id={id} className={classes}>{children}</label> : <span id={id} className={classes}>{children}</span>;
}

/**
 * Label above, the control (optionally with a leading icon), then the hint or the error.
 * The control should point at `${id}-hint` / `${id}-error` with aria-describedby (see `describedBy`).
 */
export function FieldShell({ id, label, icon, hint, error, children, className }: {
  id: string; label: React.ReactNode; icon?: React.ReactNode; hint?: React.ReactNode; error?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {icon ? (
        <div className="relative min-w-0">
          <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
          <div className="[&_input]:pl-9">{children}</div>
        </div>
      ) : children}
      {error ? <p id={`${id}-error`} role="alert" className="text-label text-destructive">{error}</p>
        : hint ? <p id={`${id}-hint`} className="text-helper text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Layout pieces: a white form card and a responsive row of fields. */
export function FormCard({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-border bg-card shadow-card", className)} {...props}>{children}</div>;
}

export function FormRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))]", className)}>{children}</div>;
}
