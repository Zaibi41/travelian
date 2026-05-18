import { useEffect, useState } from "react";
import { Loader2, Plane, Radar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface FlightSearchLoaderProps {
  from: string;
  to: string;
}

const loadingMessages = [
  "Checking live airline availability",
  "Comparing fares across providers",
  "Confirming taxes and seats",
  "Preparing bookable flight options",
];

export function FlightSearchLoader({ from, to }: FlightSearchLoaderProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMessageIndex(current => (current + 1) % loadingMessages.length);
    }, 2200);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <Card className="overflow-hidden border-primary/15 shadow-card">
      <CardContent className="p-0">
        <div className="h-1.5 overflow-hidden bg-muted">
          <div className="h-full w-1/3 animate-[premiumProgress_1.8s_ease-in-out_infinite] bg-gradient-to-r from-primary via-gold to-primary" />
        </div>
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Radar className="absolute h-10 w-10 animate-spin opacity-20" />
              <Plane className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Searching Flights</p>
              <p key={messageIndex} className="mt-1 text-base font-semibold text-foreground animate-fade-in">
                {loadingMessages[messageIndex]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border bg-muted/30 px-4 py-3">
            <span className="text-sm font-bold text-foreground">{from}</span>
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm font-bold text-foreground">{to}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
