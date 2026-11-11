import * as React from "react";
import { DialogContent as BaseDialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Admin dialogs: the shared Radix dialog (centred, focus trapped, Escape and overlay close, X
// always visible, page scroll locked) with the public site's card look (rounded-xl) and the
// modal rule from AGENTS.md: never taller than 85% of the viewport, scrolling inside.
export { Dialog, DialogTrigger, DialogClose, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const ADMIN_DIALOG = "flex max-h-[85vh] w-[calc(100%-2rem)] flex-col gap-3 overflow-y-auto rounded-xl sm:rounded-xl";

export const DialogContent = React.forwardRef<React.ElementRef<typeof BaseDialogContent>, React.ComponentPropsWithoutRef<typeof BaseDialogContent>>(
  ({ className, ...props }, ref) => <BaseDialogContent ref={ref} className={cn(ADMIN_DIALOG, className)} {...props} />,
);
DialogContent.displayName = "AdminDialogContent";
