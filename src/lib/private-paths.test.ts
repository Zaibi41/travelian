import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PRIVATE_PATH_PREFIXES, isPrivatePath } from "./private-paths";

describe("private paths", () => {
  it("robots.txt disallows exactly the private prefixes", () => {
    const robots = readFileSync(resolve(process.cwd(), "public/robots.txt"), "utf8");
    const disallowed = robots.split("\n").filter(line => line.startsWith("Disallow:")).map(line => line.slice(9).trim());
    expect(disallowed).toEqual([...PRIVATE_PATH_PREFIXES]);
  });

  it("matches whole path segments only", () => {
    for (const path of ["/admin", "/admin/bookings", "/booking", "/my-bookings/view/abc", "/auth/callback", "/signin"]) expect(isPrivatePath(path)).toBe(true);
    for (const path of ["/", "/faq", "/bookings-guide", "/group-ticketing", "/flights-search", "/administrator"]) expect(isPrivatePath(path)).toBe(false);
  });
});
