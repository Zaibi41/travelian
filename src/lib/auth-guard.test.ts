import { describe, expect, it } from "vitest";
import { safeReturnPath, sessionState, signInUrl } from "./auth-guard";

const session = (expiresAt?: number) => ({ email: "test@example.invalid", name: "Test", createdAt: "2026-11-10T00:00:00Z", accessToken: "t", expiresAt });

describe("session state", () => {
  it("none, expired or valid", () => {
    expect(sessionState(null)).toBe("none");
    expect(sessionState(session(1_000), 2_000)).toBe("expired");
    expect(sessionState(session(2_000), 2_000)).toBe("expired");
    expect(sessionState(session(3_000), 2_000)).toBe("valid");
    expect(sessionState(session(undefined), 2_000)).toBe("valid");
  });
});

describe("safe return path", () => {
  it("accepts relative paths inside /admin, with query and hash", () => {
    expect(safeReturnPath("/admin")).toBe("/admin");
    expect(safeReturnPath("/admin/customers")).toBe("/admin/customers");
    expect(safeReturnPath("/admin/customers?q=khan#top")).toBe("/admin/customers?q=khan#top");
  });

  it.each([
    ["an external URL", "https://evil.example/admin"],
    ["a protocol-relative URL", "//evil.example/admin"],
    ["javascript:", "javascript:alert(1)"],
    ["a backslash trick", "/\\evil.example/admin"],
    ["a path outside /admin", "/signin"],
    ["a look-alike prefix", "/administrator"],
    ["a traversal out of /admin", "/admin/../signin"],
    ["an encoded newline", "/admin\n//evil.example"],
    ["empty", ""],
    ["missing", null],
  ])("refuses %s", (_label, value) => {
    expect(safeReturnPath(value)).toBeNull();
  });
});

describe("sign-in URL", () => {
  it("remembers a safe page and the expired reason", () => {
    expect(signInUrl("/admin/customers?q=khan")).toBe("/signin?redirect=%2Fadmin%2Fcustomers%3Fq%3Dkhan");
    expect(signInUrl("/admin/customers", true)).toBe("/signin?redirect=%2Fadmin%2Fcustomers&reason=expired");
    expect(signInUrl("//evil.example")).toBe("/signin");
  });
});
