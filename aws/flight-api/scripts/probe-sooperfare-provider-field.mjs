import { SooperFareAdapter } from "../src/providers/sooperfare.mjs";

process.env.SOOPERFARE_SECRET_ID ||= "ssm:/travelian/providers/sooperfare";
process.env.EGRESS_PROXY_SECRET_ID ||= "ssm:/travelian/egress/proxy";
process.env.EGRESS_PROXY_URL ||= "https://provider-egress.travelian.pk/proxy";
process.env.PROVIDER_TIMEOUT_MS ||= "9000";

const adapter = new SooperFareAdapter();
const config = await adapter.config();

const basePayload = {
  flexible_dates: false,
  trip_type: "one_way",
  cabin_class: "economy",
  legs: [{ from: "LHE", to: "DXB", date: "2026-08-30", return: null }],
  travelers: [
    { type: "adult", qty: 1 },
    { type: "child", qty: 0 },
    { type: "infant", qty: 0 },
  ],
  redirect: true,
};

const variants = [
  ["omitted", basePayload],
  ["null", { ...basePayload, provider: null }],
  ["empty", { ...basePayload, provider: "" }],
  ["lower-sabre", { ...basePayload, provider: "sabre" }],
  ["upper-sabre", { ...basePayload, provider: "SABRE" }],
];

const report = [];
for (const [name, payload] of variants) {
  try {
    const response = await adapter.post("/v1/airline/search", payload, config);
    report.push({ name, status: "ok", keys: response && typeof response === "object" ? Object.keys(response).slice(0, 10) : [] });
  } catch (error) {
    report.push({ name, status: "error", statusCode: error.statusCode, message: error.message });
  }
}

console.log(JSON.stringify(report, null, 2));
