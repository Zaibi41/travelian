// Website switches set on the gateway (D39). Umrah is hidden until the gateway says it is on: while the answer is
// loading, or if it can't be fetched, every Umrah entry point stays hidden. Nothing Umrah is deleted.
// Fetched once per page load and shared by every component (no provider needed).
import { useSyncExternalStore } from "react";
import { getSiteConfig } from "@/lib/public-booking";

interface Switches { loaded: boolean; umrah: boolean }

let state: Switches = { loaded: false, umrah: false };
let started = false;
const listeners = new Set<() => void>();

function load() {
  if (started) return;
  started = true;
  getSiteConfig()
    .then(config => { state = { loaded: true, umrah: config.umrah_enabled === true }; })
    .catch(() => { state = { loaded: true, umrah: false }; })
    .finally(() => listeners.forEach(listener => listener()));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  load();
  return () => { listeners.delete(listener); };
}

export function useSiteSwitches(): Switches {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

/** Tests only: set the switches without the gateway. */
export function setSiteSwitchesForTest(next: Partial<Switches>) {
  started = true;
  state = { loaded: true, umrah: false, ...next };
  listeners.forEach(listener => listener());
}

/** Umrah pages and Umrah booking or request URLs (/umrah-packages, /umrah/…, /umrah-sample, ?type=umrah). */
export function isUmrahPath(href: string): boolean {
  const url = new URL(href, "https://travelian.pk");
  const path = url.pathname.toLowerCase();
  if (/^\/(umrah-packages|umrah|umrah-sample)(\/|$)/.test(path)) return true;
  if (/^\/(booking|request-booking)\/?$/.test(path)) {
    return (url.searchParams.get("type") || url.searchParams.get("category") || "").toLowerCase() === "umrah";
  }
  return false;
}
