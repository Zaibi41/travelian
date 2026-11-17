import { useEffect, useState } from "react";
import { loadAirports, loadedAirports, type AirportIndex } from "@/lib/admin-search/airports";

/** The airport index: available synchronously once loaded (it starts loading with the Search page). */
export function useAirports(): AirportIndex | null {
  const [index, setIndex] = useState<AirportIndex | null>(loadedAirports);
  useEffect(() => {
    if (index) return undefined;
    let live = true;
    loadAirports().then(loaded => live && setIndex(loaded)).catch(() => undefined);
    return () => {
      live = false;
    };
  }, [index]);
  return index;
}
