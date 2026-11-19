// The flight fare calendar while a date picker is open (real fares only; dates being checked fill in, asking again every
// few seconds while the gateway checks more). Unchecked dates have no price and stay selectable.
import { useEffect, useState } from "react";
import type { CalendarDay } from "@/components/GroupFareCalendar";
import { publicFlightCalendar } from "@/lib/public-booking";

/** start: the first date (default today); the gateway checks unknown dates from there. */
export interface FareRoute { from: string; to: string; adults: number; cabin: string; start?: string }

/** The flight fare calendar while the picker is open (real fares only; dates being checked fill in). */
export function useFlightFares(open: boolean, route?: FareRoute) {
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [checking, setChecking] = useState(false);
  const ready = Boolean(route && /^[A-Z]{3}$/.test(route.from) && /^[A-Z]{3}$/.test(route.to) && route.from !== route.to);
  const key = ready ? `${route!.from}-${route!.to}-${route!.adults}-${route!.cabin}-${route!.start ?? ""}` : "";
  useEffect(() => {
    if (!open || !ready) return;
    const controller = new AbortController();
    let tries = 0;
    let timer: number | undefined;
    const load = () => {
      publicFlightCalendar(route!.from, route!.to, route!.adults, route!.cabin, controller.signal, route!.start)
        .then((calendar) => {
          setDays(calendar.days);
          setChecking(calendar.pending);
          if (calendar.pending && ++tries < 8) timer = window.setTimeout(load, 4000);
        })
        .catch(() => setChecking(false));
    };
    load();
    return () => { controller.abort(); window.clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when the route or the popup changes
  }, [open, key]);
  return { days: ready ? days : [], checking: ready && checking, ready };
}
