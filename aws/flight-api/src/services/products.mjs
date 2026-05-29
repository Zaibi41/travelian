import { enabledProviders } from "../providers/index.mjs";

export async function searchHotels(request) {
  return searchProviderProducts(request, "searchHotels", "hotel");
}

export async function searchTransfers(request) {
  return searchProviderProducts(request, "searchTransfers", "transfer");
}

async function searchProviderProducts(request, action, productType) {
  const searchId = crypto.randomUUID();
  const providers = enabledProviders(request.providers).filter(provider => typeof provider[action] === "function");
  const startedAt = Date.now();
  const settled = await Promise.allSettled(
    providers.map(async (provider) => ({
      provider: provider.name,
      results: await withTimeout(provider[action](request), provider.name)
    }))
  );

  const providerStatus = {};
  const results = [];
  for (const item of settled) {
    if (item.status === "fulfilled") {
      providerStatus[item.value.provider] = "success";
      results.push(...item.value.results);
    } else {
      const provider = item.reason?.provider || String(item.reason?.message || "").split(" ")[0]?.toLowerCase() || "unknown";
      providerStatus[provider] = item.reason?.name === "TimeoutError" ? "timeout" : "error";
    }
  }

  return {
    searchId,
    productType,
    durationMs: Date.now() - startedAt,
    providerStatus,
    results: sortByPrice(results)
  };
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

function sortByPrice(results) {
  return results.sort((a, b) => {
    const left = a.price?.total ?? a.totalPrice ?? Number.MAX_SAFE_INTEGER;
    const right = b.price?.total ?? b.totalPrice ?? Number.MAX_SAFE_INTEGER;
    return left - right;
  });
}
