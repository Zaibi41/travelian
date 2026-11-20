import { useEffect, useState } from "react";
import { parseISO } from "date-fns";
import { CalendarDays } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDay, parseDayFirst } from "@/lib/admin-search/date-display";
import { cn } from "@/lib/utils";
import { CalendarPopup, CalendarPopupContent, CalendarPopupTrigger } from "@/components/ui/calendar-popup";
import { GroupFareCalendar, type CalendarDay } from "@/components/GroupFareCalendar";

interface DayFirstDateFieldProps {
  id: string;
  /** ISO yyyy-MM-dd (what the form keeps and sends), or undefined. */
  value?: string;
  onChange: (iso?: string) => void;
  /** Earliest and latest allowed dates, ISO. */
  min?: string;
  max?: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  /** Calendar year range (date of birth needs older years). */
  fromYear?: number;
  toYear?: number;
  className?: string;
  /** Height override for the text field (the search form uses 40px / 44px on touch). */
  inputClassName?: string;
  /** "search": the public search-form look, with the calendar icon leading the field. */
  variant?: "default" | "search";
  placeholder?: string;
  /** Title of the search calendar popup, e.g. "Select departure date". */
  calendarTitle?: string;
  /** Search variant: the website's fare calendar in the popup (prices per date). anyDate: every future date can be
   *  picked (flights); otherwise only dates with fares (group). Without days the plain calendar shows. status: loading
   *  (the price slots shimmer) or error ("Prices unavailable"); either way every future date can be picked. */
  fares?: { days: CalendarDay[]; checking?: boolean; anyDate?: boolean; status?: "idle" | "loading" | "ready" | "error" };
  /** The popup opened or closed. */
  onOpenChange?: (open: boolean) => void;
}

const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** A date shown day first ("24 Nov 2026") whatever the browser language. Type it (24/11/2026,
 *  24 Nov 2026) or pick it from the calendar; the value stays ISO. */
export function DayFirstDateField({ id, value, onChange, min, max, disabled, invalid, describedBy, fromYear = 2024, toYear = 2035, className, inputClassName, variant = "default", placeholder, calendarTitle = "Select a date", fares, onOpenChange }: DayFirstDateFieldProps) {
  const [text, setText] = useState(formatDay(value));
  const [unreadable, setUnreadable] = useState(false);
  const [open, setOpenState] = useState(false);
  const setOpen = (next: boolean) => {
    setOpenState(next);
    onOpenChange?.(next);
  };
  useEffect(() => {
    setText(formatDay(value));
    setUnreadable(false);
  }, [value]);

  const inRange = (date: string) => (!min || date >= min) && (!max || date <= max);
  const commit = (raw: string) => {
    const parsed = parseDayFirst(raw);
    if (!raw.trim()) {
      setUnreadable(false);
      onChange(undefined);
    } else if (parsed && inRange(parsed)) {
      setUnreadable(false);
      onChange(parsed);
    } else {
      setUnreadable(true);
      onChange(undefined);
    }
  };
  const errorId = `${id}-format`;
  const search = variant === "search";
  const disabledDays = [...(min ? [{ before: parseISO(min) }] : []), ...(max ? [{ after: parseISO(max) }] : [])];
  const pick = (date?: Date) => {
    if (!date) return;
    onChange(iso(date));
    setOpen(false);
  };

  const input = (
    <input
      id={id}
      value={text}
      disabled={disabled}
      inputMode="text"
      autoComplete="off"
      placeholder={placeholder ?? (search ? "24 Nov 2026" : "e.g. 24 Nov 2026")}
      aria-invalid={invalid || unreadable || undefined}
      aria-describedby={[describedBy, unreadable ? errorId : undefined].filter(Boolean).join(" ") || undefined}
      // Search forms, as on the public site: clicking the field opens the calendar popup. Tabbing in
      // does not, so the date can still be typed day first from the keyboard.
      onClick={search && !disabled ? () => setOpen(true) : undefined}
      onChange={event => {
        setText(event.target.value);
        const parsed = parseDayFirst(event.target.value);
        if (parsed && inRange(parsed)) {
          setUnreadable(false);
          onChange(parsed);
        }
      }}
      onBlur={() => {
        commit(text);
        const parsed = parseDayFirst(text);
        if (parsed && inRange(parsed)) setText(formatDay(parsed));
      }}
      onKeyDown={event => {
        if (event.key === "Enter") commit(text);
      }}
      className={cn("flex w-full min-w-0 py-1 text-body placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-status-critical",
        search ? "cursor-pointer rounded-xl border border-muted-foreground/80 bg-muted/30 pl-11 pr-3" : "rounded-sm border border-input bg-background pl-3 pr-10",
        inputClassName ?? (search ? "h-14" : "h-control"))}
    />
  );
  const iconButton = (
    <button type="button" disabled={disabled} aria-label="Choose from calendar"
      className={cn("absolute top-1/2 inline-flex h-8 w-9 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground", search ? "left-1" : "right-0.5",
        "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed")}>
      <CalendarDays className="h-4 w-4" aria-hidden="true" />
    </button>
  );

  if (search) {
    // The public site's calendar popup (shared src/components/ui/calendar-popup): centred, titled,
    // a close button, two large months (stacked on phones), scrolling inside on short screens.
    return (
      <div className={cn("flex min-w-0 flex-col gap-1", className)}>
        <CalendarPopup open={open} onOpenChange={setOpen}>
          <div className="relative min-w-0">
            {input}
            <CalendarPopupTrigger asChild>{iconButton}</CalendarPopupTrigger>
          </div>
          <CalendarPopupContent title={calendarTitle}>
            {fares && (fares.anyDate || fares.days.length > 0 || fares.status === "loading" || fares.status === "error") ? (
              // The website's fare calendar (src/components/GroupFareCalendar), sized as on the website's search.
              <div className="w-[min(46rem,calc(100vw-2.5rem))] overflow-y-auto p-3 sm:p-5">
                <GroupFareCalendar days={fares.days} anyDate={fares.anyDate} checking={fares.checking} selected={value}
                  status={fares.status === "loading" || fares.status === "error" ? fares.status : "ready"}
                  onPick={date => { if (!min || date >= min) { onChange(date); setOpen(false); } }} />
              </div>
            ) : (
            <Calendar
              size="large"
              mode="single"
              fromYear={fromYear}
              toYear={toYear}
              selected={value ? parseISO(value) : undefined}
              defaultMonth={value ? parseISO(value) : min ? parseISO(min) : undefined}
              disabled={disabledDays}
              onSelect={pick}
              initialFocus
              className="pointer-events-auto p-3 sm:p-5"
            />
            )}
          </CalendarPopupContent>
        </CalendarPopup>
        {unreadable && <p id={errorId} className="text-label text-status-critical-text">Enter the date day first, e.g. 24 Nov 2026.</p>}
      </div>
    );
  }

  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div className="relative min-w-0">
            {input}
            <PopoverTrigger asChild>{iconButton}</PopoverTrigger>
          </div>
        </PopoverAnchor>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            numberOfMonths={1}
            fromYear={fromYear}
            toYear={toYear}
            selected={value ? parseISO(value) : undefined}
            defaultMonth={value ? parseISO(value) : min ? parseISO(min) : undefined}
            disabled={disabledDays}
            onSelect={pick}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {unreadable && <p id={errorId} className="text-label text-status-critical-text">Enter the date day first, e.g. 24 Nov 2026.</p>}
    </div>
  );
}
