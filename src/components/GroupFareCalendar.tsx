// Group fare calendar (B7, D33): two months side by side, each date with seats showing the lowest real price the
// suppliers returned (from the gateway), coloured Low / Avg / High against the other dates shown. A past date or a date
// with no availability is greyed out and never shows a price: nothing is invented or interpolated here.
import { useMemo, useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, isSameMonth, parseISO, startOfMonth } from "date-fns";
import { ArrowLeft, ArrowRight } from "lucide-react";

export interface CalendarDay {
  date: string;
  /** Flights: false while no search for this date has finished (no price, still selectable). */
  checked?: boolean;
  available: boolean;
  lowest_price?: { amount_minor: number; currency: string } | null;
  fares?: number;
}

type Band = "low" | "avg" | "high";
const BAND_TEXT: Record<Band, string> = { low: "text-success", avg: "text-primary", high: "text-destructive" };
const BAND_DOT: Record<Band, string> = { low: "bg-success", avg: "bg-primary", high: "bg-destructive" };
const WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

/** 59,000 -> "59k"; 106,500 -> "107k"; below 1,000 -> the whole amount. */
export function shortPrice(amountMinor: number): string {
  const rupees = Math.round(amountMinor / 100);
  return rupees >= 1000 ? `${Math.round(rupees / 1000)}k` : String(rupees);
}

/** Low / Avg / High by thirds of the real prices shown (all the same price: Low). */
export function bands(days: CalendarDay[]): Map<string, Band> {
  const priced = days.filter((day) => day.available && day.lowest_price).map((day) => [day.date, day.lowest_price!.amount_minor] as const);
  const sorted = priced.map(([, amount]) => amount).sort((a, b) => a - b);
  const low = sorted[Math.floor((sorted.length - 1) / 3)] ?? 0;
  const high = sorted[Math.ceil(((sorted.length - 1) * 2) / 3)] ?? 0;
  return new Map(priced.map(([date, amount]) => [date, low === high || amount <= low ? "low" : amount >= high ? "high" : "avg"]));
}

function Month({ month, byDate, band, selected, today, onPick, anyDate }: {
  month: Date;
  byDate: Map<string, CalendarDay>;
  band: Map<string, Band>;
  selected?: string;
  today: string;
  onPick?: (date: string) => void;
  anyDate?: boolean;
}) {
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  return (
    <div className="min-w-0">
      <p className="mb-2 rounded-lg bg-muted/50 py-2 text-center text-sm font-semibold text-foreground">{format(month, "MMMM yyyy")}</p>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((weekday) => <span key={weekday} className="py-1 text-[11px] font-semibold text-muted-foreground">{weekday}</span>)}
        {Array.from({ length: getDay(days[0]) }, (_, index) => <span key={`pad-${index}`} />)}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const info = byDate.get(key);
          const real = key >= today && info?.available && info.lowest_price ? info.lowest_price : null;
          const tone = real ? band.get(key) ?? "avg" : null;
          const isSelected = selected === key;
          const selectable = Boolean(real) || (anyDate && key >= today);
          const label = `${format(day, "EEEE d MMMM")}: ${real ? `from ${shortPrice(real.amount_minor)}` : key < today ? "past date"
            : anyDate ? (info?.checked ? "no fares found" : "fare not checked yet") : "no availability"}`;
          return (
            <button
              key={key}
              type="button"
              disabled={!selectable || !onPick}
              aria-label={label}
              aria-pressed={isSelected}
              data-available={real ? "true" : "false"}
              onClick={() => selectable && onPick?.(key)}
              className={`mx-auto flex h-11 w-11 flex-col items-center justify-center rounded-lg leading-tight transition-colors ${
                isSelected ? "bg-primary text-primary-foreground" : real ? "hover:bg-primary/10" : selectable ? "text-foreground hover:bg-muted" : "cursor-not-allowed text-muted-foreground/50"
              }`}
            >
              <span className="text-sm font-semibold">{format(day, "d")}</span>
              {real && <span className={`text-[10px] font-semibold ${isSelected ? "text-primary-foreground" : BAND_TEXT[tone!]}`}>{shortPrice(real.amount_minor)}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function GroupFareCalendar({ days, selected, onPick, caption, anyDate, checking }: {
  days: CalendarDay[];
  selected?: string;
  onPick?: (date: string) => void;
  caption?: string;
  /** Flights: every future date can be picked; only dates with a real checked fare show a price. */
  anyDate?: boolean;
  /** Flights: more dates are being checked. */
  checking?: boolean;
}) {
  const byDate = useMemo(() => new Map(days.map((day) => [day.date, day])), [days]);
  const band = useMemo(() => bands(days), [days]);
  const today = format(new Date(), "yyyy-MM-dd");
  const first = days.length ? startOfMonth(parseISO(days[0].date)) : startOfMonth(new Date());
  const last = anyDate ? addMonths(startOfMonth(new Date()), 11) : days.length ? startOfMonth(parseISO(days[days.length - 1].date)) : first;
  const initial = selected ? startOfMonth(parseISO(selected)) : first;
  const [month, setMonth] = useState(initial < first || initial > last ? first : initial);
  if (!days.length && !anyDate) return null;
  const second = addMonths(month, 1);
  const open = days.filter((day) => day.available && day.lowest_price && day.date >= today).length;
  return (
    <section aria-label={caption ?? "Fare calendar"} className="w-full min-w-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <button type="button" aria-label="Previous month" disabled={!(month > first)} onClick={() => setMonth(addMonths(month, -1))}
          className="rounded-lg border p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40"><ArrowLeft className="h-4 w-4" /></button>
        <p className="min-w-0 truncate text-xs text-muted-foreground">
          {caption ? `${caption} · ` : ""}{anyDate
            ? (checking ? "Checking fares…" : open ? `Lowest fares found for ${open} date${open === 1 ? "" : "s"}` : "Fares appear as dates are checked")
            : open ? `${open} date${open === 1 ? "" : "s"} with seats` : "No dates with seats in this period"}
        </p>
        <button type="button" aria-label="Next month" disabled={!(second < last) && !isSameMonth(second, last)} onClick={() => setMonth(addMonths(month, 1))}
          className="rounded-lg border p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40"><ArrowRight className="h-4 w-4" /></button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Month month={month} byDate={byDate} band={band} selected={selected} today={today} onPick={onPick} anyDate={anyDate} />
        <div className="hidden sm:block"><Month month={second} byDate={byDate} band={band} selected={selected} today={today} onPick={onPick} anyDate={anyDate} /></div>
      </div>
      <p className="mt-3 flex items-center justify-center gap-3 border-t pt-2 text-[11px] text-muted-foreground">
        Lowest fare per adult:
        {(["low", "avg", "high"] as const).map((key) => (
          <span key={key} className="inline-flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${BAND_DOT[key]}`} />{key === "avg" ? "Avg" : key[0].toUpperCase() + key.slice(1)}</span>
        ))}
      </p>
    </section>
  );
}
