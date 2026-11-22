import { useEffect, useState, type ReactNode } from "react";
import { ChevronRight, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export interface CheckoutAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

const TYPING = "input:not([type=checkbox]):not([type=radio]):not([type=button]), textarea, select, [contenteditable=true]";

/**
 * #156: on phones (< 768px) checkout keeps the total and the step's main button in a bar fixed to the bottom of the
 * screen. Tapping the total opens the fare summary as a sheet. The bar steps aside while the keyboard is up (a text
 * field has focus) so it never covers what is being typed, and the page gets bottom room so the footer isn't hidden.
 */
export function CheckoutActionBar({ total, travelers, action, summary }: {
  total: string;
  travelers: string;
  action: CheckoutAction;
  summary: ReactNode;
}) {
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const update = () => {
      const active = document.activeElement;
      setTyping(Boolean(active && active instanceof HTMLElement && active.matches(TYPING)));
    };
    // Focus moves out, then in: read the focused element once the move is over.
    const later = () => window.setTimeout(update, 0);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", later);
    return () => {
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", later);
    };
  }, []);

  useEffect(() => {
    document.body.classList.add("has-checkout-action-bar");
    return () => document.body.classList.remove("has-checkout-action-bar");
  }, []);

  return (
    <>
      <div
        role="region"
        aria-label="Checkout total and next step"
        data-testid="checkout-action-bar"
        className={`fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 px-4 pt-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/90 md:hidden ${typing ? "hidden" : ""}`}
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <button
            type="button"
            onClick={() => setSummaryOpen(true)}
            aria-haspopup="dialog"
            aria-label={`Total ${total}, ${travelers}. Show fare summary`}
            className="flex min-h-11 min-w-[5.5rem] flex-1 flex-col items-start justify-center rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              Total <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="max-w-full truncate text-base font-black tabular-nums text-primary">{total}</span>
            <span className="max-w-full truncate text-xs text-muted-foreground">{travelers}</span>
          </button>
          <Button
            onClick={action.onClick}
            disabled={action.disabled}
            className="gradient-primary h-11 min-w-0 shrink rounded-xl px-4 text-primary-foreground"
          >
            <span className="truncate">{action.label}</span>{action.label.length <= 12 && <ChevronRight className="ml-1 h-4 w-4 shrink-0" aria-hidden="true" />}
          </Button>
        </div>
      </div>
      <Sheet open={summaryOpen} onOpenChange={setSummaryOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl p-4 pb-6 md:hidden">
          <SheetHeader className="h-6 pr-10 text-left">
            <SheetTitle className="sr-only">Fare summary</SheetTitle>
            <SheetDescription className="sr-only">Your flight and the total for all travelers.</SheetDescription>
          </SheetHeader>
          <div className="mt-3">{summary}</div>
          <Button variant="outline" className="mt-4 h-11 w-full rounded-xl" onClick={() => setSummaryOpen(false)}>Close</Button>
        </SheetContent>
      </Sheet>
    </>
  );
}
