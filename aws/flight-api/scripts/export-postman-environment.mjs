import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

// Resolve the key only inside this process; never print it or save it in the repository.
const parameter = JSON.parse(execFileSync("aws", [
  "ssm", "get-parameter", "--name", "/travelian/api/clients", "--with-decryption",
  "--region", "us-east-1", "--profile", "travelian-admin", "--output", "json",
], { encoding: "utf8" }));
let secret = parameter.Parameter.Value;
for (let i = 0; i < 2 && typeof secret === "string"; i++) {
  try { secret = JSON.parse(secret); } catch { break; }
}
const key = typeof secret === "string" ? secret : secret?.apiKey || secret?.key;
if (!key) throw new Error("Configured client API key is missing");
const destination = join(homedir(), "Downloads", "Travelian-Private.postman_environment.json");
writeFileSync(destination, JSON.stringify({
  id: randomUUID(), name: "Travelian Private",
  values: [
    { key: "baseUrl", value: "https://api.travelian.pk", type: "default", enabled: true },
    { key: "travelianApiKey", value: String(key), type: "secret", enabled: true },
  ],
  _postman_variable_scope: "environment",
  _postman_exported_at: new Date().toISOString(),
}, null, 2) + "\n", { flag: "wx", mode: 0o600 });
console.log(`Private environment created: ${destination}`);
