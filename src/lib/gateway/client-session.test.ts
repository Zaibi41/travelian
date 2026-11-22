import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const renewSession = vi.fn();
const expireSession = vi.fn();
vi.mock("@/lib/session-renewal", () => ({ renewSession: () => renewSession(), expireSession: () => expireSession() }));
vi.mock("@/lib/auth-session", () => ({ getSession: () => ({ email: "test@example.invalid", name: "Test", createdAt: "", accessToken: token }) }));

let token = "old-token";
import { GatewayError, gatewayGet, gatewayPost } from "./client";

const reply = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const options = (fetchImpl: ReturnType<typeof vi.fn>) => ({ baseUrl: "https://gateway.test", fetchImpl: fetchImpl as unknown as typeof fetch });

beforeEach(() => {
  token = "old-token";
  renewSession.mockReset();
  expireSession.mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe("401 from the gateway", () => {
  it("a read refreshes once and is sent again with the new token", async () => {
    renewSession.mockImplementation(async () => {
      token = "new-token";
      return true;
    });
    const fetchImpl = vi.fn().mockResolvedValueOnce(reply(401)).mockResolvedValueOnce(reply(200, { results: [] }));
    await expect(gatewayGet("/v1/admin/customers", { q: "khan" }, options(fetchImpl))).resolves.toEqual({ results: [] });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[1][1].headers.Authorization).toBe("Bearer new-token");
    expect(renewSession).toHaveBeenCalledTimes(1);
    expect(expireSession).not.toHaveBeenCalled();
  });

  it("an action (hold, payment, ticketing) is never sent again, even after a successful refresh", async () => {
    renewSession.mockResolvedValue(true);
    const fetchImpl = vi.fn().mockResolvedValue(reply(401));
    const error = await gatewayPost("/v1/live-ticketing/flights/bookings", {} as never, options(fetchImpl)).catch(e => e);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(error).toBeInstanceOf(GatewayError);
    expect([error.kind, error.code]).toEqual(["unauthorized", "session_renewed"]);
  });

  it("when the refresh fails the session is cleared and the error says to sign in again", async () => {
    renewSession.mockResolvedValue(false);
    const fetchImpl = vi.fn().mockResolvedValue(reply(401));
    const error = await gatewayGet("/v1/admin/customers", { q: "khan" }, options(fetchImpl)).catch(e => e);
    expect(error.message).toBe("Your session expired. Sign in again.");
    expect(expireSession).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("a second 401 after the refresh is not refreshed again", async () => {
    renewSession.mockResolvedValue(true);
    const fetchImpl = vi.fn().mockResolvedValue(reply(401));
    await gatewayGet("/v1/admin/customers", { q: "khan" }, options(fetchImpl)).catch(() => undefined);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(renewSession).toHaveBeenCalledTimes(1);
    expect(expireSession).toHaveBeenCalledTimes(1);
  });

  it("403 stays a no-access error and never touches the session", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(reply(403, { detail: "No." }));
    const error = await gatewayGet("/v1/admin/customers", { q: "khan" }, options(fetchImpl)).catch(e => e);
    expect(error.kind).toBe("forbidden");
    expect(renewSession).not.toHaveBeenCalled();
    expect(expireSession).not.toHaveBeenCalled();
  });
});

describe("409 from the gateway", () => {
  it("a refused double booking (issue #17) carries the gateway's sentence with the existing booking reference, and its code", async () => {
    const sentence = "Ali Raza already has booking TRV-OLD111 on KHI → ISB on 10 Dec 2026. A second booking for the same passenger, route and date isn't allowed. Nothing was booked.";
    const fetchImpl = vi.fn().mockResolvedValue(reply(409, { detail: sentence, code: "duplicate_booking" }));
    const error = await gatewayPost("/v1/live-ticketing/flights/bookings", {} as never, options(fetchImpl)).catch(e => e);
    expect(error).toBeInstanceOf(GatewayError);
    expect([error.status, error.code, error.message]).toEqual([409, "duplicate_booking", sentence]);
    expect(fetchImpl).toHaveBeenCalledTimes(1); // never sent again
  });
});
