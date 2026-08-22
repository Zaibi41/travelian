import { SooperFareAdapter } from "../src/providers/sooperfare.mjs";

process.env.SOOPERFARE_SECRET_ID ||= "ssm:/travelian/providers/sooperfare";
process.env.EGRESS_PROXY_SECRET_ID ||= "ssm:/travelian/egress/proxy";
process.env.EGRESS_PROXY_URL ||= "https://provider-egress.travelian.pk/proxy";
process.env.PROVIDER_TIMEOUT_MS ||= "9000";

const candidates = [
  "SABRE",
  "PIA",
  "SERENE",
  "AIRBLUE",
  "AIRSIAL",
  "FLYJINNAH",
  "FLYADEAL",
  "GDS",
  "NDC",
];

const adapter = new SooperFareAdapter();
const config = await adapter.config();
const request = {
  origin: "LHE",
  destination: "DXB",
  departureDate: "2026-08-30",
  tripType: "oneway",
  adults: 1,
  children: 0,
  infants: 0,
  cabin: "Economy",
  currency: "PKR",
};

const report = [];
for (const provider of candidates) {
  try {
    const payload = await adapter.post("/v1/airline/search", adapter.searchPayload(request, provider), config);
    report.push({
      provider,
      status: "ok",
      topLevelKeys: payload && typeof payload === "object" ? Object.keys(payload).slice(0, 8) : [],
    });
  } catch (error) {
    report.push({
      provider,
      status: "error",
      statusCode: error.statusCode,
      message: error.message,
    });
  }
}

console.log(JSON.stringify(report, null, 2));
