import { SooperFareAdapter } from "../src/providers/sooperfare.mjs";

process.env.SOOPERFARE_SECRET_ID ||= "ssm:/travelian/providers/sooperfare";
process.env.EGRESS_PROXY_SECRET_ID ||= "ssm:/travelian/egress/proxy";
process.env.EGRESS_PROXY_URL ||= "https://provider-egress.travelian.pk/proxy";
process.env.PROVIDER_TIMEOUT_MS ||= "9000";

const adapter = new SooperFareAdapter();

try {
  const results = await adapter.searchFlights({
    origin: "LHE",
    destination: "DXB",
    departureDate: "2026-08-30",
    tripType: "oneway",
    adults: 1,
    children: 0,
    infants: 0,
    cabin: "Economy",
    currency: "PKR",
  });
  console.log(JSON.stringify({ status: "ok", results: results.length }, null, 2));
} catch (error) {
  console.log(JSON.stringify({
    status: "error",
    provider: error.provider,
    statusCode: error.statusCode,
    message: error.message,
  }, null, 2));
}
