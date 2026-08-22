const cache = new Map();
const cacheTtlMs = Number(process.env.SECRET_CACHE_TTL_MS || 0);

function readCached(secretId) {
  const cached = cache.get(secretId);
  if (!cached) return undefined;
  if (cacheTtlMs > 0 && Date.now() - cached.cachedAt > cacheTtlMs) {
    cache.delete(secretId);
    return undefined;
  }
  return cached.value;
}

export async function getSecretJson(secretId) {
  if (!secretId) return null;
  const cached = readCached(secretId);
  if (cached !== undefined) return cached;

  try {
    const value = parseSecretValue(await readSecretValue(secretId));
    cache.set(secretId, { value, cachedAt: Date.now() });
    return value;
  } catch (error) {
    if (process.env.ALLOW_MISSING_SECRETS === "true") return null;
    throw error;
  }
}

async function readSecretValue(secretId) {
  const reference = String(secretId);

  if (reference.startsWith("env:")) {
    return process.env[reference.slice(4)] || "{}";
  }

  if (reference.startsWith("ssm:")) {
    const { SSMClient, GetParameterCommand } = await import("@aws-sdk/client-ssm");
    const client = new SSMClient({});
    const result = await client.send(
      new GetParameterCommand({
        Name: reference.slice(4),
        WithDecryption: true,
      }),
    );
    return result.Parameter?.Value || "{}";
  }

  const { SecretsManagerClient, GetSecretValueCommand } = await import("@aws-sdk/client-secrets-manager");
  const client = new SecretsManagerClient({});
  const result = await client.send(new GetSecretValueCommand({ SecretId: reference }));
  return result.SecretString || "{}";
}

function parseSecretValue(rawValue) {
  let value = rawValue;
  for (let index = 0; index < 2 && typeof value === "string"; index += 1) {
    const normalized = value.replace(/^(?:\uFEFF|\u00EF\u00BB\u00BF)/, "").trim();
    try {
      value = JSON.parse(normalized);
    } catch {
      value = normalized;
      break;
    }
  }
  return value;
}
