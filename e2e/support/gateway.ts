// The admin talks to the gateway either directly (VITE_TRAVELIAN_GATEWAY_BASE_URL, port 8000) or,
// on the dev server, through the frontend's own /__gateway proxy (vite.config.ts). Specs answer
// gateway calls themselves; this view makes a proxied request look like a direct one, so the same
// interception works with either setup and nothing reaches a real gateway.
export function gatewayView(raw: string): URL {
  const url = new URL(raw);
  if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) && url.pathname.startsWith("/__gateway/")) {
    return new URL(`http://127.0.0.1:8000${url.pathname.slice("/__gateway".length)}${url.search}`);
  }
  return url;
}
