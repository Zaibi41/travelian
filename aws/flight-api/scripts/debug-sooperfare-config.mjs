import { SooperFareAdapter } from "../src/providers/sooperfare.mjs";

process.env.SOOPERFARE_SECRET_ID ||= "ssm:/travelian/providers/sooperfare";
process.env.EGRESS_PROXY_SECRET_ID ||= "ssm:/travelian/egress/proxy";
process.env.EGRESS_PROXY_URL ||= "https://provider-egress.travelian.pk/proxy";
process.env.PROVIDER_TIMEOUT_MS ||= "9000";

const adapter = new SooperFareAdapter();
try {
  const config = await adapter.config();
  console.log(JSON.stringify({
    baseUrl: config.baseUrl,
    authorizationFilled: Boolean(config.authorization),
    authorizationLength: String(config.authorization || "").length,
    sfAuthorizationFilled: Boolean(config.sfAuthorization),
    sfAuthorizationLength: String(config.sfAuthorization || "").length,
    sfTokenFilled: Boolean(config.sfToken),
    sfTokenLength: String(config.sfToken || "").length,
    provider: config.provider,
    providers: config.providers,
  }, null, 2));
} catch (error) {
  console.log(JSON.stringify({
    status: "error",
    provider: error.provider,
    statusCode: error.statusCode,
    message: error.message,
  }, null, 2));
}
