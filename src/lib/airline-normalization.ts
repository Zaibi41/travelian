const CANONICAL_AIRLINE_MAP: Record<string, string> = {
  airsial: "AirSial",
  air_sial: "AirSial",
  flyadeal: "Flyadeal",
  fly_adeal: "Flyadeal",
  flyjinnah: "Fly Jinnah",
  fly_jinnah: "Fly Jinnah",
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
  kuwaitairways: "Kuwait Airways",
  jazeeraairways: "Jazeera Airways",
  omanair: "Oman Air",
};

/**
 * Normalizes airline names across providers so variants like "Air Sial" and "AirSial",
 * or "Fly Dubai" and "Flydubai" are treated as the same canonical airline.
 */
export function normalizeAirlineName(raw?: string | null): string {
  const text = String(raw || "").trim();
  if (!text) return "";
  const key = text.toLowerCase().replace(/[^a-z0-9]/g, "");
  return CANONICAL_AIRLINE_MAP[key] || text;
}

/**
 * Checks if two airline names refer to the same airline, ignoring spaces, case, and known aliases.
 */
export function isSameAirline(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const normA = normalizeAirlineName(a).toLowerCase().replace(/[^a-z0-9]/g, "");
  const normB = normalizeAirlineName(b).toLowerCase().replace(/[^a-z0-9]/g, "");
  return normA === normB;
}
