// Typed GET client for travelian-api-gateway. Paths, query parameters and
// response bodies are type-checked against src/lib/gateway/schema.d.ts, which is
// generated from the gateway's OpenAPI schema (`npm run api:types`).
// The server decides scope and visibility from the access token.

import { getSession } from "@/lib/auth-session";
import { EXPIRED_MESSAGE } from "@/lib/auth-guard";
import { expireSession, renewSession } from "@/lib/session-renewal";
import type { paths } from "./schema";

type GetPath = { [P in keyof paths]: paths[P] extends { get: unknown } ? (paths[P]["get"] extends undefined ? never : P) : never }[keyof paths];
type GetOp<P extends GetPath> = NonNullable<paths[P]["get"]>;
export type GetQuery<P extends GetPath> = GetOp<P> extends { parameters: { query?: infer Q } }
  ? ([NonNullable<Q>] extends [never] ? undefined : NonNullable<Q>)
  : undefined;
export type GetResponse<P extends GetPath> = GetOp<P> extends { responses: { 200: { content: { "application/json": infer R } } } } ? R : never;

export type GatewayErrorKind = "not_configured" | "unauthorized" | "forbidden" | "not_found" | "unavailable";

/** One validation message from the gateway, with the field path it belongs to (e.g. ["passengers", 0, "first_name"]). */
export interface GatewayFieldError {
  path: (string | number)[];
  message: string;
}

