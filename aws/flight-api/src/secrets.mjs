const cache = new Map();

export async function getSecretJson(secretId) {
  if (!secretId) return null;
  if (cache.has(secretId)) return cache.get(secretId);

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
    cache.set(secretId, value);
    return value;
  } catch (error) {
    if (process.env.ALLOW_MISSING_SECRETS === "true") return null;
    throw error;
  }
}
