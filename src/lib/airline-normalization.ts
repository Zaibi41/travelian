const CANONICAL_AIRLINE_MAP: Record<string, string> = {
  airsial: "AirSial",
  air_sial: "AirSial",
  flyadeal: "Flyadeal",
  fly_adeal: "Flyadeal",
  flyjinnah: "Fly Jinnah",
  fly_jinnah: "Fly Jinnah",
  flyjinnahoneapi: "Fly Jinnah",
  flydubai: "Flydubai",
  fly_dubai: "Flydubai",
  airblue: "Airblue",
  air_blue: "Airblue",
  salamair: "SalamAir",
  salam_air: "SalamAir",
  pakistaninternationalairlines: "PIA",
  pia: "PIA",
  saudia: "Saudia",
  saudiairlines: "Saudia",
  saudiairline: "Saudia",
  saudi_airlines: "Saudia",
  emirates: "Emirates",
  qatarairways: "Qatar Airways",
  turkishairlines: "Turkish Airlines",
  turkish: "Turkish Airlines",
  gulfair: "Gulf Air",
  gulfairbahrain: "Gulf Air",
  nasair: "Flynas",
  flynas: "Flynas",
  fly_nas: "Flynas",
  airarabia: "Air Arabia",
  air_arabia: "Air Arabia",
  airarabiaoneapi: "Air Arabia",
  kuwaitairways: "Kuwait Airways",
  jazeeraairways: "Jazeera Airways",
  omanair: "Oman Air",
};

export const CARRIER_CODE_TO_AIRLINE: Record<string, string> = {
  "9P": "Fly Jinnah",
  "G9": "Air Arabia",
  "XY": "Flynas",
  "PF": "AirSial",
  "PA": "Airblue",
  "PK": "PIA",
  "ER": "SereneAir",
  "FZ": "Flydubai",
  "EK": "Emirates",
  "QR": "Qatar Airways",
  "SV": "Saudia",
  "F3": "Flyadeal",
  "WY": "Oman Air",
  "J9": "Jazeera Airways",
  "KU": "Kuwait Airways",
  "TK": "Turkish Airlines",
  "OV": "SalamAir",
  "EY": "Etihad Airways",
};

export function getAirlineNameFromCarrier(carrier?: string | null): string {
  const code = String(carrier || "").trim().toUpperCase();
  return CARRIER_CODE_TO_AIRLINE[code] || "";
}

/**
 * Extracts all distinct canonical airlines from a string (including composite names like "Fly Jinnah / Air Arabia").
 */
export function extractAllAirlines(raw?: string | null): string[] {
  const text = String(raw || "").trim();
  if (!text) return [];
  const parts = text.split(/[/+&]/).map((s) => normalizeAirlineName(s.trim())).filter(Boolean);
  return Array.from(new Set(parts));
}

/**
 * Normalizes airline names across providers so variants like "Air Sial" and "AirSial",
 * or "Fly Dubai" and "Flydubai" are treated as the same canonical airline.
 * Supports composite names like "Fly Jinnah / Air Arabia".
 */
export function normalizeAirlineName(raw?: string | null): string {
  const text = String(raw || "").trim();
  if (!text) return "";
  if (text.includes("/") || text.includes("+")) {
    return text
      .split(/(\s*[/+]\s*)/)
      .map((part) => {
        const trimmed = part.trim();
        if (trimmed === "/" || trimmed === "+") return trimmed;
        const key = trimmed.toLowerCase().replace(/[^a-z0-9]/g, "");
        return CANONICAL_AIRLINE_MAP[key] || trimmed;
      })
      .join(" ");
  }
  const key = text.toLowerCase().replace(/[^a-z0-9]/g, "");
  return CANONICAL_AIRLINE_MAP[key] || text;
}

/**
 * Checks if two airline names refer to the same airline, ignoring spaces, case, and known aliases.
 * If either name is composite (e.g. "Fly Jinnah / Air Arabia"), matches if any constituent airline matches.
 */
export function isSameAirline(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const normA = normalizeAirlineName(a).toLowerCase().replace(/[^a-z0-9]/g, "");
  const normB = normalizeAirlineName(b).toLowerCase().replace(/[^a-z0-9]/g, "");
  if (normA === normB) return true;

  const partsA = extractAllAirlines(a).map((s) => s.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const partsB = extractAllAirlines(b).map((s) => s.toLowerCase().replace(/[^a-z0-9]/g, ""));
  return partsA.some((pa) => partsB.some((pb) => pa === pb));
}
