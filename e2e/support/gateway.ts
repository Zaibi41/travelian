import { loadEnv } from "vite";

// One place for the hosts and ports e2e specs care about, read from the same config as the app:
// - the app under test: E2E_BASE_URL (playwright.config.ts uses it too), default http://localhost:8080;
// - the gateway: VITE_TRAVELIAN_GATEWAY_BASE_URL from the dev server's env files (.env.development,
//   .env.development.local, or the shell), the same value vite.config.ts proxies; default http://localhost:8000.
//
// The admin talks to the gateway either directly or, on the dev server, through the frontend's own
// /__gateway proxy (vite.config.ts). Specs answer gateway calls themselves; gatewayView makes a proxied
// request look like a direct one, so the same interception works with either setup and nothing reaches
// a real gateway.

const env = loadEnv(process.env.E2E_MODE || "development", process.cwd(), "VITE_");

export const APP_URL = new URL(process.env.E2E_BASE_URL?.trim() || "http://localhost:8080");

const configuredGateway = env.VITE_TRAVELIAN_GATEWAY_BASE_URL?.trim();
// A relative value (e.g. "/__gateway") has no host of its own, so the default is used.
export const GATEWAY_URL = new URL(configuredGateway && /^https?:\/\//.test(configuredGateway) ? configuredGateway : "http://localhost:8000");

const LOOPBACK = ["localhost", "127.0.0.1", "[::1]"];
const sameMachine = (hostname: string) => (LOOPBACK.includes(hostname) ? "127.0.0.1" : hostname);
const asUrl = (value: string | URL) => (typeof value === "string" ? new URL(value) : value);

/** The app's own hosts (this machine and the app's host). */
export const LOCAL_HOSTS: readonly string[] = [...new Set([...LOOPBACK, APP_URL.hostname])];

/** True for a request to the app itself (dev server, its assets): let it through; anything else is answered locally. */
export function isLocal(url: string | URL): boolean {
  return LOCAL_HOSTS.includes(asUrl(url).hostname);
}

/** A request URL as the gateway sees it: /__gateway/... on the app's host becomes the gateway's own address. */
export function gatewayView(raw: string): URL {
  const url = new URL(raw);
  if (isLocal(url) && url.pathname.startsWith("/__gateway/")) {
    return new URL(`${GATEWAY_URL.origin}${url.pathname.slice("/__gateway".length)}${url.search}`);
  }
  return url;
}

/** True for a gateway call (after gatewayView); localhost, 127.0.0.1 and [::1] count as the same machine. */
export function isGateway(url: string | URL): boolean {
  const target = asUrl(url);
  return target.protocol === GATEWAY_URL.protocol && target.port === GATEWAY_URL.port
    && sameMachine(target.hostname) === sameMachine(GATEWAY_URL.hostname);
}
