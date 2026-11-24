/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TRAVELIAN_API_BASE_URL: string;
  readonly VITE_COGNITO_REGION?: string;
  readonly VITE_COGNITO_USER_POOL_ID?: string;
  readonly VITE_COGNITO_CLIENT_ID?: string;
  readonly VITE_COGNITO_DOMAIN?: string;
  /** travelian-api-gateway origin (without /v1). Admin Dashboard data. */
  readonly VITE_TRAVELIAN_GATEWAY_BASE_URL?: string;
  /** Public site origin for links, sitemaps and structured data; default https://travelian.pk (src/lib/site-config.ts). */
  readonly VITE_SITE_URL?: string;
  /** Google Analytics 4 measurement ID (G-XXXXXXXXXX). Analytics is off when unset (src/lib/analytics.ts). */
  readonly VITE_GA_MEASUREMENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
