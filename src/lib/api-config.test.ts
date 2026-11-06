import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("backend configuration", () => {
  it("uses the configured environment URL and removes trailing slashes", async () => {
    vi.stubEnv("VITE_TRAVELIAN_API_BASE_URL", " https://staging.example.test/// ");
    vi.resetModules();
    const { API_BASE_URL } = await import("./api-config");
    expect(API_BASE_URL).toBe("https://staging.example.test");
  });

  it.each([undefined, "", "   "])("rejects missing or blank configuration: %s", async (value) => {
    vi.stubEnv("VITE_TRAVELIAN_API_BASE_URL", value);
    vi.resetModules();
    await expect(import("./api-config")).rejects.toThrow("Missing required environment variable");
  });
});
