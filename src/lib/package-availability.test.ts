import { describe, expect, it } from "vitest";
import { isPackageExpired } from "@/lib/package-availability";

describe("isPackageExpired", () => {
  it("keeps a package visible through its expiry date", () => {
    expect(isPackageExpired({ expiresAt: "2026-06-02" }, "2026-06-02")).toBe(false);
  });

  it("marks a package expired after its expiry date passes", () => {
    expect(isPackageExpired({ expiresAt: "2026-06-01" }, "2026-06-02")).toBe(true);
  });

  it("keeps existing packages without an expiry visible until they are edited", () => {
    expect(isPackageExpired({}, "2026-06-02")).toBe(false);
  });
});
