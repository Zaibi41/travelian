import { enabledProviders, getProvider } from "../providers/index.mjs";

export async function searchFlights(request) {
  const searchId = crypto.randomUUID();
  const providers = enabledProviders(request.providers);
  const startedAt = Date.now();
  const settled = await Promise.allSettled(
    providers.map(async (provider) => {
      try {
        return {
          provider: provider.name,
          results: await withTimeout(provider.searchFlights(request), provider.name)
        };
      } catch (error) {
        error.provider ||= provider.name;
        throw error;
      }
    })
  );

  const providerStatus = {};
  const results = [];
  for (const item of settled) {
    if (item.status === "fulfilled") {
      providerStatus[item.value.provider] = "success";
      results.push(...item.value.results);
    } else {
      const provider = parseProviderFromError(item.reason) || "unknown";
      providerStatus[provider] = item.reason?.name === "TimeoutError" ? "timeout" : "error";
    }
  }

  return {
    searchId,
    durationMs: Date.now() - startedAt,
    providerStatus,
    results: sortOffers(results)
  };
}

export async function providerAction(providerName, action, payload) {
  const provider = getProvider(providerName);
  if (typeof provider[action] !== "function") {
    const error = new Error(`Provider ${providerName} does not support ${action}`);
    error.statusCode = 400;
    throw error;
  }
  return withTimeout(provider[action](payload), providerName);
}

function sortOffers(results) {
  return results.sort((a, b) => (a.price?.total ?? Number.MAX_SAFE_INTEGER) - (b.price?.total ?? Number.MAX_SAFE_INTEGER));
}

async function withTimeout(promise, providerName) {
  const timeoutMs = Number(process.env.PROVIDER_TIMEOUT_MS || 9000);
  let timeout;
  const timeoutPromise = new Promise((_, reject) => {
    timeout = setTimeout(() => {
      const error = new Error(`${providerName} timed out`);
      error.name = "TimeoutError";
      error.provider = providerName;
      reject(error);
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeout);
  }
}

function parseProviderFromError(error) {
  return error?.provider || String(error?.message || "").split(" ")[0]?.toLowerCase();
}
