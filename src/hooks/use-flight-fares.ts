// Fare calendar prices for a search form (#55). The request starts in the background as soon as From and To are both
// filled (after a short pause, so typing doesn't send a request per key), not when the calendar opens, so the prices
// are usually there by the time it does. Changing From / To (or another input of the request) aborts the old request
// and starts a new one. No cache: the result lives only in the form that asked for it, for that same route; opening
// and closing the calendar reuses it, a new form (new search, page reload) asks again. Real fares only; flight dates
// the gateway is still checking fill in as it asks again every few seconds.
import { useEffect, useRef, useState } from "react";
import type { CalendarDay } from "@/components/GroupFareCalendar";
import { publicFlightCalendar } from "@/lib/public-booking";

/** Pause after the last change to From / To before the request starts. */
export const FARE_DEBOUNCE_MS = 400;
/** Flights: while the gateway says more dates are being checked, ask again this often, up to POLL_TRIES times. */
const POLL_MS = 4000;
const POLL_TRIES = 8;

/** idle: no complete route. loading: asking (or about to). ready: prices in. error: the request failed. */
export type FareStatus = "idle" | "loading" | "ready" | "error";
export interface FareState { days: CalendarDay[]; status: FareStatus; checking: boolean }
type Calendar = { days: CalendarDay[]; pending?: boolean };

const IDLE: FareState = { days: [], status: "idle", checking: false };
const LOADING: FareState = { days: [], status: "loading", checking: false };

/** One state per wanted key (duplicates share one request). A key that is no longer wanted is aborted and forgotten,
 *  so asking for it again later fetches fresh. */
export function useFareCalendars(keys: ReadonlyArray<string | null | undefined>, load: (key: string, signal: AbortSignal) => Promise<Calendar>) {
  const [entries, setEntries] = useState<Record<string, FareState>>({});
  const running = useRef(new Map<string, () => void>());
  const loadRef = useRef(load);
  loadRef.current = load;
  const wanted = [...new Set(keys.filter((key): key is string => Boolean(key)))].sort();
  const signature = wanted.join("\n");

  useEffect(() => {
    const active = running.current;
    for (const [key, stop] of [...active]) {
      if (!wanted.includes(key)) { stop(); active.delete(key); }
    }
    setEntries((previous) => {
      const next: Record<string, FareState> = {};
      for (const key of wanted) next[key] = active.has(key) ? previous[key] ?? LOADING : LOADING;
      return next;
    });
    for (const key of wanted) {
      if (active.has(key)) continue;
      const controller = new AbortController();
      let timer: number | undefined;
      let tries = 0;
      const put = (state: FareState | ((previous: FareState) => FareState)) => {
        if (controller.signal.aborted) return;
        setEntries((previous) => (key in previous
          ? { ...previous, [key]: typeof state === "function" ? state(previous[key]) : state } : previous));
      };
      const run = () => {
        loadRef.current(key, controller.signal)
          .then((calendar) => {
            const pending = Boolean(calendar.pending) && ++tries < POLL_TRIES;
            put({ days: calendar.days, status: "ready", checking: pending });
            if (pending && !controller.signal.aborted) timer = window.setTimeout(run, POLL_MS);
          })
          // A failed re-ask keeps the prices already shown; a failed first request is "Prices unavailable".
          .catch(() => put((previous) => (previous?.status === "ready" ? { ...previous, checking: false } : { days: [], status: "error", checking: false })));
      };
      timer = window.setTimeout(run, FARE_DEBOUNCE_MS);
      active.set(key, () => { controller.abort(); window.clearTimeout(timer); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs when the set of wanted routes changes
  }, [signature]);

  useEffect(() => {
    const active = running.current;
    return () => { for (const stop of active.values()) stop(); active.clear(); };
  }, []);

  return (key: string | null | undefined): FareState => (key ? entries[key] ?? LOADING : IDLE);
}

/** One route's calendar; null / undefined key: nothing to load. */
export function useCalendarFares(key: string | null | undefined, load: (signal: AbortSignal) => Promise<Calendar>) {
  const get = useFareCalendars([key], (_key, signal) => load(signal));
  return get(key);
}

/** start: the first date (default today); the gateway checks unknown dates from there. */
export interface FareRoute { from: string; to: string; adults: number; cabin: string; start?: string }

type CalendarFetch = (origin: string, destination: string, adults: number, cabin: string, signal?: AbortSignal, start?: string) =>
  Promise<{ days: CalendarDay[]; pending: boolean }>;

export const isFareRouteReady = (route?: FareRoute) =>
  Boolean(route && /^[A-Z]{3}$/.test(route.from) && /^[A-Z]{3}$/.test(route.to) && route.from !== route.to);

/** The flight fare calendar of a search form, loaded once From and To are both set. `enabled`: the form is open (a
 *  form that is always on the page passes true). Adults and cabin are part of the request (the gateway prices that
 *  many seats in that cabin), so changing them asks again, debounced like From / To. `fetch`: the website's call by
 *  default; admin Search passes its signed-in one (same calendar). */
export function useFlightFares(enabled: boolean, route?: FareRoute, fetch: CalendarFetch = publicFlightCalendar) {
  const ready = isFareRouteReady(route);
  const key = enabled && ready ? `${route!.from}-${route!.to}-${route!.adults}-${route!.cabin}-${route!.start ?? ""}` : null;
  // The request is built from the key, so it always matches the route the key stands for.
  const get = useFareCalendars([key], (wanted, signal) => {
    const [from, to, adults, cabin, ...start] = wanted.split("-");
    return fetch(from, to, Number(adults), cabin, signal, start.join("-") || undefined);
  });
  return { ...get(key), ready };
}
