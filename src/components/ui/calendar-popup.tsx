import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./dialog";

const CalendarPopup = Dialog;
const CalendarPopupTrigger = DialogTrigger;

function CalendarPopupContent({ title, children }: { title: string; children: ReactNode }) {
  return (
    <DialogContent showCloseButton={false} aria-describedby={undefined} overlayClassName="z-[1120]" className="z-[1130] flex max-h-[90dvh] w-fit max-w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden rounded-xl bg-card p-0 sm:max-w-[calc(100vw-2rem)]">
      <DialogHeader className="shrink-0 flex-row items-center justify-between gap-3 space-y-0 border-b border-border px-4 py-2 text-left">
        <DialogTitle className="min-w-0">{title}</DialogTitle>
        <DialogClose aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm ring-1 ring-border transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <X className="h-4 w-4" aria-hidden="true" />
        </DialogClose>
      </DialogHeader>
      <div className="min-h-0 overflow-y-auto">{children}</div>
    </DialogContent>
  );
}

export { CalendarPopup, CalendarPopupTrigger, CalendarPopupContent };
