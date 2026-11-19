import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import { dateToIso, formatPickedDate, isoToDate } from "@/lib/date-iso";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { buttonVariants } from "@/components/ui/button";

// The one date picker for forms on the public site and in the admin (date of birth, passport expiry, travel and
// transfer dates, coupon and package dates). Click (or Enter / Space) opens a calendar with month and year lists for a
// quick jump; arrow keys move between days, Enter picks, Escape closes. Nothing is typed, so no date is misread.
// The value is ISO yyyy-MM-dd (what forms keep and send); it is shown day first ("24 Nov 2026") everywhere.
// Search bars keep their own range calendars (approved layouts).

const toDate = isoToDate;
const toIso = dateToIso;

export interface DatePickerFieldProps {
  id?: string;
  /** ISO yyyy-MM-dd, or undefined / "" when empty. */
  value?: string | null;
  onChange: (iso: string | undefined) => void;
  /** Earliest and latest dates that can be picked (ISO, inclusive). */
  min?: string;
  max?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  /** Accessible name when no <label for> points at the field. */
  ariaLabel?: string;
  /** "public": the website's 44px rounded field; "admin": the admin control height and radius. */
  appearance?: "public" | "admin";
  className?: string;
}

export function DatePickerField({
  id, value, onChange, min, max, placeholder = "Select date", disabled, invalid, describedBy, ariaLabel, appearance = "public", className,
}: DatePickerFieldProps) {
  const selected = toDate(value);
  const minDate = toDate(min);
  const maxDate = toDate(max);
  const thisYear = new Date().getFullYear();
  const fromYear = minDate?.getFullYear() ?? thisYear - 100;
  const toYear = maxDate?.getFullYear() ?? thisYear + 25;
  const clamp = (date: Date) => (minDate && date < minDate ? minDate : maxDate && date > maxDate ? maxDate : date);
  const [open, setOpen] = React.useState(false);
  const [month, setMonth] = React.useState<Date>(() => clamp(selected ?? new Date()));

  React.useEffect(() => {
    if (open) setMonth(clamp(selected ?? new Date()));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-centre only when the calendar opens
  }, [open]);

  const disabledDays = [...(minDate ? [{ before: minDate }] : []), ...(maxDate ? [{ after: maxDate }] : [])];
  const pick = (date: Date | undefined) => {
    if (!date) return;
    onChange(toIso(date));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={next => !disabled && setOpen(next)}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          aria-haspopup="dialog"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn(
            "flex w-full min-w-0 items-center gap-2 border bg-background px-3 text-left transition-colors hover:border-primary/50",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            appearance === "public" ? "h-11 rounded-xl border-input text-sm" : "h-control rounded-md border-input text-body",
            invalid && "border-destructive",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate">{selected ? formatPickedDate(value) : placeholder}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto max-w-[calc(100vw-1.5rem)] p-0"
        align="start"
        side="bottom"
        sideOffset={6}
        collisionPadding={12}
        flip
        // The calendar opens below its field, or above it when there's more room there (flip); then the chosen day (or
        // today) takes the focus for the arrow keys, without scrolling, so the month and year lists stay in view.
        onOpenAutoFocus={event => {
          event.preventDefault();
          const content = event.currentTarget as HTMLElement;
          window.requestAnimationFrame(() => {
            const day = content.querySelector<HTMLElement>('button[name="day"][tabindex="0"]') ?? content.querySelector<HTMLElement>('button[name="day"]:not([disabled])');
            day?.focus({ preventScroll: true });
          });
        }}
      >
        <DayPicker
          mode="single"
          selected={selected}
          onSelect={pick}
          month={month}
          onMonthChange={setMonth}
          captionLayout="dropdown-buttons"
          fromYear={fromYear}
          toYear={toYear}
          fromDate={minDate}
          toDate={maxDate}
          disabled={disabledDays}
          showOutsideDays={false}
          className="pointer-events-auto p-2"
          classNames={{
            months: "flex flex-col",
            month: "space-y-2.5",
            caption: "relative flex min-h-9 items-center justify-center px-8 pt-1",
            caption_label: "hidden",
            caption_dropdowns: "flex min-w-0 items-center justify-center gap-2",
            dropdown:
              "h-9 rounded-md border border-input bg-background px-2 text-sm font-medium text-foreground outline-none transition-colors hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring",
            dropdown_month: "w-[116px]",
            dropdown_year: "w-[82px]",
            vhidden: "sr-only",
            nav: "flex items-center gap-1",
            nav_button: cn(
              buttonVariants({ variant: "outline" }),
              "pointer-events-auto h-7 w-7 rounded-lg bg-background p-0 opacity-80 hover:opacity-100 disabled:opacity-30 [&_svg]:h-4 [&_svg]:w-4",
            ),
            nav_button_previous: "absolute left-0 top-1",
            nav_button_next: "absolute right-0 top-1",
            table: "w-full border-collapse space-y-1",
            head_row: "flex",
            head_cell: "w-9 rounded-md text-[0.75rem] font-normal text-muted-foreground",
            row: "mt-1 flex w-full",
            cell: "relative h-9 w-9 p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:rounded-md [&:has([aria-selected])]:bg-accent",
            day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent"),
            day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
            day_today: "bg-accent font-semibold text-accent-foreground",
            day_outside: "text-muted-foreground opacity-40",
            day_disabled: "text-muted-foreground opacity-40",
            day_hidden: "invisible",
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
