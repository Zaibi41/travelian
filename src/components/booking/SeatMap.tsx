import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface SeatMapProps {
  selected?: string;
  onSelect: (seat: string) => void;
  rows?: number;
}

// Random but stable taken seats per render seed
function buildTaken(rows: number): Set<string> {
  const taken = new Set<string>();
  const cols = ["A", "B", "C", "D", "E", "F"];
  for (let r = 1; r <= rows; r++) {
    cols.forEach(c => {
      // ~30% taken, deterministic-ish via simple hash
      if (((r * 7 + c.charCodeAt(0)) % 10) < 3) taken.add(`${r}${c}`);
    });
  }
  return taken;
}

export function SeatMap({ selected, onSelect, rows = 12 }: SeatMapProps) {
  const taken = useMemo(() => buildTaken(rows), [rows]);
  const cols = ["A", "B", "C", "D", "E", "F"];
  const isPremium = (r: number) => r <= 3;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-muted border" /> Available</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-gold/30 border border-gold/40" /> Premium (+PKR 15)</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-primary" /> Selected</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-muted-foreground/30" /> Taken</span>
      </div>

      <div className="bg-muted/30 rounded-2xl p-4 max-w-sm mx-auto">
        <div className="text-center text-xs text-muted-foreground mb-3">Front of aircraft</div>
        <div className="flex justify-center mb-3">
          <div className="h-1.5 w-24 bg-muted-foreground/30 rounded-full" />
        </div>

        <div className="space-y-1.5">
          {Array.from({ length: rows }, (_, i) => i + 1).map(r => (
            <div key={r} className="flex items-center justify-center gap-1">
              <span className="w-5 text-center text-xs text-muted-foreground">{r}</span>
              {cols.map((c, idx) => {
                const seat = `${r}${c}`;
                const isTaken = taken.has(seat);
                const isSelected = selected === seat;
                const premium = isPremium(r);
                return (
                  <span key={seat} className="contents">
                    {idx === 3 && <span className="w-3" />}
                    <button
                      type="button"
                      disabled={isTaken}
                      onClick={() => onSelect(seat)}
                      className={cn(
                        "h-7 w-7 rounded-md text-xs font-medium border transition-all",
                        isTaken && "bg-muted-foreground/30 text-muted-foreground cursor-not-allowed border-transparent",
                        !isTaken && !isSelected && !premium && "bg-card hover:border-primary hover:bg-primary/5",
                        !isTaken && !isSelected && premium && "bg-gold/20 hover:bg-gold/30 border-gold/40 text-foreground",
                        isSelected && "bg-primary text-primary-foreground border-primary shadow-sm scale-110",
                      )}
                      aria-label={`Seat ${seat}${isTaken ? " (taken)" : ""}`}
                    >
                      {c}
                    </button>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
