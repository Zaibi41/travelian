import { useState } from "react";
import { Plane } from "lucide-react";

const airlineCodes: Record<string, string> = {
  pia: "PK",
  "pakistan international airlines": "PK",
  airsial: "PF",
  "air sial": "PF",
  flyadeal: "F3",
  "fly adeal": "F3",
  "fly jinnah": "9P",
  emirates: "EK",
  "qatar airways": "QR",
  flydubai: "FZ",
  "saudi airlines": "SV",
  saudia: "SV",
  travelport: "1G",
};

const localAirlineLogos: Record<string, string> = {
  airsial: "/airline-logos/airsial.png",
  "air sial": "/airline-logos/airsial.png",
  flynas: "/airline-logos/flynas.png",
};

function resolveCode(airline: string, flightNumber?: string) {
  const flightPrefix = flightNumber?.match(/^[A-Z0-9]{2}/i)?.[0]?.toUpperCase();
  if (flightPrefix) return flightPrefix;
  return airlineCodes[airline.toLowerCase()] || "";
}

export function AirlineLogo({ airline, flightNumber }: { airline: string; flightNumber?: string }) {
  const [failed, setFailed] = useState(false);
  const localLogo = localAirlineLogos[airline.toLowerCase()];
  const code = resolveCode(airline, flightNumber);

  if (localLogo && !failed) {
    return (
      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-border">
        <img
          src={localLogo}
          alt={`${airline} logo`}
          className="h-full w-full object-contain p-2"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  if (!code || failed) {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Plane className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-border">
      <img
        src={`https://assets.duffel.com/img/airlines/for-light-background/full-color-logo/${code}.svg`}
        alt={`${airline} logo`}
        className="h-full w-full object-contain p-2"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
