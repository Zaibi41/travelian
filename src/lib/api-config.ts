// Public backend origin. Vite embeds this value in the browser bundle at build time.
export const API_BASE_URL = (
  import.meta.env.VITE_TRAVELIAN_API_BASE_URL || "https://api.travelian.pk"
).replace(/\/+$/, "");