export class GatewayError extends Error {
  constructor(
    public kind: GatewayErrorKind,
    message: string,
    /** HTTP status, when the gateway answered. */
    public status?: number,
    /** The gateway's stable reason code, when it sends one (e.g. "fare_gone"). */
    public code?: string,
    /** Field-level validation messages (422). */
    public fieldErrors: GatewayFieldError[] = [],
    /** Other structured facts the gateway sent with the error (e.g. pnr, booking_id). */
    public extra: Record<string, unknown> = {},
  ) {
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
export type PostResponse<P extends PostPath> = PostOp<P> extends { responses: { 200: { content: { "application/json": infer R } } } } ? R
  : PostOp<P> extends { responses: { 201: { content: { "application/json": infer R } } } } ? R : never;

interface ErrorBody {
  detail: string | null;
  code?: string;
  fieldErrors: GatewayFieldError[];
  extra: Record<string, unknown>;
}

/** The gateway's own `detail` sentence, code, field errors and extra facts from an error body. */
async function errorBody(response: Response): Promise<ErrorBody> {
  try {
    const body = await response.json();
    const detail = typeof body?.detail === "string" && body.detail.length <= 300 ? body.detail : null;
    const fieldErrors = Array.isArray(body?.detail)
      ? body.detail
        .filter((item: unknown): item is { loc: unknown[]; msg: string } => typeof item === "object" && item !== null && Array.isArray((item as { loc?: unknown }).loc) && typeof (item as { msg?: unknown }).msg === "string")
        .map((item: { loc: unknown[]; msg: string }) => ({
          path: item.loc.filter((part): part is string | number => typeof part === "string" || typeof part === "number").filter((part, index) => !(index === 0 && part === "body")),
          message: item.msg.replace(/^Value error, /, ""),
        }))
      : [];
    const { detail: _detail, code, ...extra } = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
    return { detail, code: typeof code === "string" ? code : undefined, fieldErrors, extra };
  } catch {
    return { detail: null, fieldErrors: [], extra: {} };
  }
}

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

async function send(path: string, init: { method: Method; query?: Record<string, unknown>; body?: unknown; accept?: string }, options: GatewayOptions, renewed = false): Promise<unknown> {
  const baseUrl = (options.baseUrl ?? configuredBaseUrl()).replace(/\/+$/, "");
  if (!baseUrl) {
    throw new GatewayError("not_configured", "The admin service address isn't set. Add VITE_TRAVELIAN_GATEWAY_BASE_URL to this environment.");
  }
  const fromSession = options.accessToken === undefined;
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
  const headers: Record<string, string> = { Accept: init.accept ?? "application/json", Authorization: `Bearer ${accessToken}` };
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

  if (response.status === 401) {
    // The session ended (expired, or signed out elsewhere). Try the normal refresh once.
    // A read is sent again once with the new token; an action (POST, PATCH, DELETE: holds,
    // payments, ticketing...) is never re-sent automatically.
    if (fromSession && !renewed && await renewSession()) {
      if (init.method === "GET") return send(path, init, options, true);
      throw new GatewayError("unauthorized", "Your session was renewed. Nothing was sent; please try again.", 401, "session_renewed");
    }
    if (fromSession) expireSession();
    throw new GatewayError("unauthorized", EXPIRED_MESSAGE, 401);
  }
  if (response.status === 403) {
    const body = await errorBody(response);
    throw new GatewayError("forbidden", "Your role can't view this data. A super admin can grant access.", 403, body.code);
  }
  if (response.status === 404) {
    const body = await errorBody(response);
    throw new GatewayError("not_found", body.detail ?? "This record wasn't found.", 404, body.code, [], body.extra);
  }
  if (init.method !== "GET" && [409, 422, 500, 502].includes(response.status)) {
    const body = await errorBody(response);
    const message = body.detail ?? (body.fieldErrors.length ? "Some details need correcting." : `The admin service returned an error (${response.status}).`);
    throw new GatewayError("unavailable", message, response.status, body.code, body.fieldErrors, body.extra);
  }
  // 503 has several causes (database, sign-in service, supplier, booking source). Show the
  // gateway's own reason so the page names the real one; fall back only when it gave none.
  if (response.status === 503) {
    const body = await errorBody(response);
    throw new GatewayError("unavailable", body.detail
      ?? options.unavailableMessage
      ?? "Booking data isn't available yet. The gateway's booking source isn't configured or can't be read.", 503, body.code, [], body.extra);
  }
  if (!response.ok) throw new GatewayError("unavailable", `The admin service returned an error (${response.status}). Data will load when it recovers.`);
  return init.accept && init.accept !== "application/json" ? response.blob() : response.json();
}

/** Absolute URL for a gateway-served asset path such as /v1/logos/{id}; null if unset. */
export function gatewayAssetUrl(path?: string | null) {
  const baseUrl = configuredBaseUrl().replace(/\/+$/, "");
  return path && path.startsWith("/v1/") && baseUrl ? `${baseUrl}${path}` : null;
}

export function gatewayGet<P extends GetPath>(path: P, query?: GetQuery<P>, options: GatewayOptions = {}): Promise<GetResponse<P>> {
  return send(path, { method: "GET", query: query as Record<string, unknown> | undefined }, options) as Promise<GetResponse<P>>;
}

/** A file from the gateway (e.g. a PDF), sent with the user's token like every other call; returned as a Blob. */
export function gatewayGetFile<P extends GetPath>(path: P, accept: string, options: GatewayOptions = {}, query?: GetQuery<P>): Promise<Blob> {
  return send(path, { method: "GET", accept, query: query as Record<string, unknown> | undefined }, options) as Promise<Blob>;
}

export function gatewayPost<P extends PostPath>(path: P, body: PostBody<P>, options: GatewayOptions = {}): Promise<PostResponse<P>> {
  return send(path, { method: "POST", body }, options) as Promise<PostResponse<P>>;
}

type PatchPath = { [P in keyof paths]: paths[P] extends { patch: unknown } ? (paths[P]["patch"] extends undefined ? never : P) : never }[keyof paths];
type PatchOp<P extends PatchPath> = NonNullable<paths[P]["patch"]>;
export type PatchBody<P extends PatchPath> = PatchOp<P> extends { requestBody: { content: { "application/json": infer B } } } ? B : never;
export type PatchResponse<P extends PatchPath> = PatchOp<P> extends { responses: { 200: { content: { "application/json": infer R } } } } ? R : never;

type DeletePath = { [P in keyof paths]: paths[P] extends { delete: unknown } ? (paths[P]["delete"] extends undefined ? never : P) : never }[keyof paths];
type DeleteOp<P extends DeletePath> = NonNullable<paths[P]["delete"]>;
export type DeleteResponse<P extends DeletePath> = DeleteOp<P> extends { responses: { 200: { content: { "application/json": infer R } } } } ? R : never;

export function gatewayPatch<P extends PatchPath>(path: P, body: PatchBody<P>, options: GatewayOptions = {}): Promise<PatchResponse<P>> {
  return send(path, { method: "PATCH", body }, options) as Promise<PatchResponse<P>>;
}

type PutPath = { [P in keyof paths]: paths[P] extends { put: unknown } ? (paths[P]["put"] extends undefined ? never : P) : never }[keyof paths];
type PutOp<P extends PutPath> = NonNullable<paths[P]["put"]>;
export type PutBody<P extends PutPath> = PutOp<P> extends { requestBody: { content: { "application/json": infer B } } } ? B : never;
export type PutResponse<P extends PutPath> = PutOp<P> extends { responses: { 200: { content: { "application/json": infer R } } } } ? R : never;

export function gatewayPut<P extends PutPath>(path: P, body: PutBody<P>, options: GatewayOptions = {}): Promise<PutResponse<P>> {
  return send(path, { method: "PUT", body }, options) as Promise<PutResponse<P>>;
}

export function gatewayDelete<P extends DeletePath>(path: P, options: GatewayOptions = {}): Promise<DeleteResponse<P>> {
  return send(path, { method: "DELETE" }, options) as Promise<DeleteResponse<P>>;
}
