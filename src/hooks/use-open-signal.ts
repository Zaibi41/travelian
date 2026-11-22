import { useEffect, useRef } from "react";

/** Runs `open` each time `signal` changes to a new non-zero number after mount (a form asking a field to open, e.g.
 *  the next search field on phones, #148). A field that mounts with a signal already set does not open. */
export function useOpenSignal(signal: number | undefined, open: () => void) {
  const seen = useRef(signal);
  const openRef = useRef(open);
  openRef.current = open;
  useEffect(() => {
    if (signal === seen.current) return;
    seen.current = signal;
    if (signal) openRef.current();
  }, [signal]);
}
