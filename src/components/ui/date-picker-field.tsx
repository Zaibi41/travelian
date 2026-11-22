import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import { dateToIso, dayFirstToIso, formatPickedDate, isoToDate, maskDayFirst } from "@/lib/date-iso";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { buttonVariants } from "@/components/ui/button";

// The one date picker for forms on the public site and in the admin (date of birth, passport expiry, travel and
// transfer dates, coupon and package dates). Click (or Enter / Space) opens a calendar with month and year lists for a
// quick jump; arrow keys move between days, Enter picks, Escape closes. With `typeable` the date can also be typed day
// first (DD/MM/YYYY, never read month first) and the calendar opens from its own button.
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
  /** Where the calendar opens while nothing is picked (ISO), e.g. a date of birth about 30 years back. Default: today. */
  defaultMonth?: string;
  /** #155: the date can also be typed day first (DD/MM/YYYY) in the field; the calendar opens from its own button. */
  typeable?: boolean;
}

const isoToDayFirst = (iso?: string | null) => (iso && isoToDate(iso) ? iso.split("-").reverse().join("/") : "");

export function DatePickerField({
  id, value, onChange, min, max, placeholder = "Select date", disabled, invalid, describedBy, ariaLabel, appearance = "public", className,
  defaultMonth, typeable,
}: DatePickerFieldProps) {
  const selected = toDate(value);
  const minDate = toDate(min);
  const maxDate = toDate(max);
  const thisYear = new Date().getFullYear();
  const fromYear = minDate?.getFullYear() ?? thisYear - 100;
  const toYear = maxDate?.getFullYear() ?? thisYear + 25;
  const clamp = (date: Date) => (minDate && date < minDate ? minDate : maxDate && date > maxDate ? maxDate : date);
  const [open, setOpen] = React.useState(false);
  const start = () => clamp(selected ?? toDate(defaultMonth) ?? new Date());
  const [month, setMonth] = React.useState<Date>(start);

  React.useEffect(() => {
    if (open) setMonth(start());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-centre only when the calendar opens
  }, [open]);

  const disabledDays = [...(minDate ? [{ before: minDate }] : []), ...(maxDate ? [{ after: maxDate }] : [])];
  const pick = (date: Date | undefined) => {
    if (!date) return;
    onChange(toIso(date));
    setOpen(false);
  };

  // Typing (typeable only): the text follows the value when it changes from outside (the calendar, a saved draft).
  const [text, setText] = React.useState(() => isoToDayFirst(value));
  const [typedWrong, setTypedWrong] = React.useState("");
  React.useEffect(() => {
    if (!typeable) return;
    setText(current => (dayFirstToIso(current) === (value || undefined) ? current : isoToDayFirst(value)));
  }, [value, typeable]);
  const typed = (raw: string) => {
    const next = maskDayFirst(raw);
    setText(next);
    setTypedWrong("");
    const iso = dayFirstToIso(next);
    const inRange = iso && (!min || iso >= min) && (!max || iso <= max);
    if (inRange) onChange(iso);
    else if (value) onChange(undefined);
  };
  const typedOut = () => {
    const iso = dayFirstToIso(text);
    if (!text) setTypedWrong("");
    else if (!iso) setTypedWrong("Enter the date as DD/MM/YYYY.");
    else if (min && iso < min) setTypedWrong(`Choose ${formatPickedDate(min)} or later.`);
    else if (max && iso > max) setTypedWrong(`Choose ${formatPickedDate(max)} or earlier.`);
    else setTypedWrong("");
  };
  const wrongId = id ? `${id}-typed` : undefined;

  const trigger = typeable ? (
    <div
      className={cn(
        "flex w-full min-w-0 items-center border bg-background transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 hover:border-primary/50",
        appearance === "public" ? "h-11 rounded-xl border-input text-sm" : "h-control rounded-md border-input text-body",
        (invalid || Boolean(typedWrong)) && "border-destructive",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="DD/MM/YYYY"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={invalid || Boolean(typedWrong) || undefined}
        aria-describedby={[describedBy, typedWrong ? wrongId : null].filter(Boolean).join(" ") || undefined}
        value={text}
        onChange={event => typed(event.target.value)}
        onBlur={typedOut}
        className="h-full min-w-0 flex-1 rounded-[inherit] bg-transparent px-3 text-foreground outline-none placeholder:text-muted-foreground"
      />
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label="Open calendar"
          aria-haspopup="dialog"
          className="flex h-full w-11 shrink-0 items-center justify-center rounded-r-[inherit] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CalendarIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </PopoverTrigger>
    </div>
  ) : null;

  return (
    <>
    <Popover open={open} onOpenChange={next => !disabled && setOpen(next)}>
      {typeable ? (
        <PopoverAnchor asChild>{trigger}</PopoverAnchor>
      ) : (
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
      )}
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
    {typeable && typedWrong && (
      <p id={wrongId} className={appearance === "public" ? "mt-1 text-xs text-destructive" : "mt-1 text-helper text-status-critical-text"}>
        {typedWrong}
      </p>
    )}
    </>
  );
}