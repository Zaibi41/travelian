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

export type GatewayErrorKind = "not_configured" | "unauthorized" | "forbidden" | "not_found" | "unavailable";

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
  /** Message for 503 (the source behind this endpoint is unavailable). */
  unavailableMessage?: string;
  /** Values for `{name}` segments in the path, URL-encoded. */
  pathParams?: Record<string, string>;
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

type PostPath = { [P in keyof paths]: paths[P] extends { post: unknown } ? (paths[P]["post"] extends undefined ? never : P) : never }[keyof paths];
type PostOp<P extends PostPath> = NonNullable<paths[P]["post"]>;
export type PostBody<P extends PostPath> = PostOp<P> extends { requestBody: { content: { "application/json": infer B } } } ? B : never;
export type PostResponse<P extends PostPath> = PostOp<P> extends { responses: { 200: { content: { "application/json": infer R } } } } ? R : never;

async function send(path: string, init: { method: "GET" | "POST"; query?: Record<string, unknown>; body?: unknown }, options: GatewayOptions): Promise<unknown> {
  const baseUrl = (options.baseUrl ?? configuredBaseUrl()).replace(/\/+$/, "");
  if (!baseUrl) {
    throw new GatewayError("not_configured", "The admin service address isn't set. Add VITE_TRAVELIAN_GATEWAY_BASE_URL to this environment.");
  }
  const accessToken = options.accessToken ?? getSession()?.accessToken;
  if (!accessToken) {
    throw new GatewayError("unauthorized", "Your session has no access token. Sign out and sign in again.");
  }

  const params = toSearchParams(init.query);
  const resolvedPath = path.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = options.pathParams?.[name];
    if (value === undefined) throw new Error(`Missing path parameter "${name}" for ${path}`);
    return encodeURIComponent(value);
  });
  const url = `${baseUrl}${resolvedPath}${params.size ? `?${params.toString()}` : ""}`;
  const headers: Record<string, string> = { Accept: "application/json", Authorization: `Bearer ${accessToken}` };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  let response: Response;
  try {
    response = await (options.fetchImpl ?? fetch)(url, {
      method: init.method,
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new GatewayError("unavailable", "The admin service can't be reached. Check that the gateway is running; data will load when it's back.");
  }

  if (response.status === 401) throw new GatewayError("unauthorized", "Your session has expired. Sign in again to load this page.");
  if (response.status === 403) throw new GatewayError("forbidden", "Your role can't view this data. A super admin can grant access.");
  if (response.status === 404) throw new GatewayError("not_found", "This record wasn't found.");
  if (response.status === 503) throw new GatewayError("unavailable", options.unavailableMessage ?? "Booking data isn't available yet. The gateway's booking source isn't configured or can't be read.");
  if (!response.ok) throw new GatewayError("unavailable", `The admin service returned an error (${response.status}). Data will load when it recovers.`);
  return response.json();
}

/** Absolute URL for a gateway-served asset path such as /v1/logos/{id}; null if unset. */
export function gatewayAssetUrl(path?: string | null) {
  const baseUrl = configuredBaseUrl().replace(/\/+$/, "");
  return path && path.startsWith("/v1/") && baseUrl ? `${baseUrl}${path}` : null;
}

export function gatewayGet<P extends GetPath>(path: P, query?: GetQuery<P>, options: GatewayOptions = {}): Promise<GetResponse<P>> {
  return send(path, { method: "GET", query: query as Record<string, unknown> | undefined }, options) as Promise<GetResponse<P>>;
}

export function gatewayPost<P extends PostPath>(path: P, body: PostBody<P>, options: GatewayOptions = {}): Promise<PostResponse<P>> {
  return send(path, { method: "POST", body }, options) as Promise<PostResponse<P>>;
}
