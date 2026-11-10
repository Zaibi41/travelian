import { useEffect, useState } from "react";
import { parseISO } from "date-fns";
import { CalendarDays } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDay, parseDayFirst } from "@/lib/admin-search/date-display";
import { cn } from "@/lib/utils";

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
}

const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** A date shown day first ("24 Nov 2026") whatever the browser language. Type it (24/11/2026,
 *  24 Nov 2026) or pick it from the calendar; the value stays ISO. */
export function DayFirstDateField({ id, value, onChange, min, max, disabled, invalid, describedBy, fromYear = 2024, toYear = 2035, className }: DayFirstDateFieldProps) {
  const [text, setText] = useState(formatDay(value));
  const [unreadable, setUnreadable] = useState(false);
  const [open, setOpen] = useState(false);
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

  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div className="relative min-w-0">
            <input
              id={id}
              value={text}
              disabled={disabled}
              inputMode="text"
              autoComplete="off"
              placeholder="e.g. 24 Nov 2026"
              aria-invalid={invalid || unreadable || undefined}
              aria-describedby={[describedBy, unreadable ? errorId : undefined].filter(Boolean).join(" ") || undefined}
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
              className="flex h-control w-full min-w-0 rounded-sm border border-input bg-background py-1 pl-3 pr-10 text-body placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-status-critical"
            />
            <PopoverTrigger asChild>
              <button type="button" disabled={disabled} aria-label="Choose from calendar"
                className="absolute right-0.5 top-1/2 inline-flex h-8 w-9 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
              </button>
            </PopoverTrigger>
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
            disabled={[...(min ? [{ before: parseISO(min) }] : []), ...(max ? [{ after: parseISO(max) }] : [])]}
            onSelect={date => {
              if (!date) return;
              onChange(iso(date));
              setOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {unreadable && <p id={errorId} className="text-label text-status-critical-text">Enter the date day first, e.g. 24 Nov 2026.</p>}
    </div>
  );
}
