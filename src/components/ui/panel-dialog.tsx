import * as React from "react";
import { DialogContent } from "@/components/ui/dialog";
import { DIALOG_PANEL } from "@/components/ui/classes";
import { cn } from "@/lib/utils";

/**
 * Dialog content with the card look (rounded-xl) and the modal rule from AGENTS.md: centred, focus
 * trapped, Escape and overlay close, X always visible, page scroll locked, never taller than 85% of
 * the viewport and scrolling inside. Shared by the public site and the admin (issue 118).
 */
export const PanelDialogContent = React.forwardRef<React.ElementRef<typeof DialogContent>, React.ComponentPropsWithoutRef<typeof DialogContent>>(
  ({ className, ...props }, ref) => <DialogContent ref={ref} className={cn(DIALOG_PANEL, className)} {...props} />,
);
PanelDialogContent.displayName = "PanelDialogContent";
