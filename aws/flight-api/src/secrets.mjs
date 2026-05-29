const cache = new Map();

export async function getSecretJson(secretId) {
  if (!secretId) return null;
  if (cache.has(secretId)) return cache.get(secretId);

  try {
    const { SecretsManagerClient, GetSecretValueCommand } = await import("@aws-sdk/client-secrets-manager");
    const client = new SecretsManagerClient({});
    const result = await client.send(new GetSecretValueCommand({ SecretId: secretId }));
    const value = result.SecretString ? JSON.parse(result.SecretString) : {};
    cache.set(secretId, value);
    return value;
  } catch (error) {
    if (process.env.ALLOW_MISSING_SECRETS === "true") return null;
    throw error;
  }
}
