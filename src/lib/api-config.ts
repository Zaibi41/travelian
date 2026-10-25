// Public backend origin. Vite embeds this value in the browser bundle at build time.
const configuredApiUrl = import.meta.env.VITE_TRAVELIAN_API_BASE_URL?.trim();

if (!configuredApiUrl) {
  throw new Error("Missing required environment variable: VITE_TRAVELIAN_API_BASE_URL");
}

export const API_BASE_URL = configuredApiUrl.replace(/\/+$/, "");
