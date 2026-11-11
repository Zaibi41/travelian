// Admin copy of src/components/public/AirlineLogo.tsx (the admin does not import public components).
import { useState } from "react";
import { Plane } from "lucide-react";
import { cn } from "@/lib/utils";

const airlineCodes: Record<string, string> = {
  "9p": "9P",
  ek: "EK",
  er: "ER",
  f3: "F3",
  fz: "FZ",
  g9: "G9",
  ov: "OV",
  pf: "PF",
  pk: "PK",
  qr: "QR",
  sv: "SV",
  tk: "TK",
  ul: "UL",
  xy: "XY",
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
  "saudi airline": "SV",
  "air arabia": "G9",
  flynas: "XY",
  "salam air": "OV",
  salamair: "OV",
  "oman air": "WY",
  airblue: "PA",
  "air blue": "PA",
  "jazeera airways": "J9",
  "kuwait airways": "KU",
  "turkish airlines": "TK",
  turkish: "TK",
  etihad: "EY",
  "etihad airways": "EY",
  travelport: "1G",
};

const localAirlineLogos: Record<string, string> = {
  "1g": "/airline-logos/travelport.svg",
  "9p": "/airline-logos/fly-jinnah.png",
  ek: "/airline-logos/emirates.png",
  ey: "/airline-logos/etihad.png",
  f3: "/airline-logos/flyadeal.png",
  fz: "/airline-logos/flydubai.png",
  g9: "/airline-logos/air-arabia.png",
  j9: "/airline-logos/jazeera-airways.png",
  ku: "/airline-logos/kuwait-airways.png",
  ov: "/airline-logos/salam-air.png",
  pa: "/airline-logos/airblue.png",
  pf: "/airline-logos/airsial.png",
  pk: "/airline-logos/pia.png",
  qr: "/airline-logos/qatar-airways.png",
  sv: "/airline-logos/saudia.png",
  tk: "/airline-logos/turkish-airlines.png",
  wy: "/airline-logos/oman-air.png",
  xy: "/airline-logos/flynas.png",
  "air arabia": "/airline-logos/air-arabia.png",
  airblue: "/airline-logos/airblue.png",
  "air blue": "/airline-logos/airblue.png",
  "air china": "/airline-logos/air-china.png",
  airsial: "/airline-logos/airsial.png",
  "air sial": "/airline-logos/airsial.png",
  amadeus: "/airline-logos/amadeus.png",
  "azerbaijan airlines": "/airline-logos/azerbaijan-airlines.png",
  azerbaijan: "/airline-logos/azerbaijan-airlines.png",
  emirates: "/airline-logos/emirates.png",
  etihad: "/airline-logos/etihad.png",
  "etihad airways": "/airline-logos/etihad.png",
  flyadeal: "/airline-logos/flyadeal.png",
  "fly adeal": "/airline-logos/flyadeal.png",
  flydubai: "/airline-logos/flydubai.png",
  "fly dubai": "/airline-logos/flydubai.png",
  "fly jinnah": "/airline-logos/fly-jinnah.png",
  flynas: "/airline-logos/flynas.png",
  "jazeera airways": "/airline-logos/jazeera-airways.png",
  "kuwait airways": "/airline-logos/kuwait-airways.png",
  "oman air": "/airline-logos/oman-air.png",
  pegasus: "/airline-logos/pegasus.png",
  pia: "/airline-logos/pia.png",
  "pakistan international airlines": "/airline-logos/pia.png",
  "qatar airways": "/airline-logos/qatar-airways.png",
  sabre: "/airline-logos/sabre.png",
  "salam air": "/airline-logos/salam-air.png",
  salamair: "/airline-logos/salam-air.png",
  saudia: "/airline-logos/saudia.png",
  "saudi airline": "/airline-logos/saudia.png",
  "saudi airlines": "/airline-logos/saudia.png",
  "srilankan airlines": "/airline-logos/srilankan-airlines.png",
  "sri lankan airlines": "/airline-logos/srilankan-airlines.png",
  srilankan: "/airline-logos/srilankan-airlines.png",
  "sri lankan": "/airline-logos/srilankan-airlines.png",
  srilanka: "/airline-logos/srilankan-airlines.png",
  ul: "/airline-logos/srilankan-airlines.png",
  travelport: "/airline-logos/travelport.svg",
  turkish: "/airline-logos/turkish-airlines.png",
  "turkish airlines": "/airline-logos/turkish-airlines.png",
};

function resolveCode(airline: string, flightNumber?: string) {
  const flightText = String(flightNumber || "").trim();
  const flightPrefix = flightText.match(/^[A-Z0-9]{2}/i)?.[0]?.toUpperCase();
  if (flightPrefix) return flightPrefix;
  return airlineCodes[String(airline || "").toLowerCase()] || "";
}

export function AirlineLogo({
  airline,
  flightNumber,
  imageUrl,
  className,
}: {
  airline: string;
  flightNumber?: string;
  imageUrl?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const airlineName = String(airline || "Airline");
  const normalizedAirline = airlineName.toLowerCase().trim();
  const code = resolveCode(airline, flightNumber);
  const localLogo = localAirlineLogos[normalizedAirline] || localAirlineLogos[code.toLowerCase()];
  const remoteLogo = String(imageUrl || "").trim();
  // Same look as the public logo tile; its colours are admin tokens with the same values
  // (--logo-tile-*, src/styles/admin-tokens.css).
  const logoShell = "flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[hsl(var(--logo-tile-border))] bg-gradient-to-br from-card via-card to-[hsl(var(--logo-tile-fade))] shadow-[var(--logo-tile-shadow)] ring-1 ring-[hsl(var(--logo-tile-ink)/0.05)]";
  const logoImage = "max-h-10 w-[86%] object-contain drop-shadow-[0_1px_1px_hsl(var(--logo-tile-ink)/0.16)] [filter:saturate(1.12)_contrast(1.08)]";

  if (remoteLogo && !failed) {
    return (
      <div className={cn(logoShell, className)}>
        <img
          src={remoteLogo}
          alt={`${airlineName} logo`}
          className={logoImage}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  if (localLogo && !failed) {
    return (
      <div className={cn(logoShell, className)}>
        <img
          src={localLogo}
          alt={`${airlineName} logo`}
          className={logoImage}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  if (!code || failed) {
    return (
      <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/15", className)}>
        <Plane className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/15", className)}>
      <Plane className="h-6 w-6" />
    </div>
  );
}
