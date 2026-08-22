import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const ssm = new SSMClient({});
const result = await ssm.send(
  new GetParameterCommand({
    Name: "/travelian/providers/sooperfare",
    WithDecryption: true,
  }),
);

let value = {};
try {
  value = JSON.parse(result.Parameter?.Value || "{}");
} catch {
  value = {};
}

const safe = {};
for (const key of Object.keys(value).sort()) {
  const item = value[key];
  safe[key] = {
    type: Array.isArray(item) ? "array" : typeof item,
    filled: Array.isArray(item) ? item.length > 0 : item !== undefined && item !== null && String(item).trim() !== "",
  };
}

console.log(JSON.stringify({ version: result.Parameter?.Version, keys: safe }, null, 2));
