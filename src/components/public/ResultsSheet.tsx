import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A phone sheet for the flight results (#150): from the bottom, above the navbar and the WhatsApp float, with a
 *  44px close button, a scrolling body and a footer that stays visible. Closes on Escape and outside tap. */
export function ResultsSheet({ open, onOpenChange, title, description, full = false, footer, children }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Read by screen readers only. */
  description: string;
  /** Full height (Filters); otherwise as tall as its content (Sort). */
  full?: boolean;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[1100] bg-black/60 data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none" />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-[1100] flex flex-col rounded-t-2xl border-t bg-background text-foreground shadow-lg outline-none",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom motion-reduce:animate-none",
            full ? "h-[100dvh] rounded-t-none" : "max-h-[85dvh]",
          )}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b py-1 pl-4 pr-1">
            <DialogPrimitive.Title className="font-display text-base font-bold">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">{description}</DialogPrimitive.Description>
            <DialogPrimitive.Close className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <X className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
          {footer && <div className="shrink-0 border-t bg-card px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
