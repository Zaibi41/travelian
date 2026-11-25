import type { ReactNode } from "react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { NotAvailableNotice } from "@/components/admin/bookings/NotAvailable";
import { formatMoney } from "@/lib/admin-bookings/format";
import type { BookingMoney } from "@/lib/admin-bookings/types";
import { GatewayError } from "@/lib/gateway/client";
import { cn } from "@/lib/utils";

/** A gateway amount, or "—" when there is none (never 0 for a figure that isn't known). */
export const moneyOrDash = (money?: BookingMoney | null) => (money ? formatMoney(money) : "—");

export const isForbidden = (error: unknown) => error instanceof GatewayError && error.kind === "forbidden";

/** The gateway refused this screen for the signed-in user (the permission lives there, not in the page). */
export function FinanceForbidden({ children }: { children?: ReactNode }) {
  return (
    <NotAvailableNotice title="Not available for your role">
      {children ?? "This screen needs the Finance permission (and cost and margin for supplier figures). A super admin can grant them."}
    </NotAvailableNotice>
  );
}

export function FinancePageHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <h1 className="text-page-title font-bold font-display">{title}</h1>
        <p className="max-w-[70ch] text-body text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

/** Right-hand side drawer: header (title, description and the close X) stays put; the body scrolls. Esc, X and the
 *  overlay close it. Full width on phones. */
export function SideDrawer({ open, onClose, title, description, children, footer, wide = false }: {
  open: boolean; onClose: () => void; title: ReactNode; description?: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean;
}) {
  return (
    <Sheet open={open} onOpenChange={next => { if (!next) onClose(); }}>
      <SheetContent side="right" className={cn("flex w-full flex-col gap-0 p-0 sm:max-w-xl", wide && "sm:max-w-3xl")}>
        <div className="border-b border-border px-card py-4 pr-12">
          <SheetTitle className="truncate font-display text-section">{title}</SheetTitle>
          {description && <SheetDescription className="mt-1 text-label">{description}</SheetDescription>}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-card py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-border px-card py-3">{footer}</div>}
      </SheetContent>
    </Sheet>
  );
}

/** A label and its value, for drawers and cards. */
export function Fact({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-label text-muted-foreground">{label}</dt>
      <dd className="break-words text-body font-medium tabular-nums">{children}</dd>
    </div>
  );
}
