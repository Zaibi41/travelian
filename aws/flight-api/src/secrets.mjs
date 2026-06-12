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
    const { SecretsManagerClient, GetSecretValueCommand } = await import("@aws-sdk/client-secrets-manager");
    const client = new SecretsManagerClient({});
    const result = await client.send(new GetSecretValueCommand({ SecretId: secretId }));
    let value = result.SecretString || "{}";
    for (let index = 0; index < 2 && typeof value === "string"; index += 1) {
      const normalized = value.replace(/^(?:\uFEFF|\u00EF\u00BB\u00BF)/, "").trim();
      try {
        value = JSON.parse(normalized);
      } catch {
        value = normalized;
        break;
      }
    }
    cache.set(secretId, { value, cachedAt: Date.now() });
    return value;
  } catch (error) {
    if (process.env.ALLOW_MISSING_SECRETS === "true") return null;
    throw error;
  }
}
