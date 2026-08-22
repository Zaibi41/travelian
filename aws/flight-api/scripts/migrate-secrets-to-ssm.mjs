import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { SSMClient, PutParameterCommand } from "@aws-sdk/client-ssm";

const mappings = [
  ["travelian/providers/pia", "/travelian/providers/pia"],
  ["travelian/egress/proxy", "/travelian/egress/proxy"],
  ["travelian/providers/dhilluandsahi", "/travelian/providers/dhilluandsahi"],
  ["travelian/api/clients", "/travelian/api/clients"],
  ["travelian/travelport/oauth", "/travelian/travelport/oauth"],
  ["travelian/providers/sooperfare", "/travelian/providers/sooperfare"],
  ["travelian/providers/alhaider", "/travelian/providers/alhaider"],
  ["travelian/api/skypass-clients", "/travelian/api/skypass-clients"],
  ["travelian/providers/flyadeal", "/travelian/providers/flyadeal"],
  ["travelian/providers/airsial", "/travelian/providers/airsial"],
];

const secrets = new SecretsManagerClient({});
const ssm = new SSMClient({});
const copied = [];
const missing = [];

for (const [secretId, parameterName] of mappings) {
  try {
    const result = await secrets.send(new GetSecretValueCommand({ SecretId: secretId }));
    const value = result.SecretString;
    if (!value) {
      missing.push(secretId);
      continue;
    }
    await ssm.send(
      new PutParameterCommand({
        Name: parameterName,
        Type: "SecureString",
        Value: value,
        Overwrite: true,
      }),
    );
    copied.push(`${secretId} -> ${parameterName}`);
  } catch {
    missing.push(secretId);
  }
}

console.log(`Copied to SSM: ${copied.length}`);
for (const item of copied) console.log(item);
console.log(`Missing or empty: ${missing.length}`);
for (const item of missing) console.log(item);
