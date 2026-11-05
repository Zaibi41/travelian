// Typed GET client for travelian-api-gateway. Paths, query parameters and
// response bodies are type-checked against src/lib/gateway/schema.d.ts, which is
// generated from the gateway's OpenAPI schema (`npm run api:types`).
// The server decides scope and visibility from the access token.

import { getSession } from "@/lib/auth-session";
import type { paths } from "./schema";

type GetPath = { [P in keyof paths]: paths[P] extends { get: unknown } ? (paths[P]["get"] extends undefined ? never : P) : never }[keyof paths];
type GetOp<P extends GetPath> = NonNullable<paths[P]["get"]>;
export type GetQuery<P extends GetPath> = GetOp<P> extends { parameters: { query?: infer Q } }
  ? ([NonNullable<Q>] extends [never] ? undefined : NonNullable<Q>)
  : undefined;
export type GetResponse<P extends GetPath> = GetOp<P> extends { responses: { 200: { content: { "application/json": infer R } } } } ? R : never;

export type GatewayErrorKind = "not_configured" | "unauthorized" | "forbidden" | "unavailable";

export class GatewayError extends Error {
  constructor(public kind: GatewayErrorKind, message: string) {
    super(message);
    this.name = "GatewayError";
  }
}

export interface GatewayOptions {
  baseUrl?: string;
  accessToken?: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

function configuredBaseUrl() {
  return import.meta.env.VITE_TRAVELIAN_GATEWAY_BASE_URL?.trim() || "";
}

function toSearchParams(query: Record<string, unknown> | undefined) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  return params;
}

export async function gatewayGet<P extends GetPath>(path: P, query?: GetQuery<P>, options: GatewayOptions = {}): Promise<GetResponse<P>> {
  const baseUrl = (options.baseUrl ?? configuredBaseUrl()).replace(/\/+$/, "");
  if (!baseUrl) {
    throw new GatewayError("not_configured", "The dashboard service address isn't set. Add VITE_TRAVELIAN_GATEWAY_BASE_URL to this environment.");
  }
  const accessToken = options.accessToken ?? getSession()?.accessToken;
  if (!accessToken) {
    throw new GatewayError("unauthorized", "Your session has no access token. Sign out and sign in again.");
  }

  const params = toSearchParams(query as Record<string, unknown> | undefined);
  const url = `${baseUrl}${path}${params.size ? `?${params.toString()}` : ""}`;
  let response: Response;
  try {
    response = await (options.fetchImpl ?? fetch)(url, {
      headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new GatewayError("unavailable", "The dashboard service can't be reached. Check that the gateway is running; figures will load when it's back.");
  }

  if (response.status === 401) throw new GatewayError("unauthorized", "Your session has expired. Sign in again to load the dashboard.");
  if (response.status === 403) throw new GatewayError("forbidden", "Your role can't view these dashboard figures. A super admin can grant access.");
  if (response.status === 503) throw new GatewayError("unavailable", "Dashboard booking data isn't available yet. The gateway's booking source isn't configured or can't be read.");
  if (!response.ok) throw new GatewayError("unavailable", `The dashboard service returned an error (${response.status}). Figures will load when it recovers.`);
  return response.json() as Promise<GetResponse<P>>;
}
