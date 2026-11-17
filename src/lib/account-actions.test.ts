import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSession, setSession } from "./auth-session";
const fakeSession = () => ({ email: "test@example.invalid", name: "Original Name", provider: "Cognito", accessToken: "test-token", createdAt: new Date().toISOString(), expiresAt: Date.now() + 60000 });
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("VITE_COGNITO_REGION", "us-east-1");
  vi.stubEnv("VITE_COGNITO_USER_POOL_ID", "us-east-1_test");
  vi.stubEnv("VITE_COGNITO_CLIENT_ID", "test-client");
  vi.stubEnv("VITE_COGNITO_DOMAIN", "https://auth.example.invalid");
  localStorage.clear();
  setSession(fakeSession());
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("Cognito profile actions", () => {
  it("saves the name remotely before updating the session cache", async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", request);
    const { updateAccountName } = await import("./cognito-auth");
    await updateAccountName("  Updated Name  ");
    expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({ AccessToken: "test-token", UserAttributes: [{ Name: "name", Value: "Updated Name" }] });
    expect(getSession()?.name).toBe("Updated Name");
  });
  it("does not claim a failed name update was saved", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ message: "Update denied" }) }));
    const { updateAccountName } = await import("./cognito-auth");
    await expect(updateAccountName("Updated Name")).rejects.toThrow("Update denied");
    expect(getSession()?.name).toBe("Original Name");
  });
  it("rejects expired sessions without making a request", async () => {
    setSession({ ...fakeSession(), expiresAt: Date.now() - 1 });
    const request = vi.fn(); vi.stubGlobal("fetch", request);
    const { changeAccountPassword } = await import("./cognito-auth");
    await expect(changeAccountPassword("old-test-password", "new-test-password")).rejects.toThrow("sign in again");
    expect(request).not.toHaveBeenCalled();
  });
  it("sends a password change to Cognito without storing passwords", async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }); vi.stubGlobal("fetch", request);
    const before = localStorage.getItem("travelian.session.v1");
    const { changeAccountPassword } = await import("./cognito-auth");
    await changeAccountPassword("old-test-password", "new-test-password");
    expect(request.mock.calls[0][1].headers["X-Amz-Target"]).toContain("ChangePassword");
    expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({ AccessToken: "test-token", PreviousPassword: "old-test-password", ProposedPassword: "new-test-password" });
    expect(localStorage.getItem("travelian.session.v1")).toBe(before);
  });
  it("does not overwrite another session after a delayed profile update", async () => {
    let resolve!: (response: unknown) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise(done => { resolve = done; })));
    const { updateAccountName } = await import("./cognito-auth");
    const pending = updateAccountName("Updated Name");
    setSession({ ...fakeSession(), email: "other@example.invalid", name: "Other User", accessToken: "other-test-token" });
    resolve({ ok: true, json: async () => ({}) });
    await pending;
    expect(getSession()?.name).toBe("Other User");
  });
});
