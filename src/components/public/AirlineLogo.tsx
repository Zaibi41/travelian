import { useState } from "react";
import { Plane } from "lucide-react";
import { cn } from "@/lib/utils";
import logoManifest from "../../../public/airline-logos/index.json";

// One shared source with the gateway's PDF (gateway#62): public/airline-logos/index.json.
const airlineCodes: Record<string, string> = logoManifest.codes;

const localAirlineLogos: Record<string, string> = logoManifest.logos;

function resolveCode(airline: string, flightNumber?: string, airlineCode?: string | null) {
  const flightText = String(flightNumber || "").trim();
  // An airline code is two letters/digits (at least one letter) followed by the flight's digits: "Z8266", "PK 303".
  const flightPrefix = flightText.match(/^([A-Z0-9]{2})[\s-]*\d/i)?.[1]?.toUpperCase();
  if (flightPrefix && /[A-Z]/.test(flightPrefix)) return flightPrefix;
  const given = String(airlineCode || "").trim().toUpperCase();
  if (/^[A-Z0-9]{2}$/.test(given) && /[A-Z]/.test(given)) return given;
  return airlineCodes[String(airline || "").toLowerCase()] || "";
}

export function AirlineLogo({
  airline,
  flightNumber,
  code: airlineCode,
  imageUrl,
  className,
}: {
  airline: string;
  flightNumber?: string;
  /** The airline's IATA code when the data has it separately (e.g. the gateway's airline_code). */
  code?: string | null;
  imageUrl?: string | null;
  className?: string;
}) {
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const airlineName = String(airline || "Airline");
  const normalizedAirline = airlineName.toLowerCase().trim();
  const code = resolveCode(airline, flightNumber, airlineCode);
  const localLogo = localAirlineLogos[normalizedAirline] || localAirlineLogos[code.toLowerCase()];
  const remoteLogo = String(imageUrl || "").trim();
  // Travelian's own logo file wins over a supplier-sent image, so an airline looks the same on every page;
  // the supplier image is only used for airlines we have no file for (or if our file fails to load).
  const logoSource = [localLogo, remoteLogo].find((source) => source && !failedSources.includes(source));
  const logoShell = "flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-slate-50 shadow-[0_6px_18px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/5";
  const logoImage = "max-h-10 w-[86%] object-contain drop-shadow-[0_1px_1px_rgba(15,23,42,0.16)] [filter:saturate(1.12)_contrast(1.08)]";

  if (logoSource) {
    return (
      <div className={cn(logoShell, className)}>
        <img
          key={logoSource}
          src={logoSource}
          alt={`${airlineName} logo`}
          className={logoImage}
          loading="lazy"
          onError={() => setFailedSources((sources) => [...sources, logoSource])}
        />
      </div>
    );
  }

  // No logo file and no (working) supplier image: the airline's IATA code as a badge, never an empty box.
  // The plane icon is only for a flight whose airline code is unknown.
  return (
    <div
      role="img"
      aria-label={`${airlineName} logo`}
      className={cn("flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/15", className)}
    >
      {code ? <span className="text-xs font-bold leading-none tracking-wide">{code}</span> : <Plane className="h-1/2 w-1/2" aria-hidden="true" />}
    </div>
  );
}
