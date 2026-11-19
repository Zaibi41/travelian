import { describe, expect, it } from "vitest";
import { canSwitchRoles, roleForSession } from "./role-mapping";

const session = (email: string, groups?: string[]) => ({ email, name: "T", createdAt: "", groups });

// B18 / D42: the role comes only from Cognito groups; no email or domain is hardcoded to a role.
describe("roleForSession", () => {
  it("uses the Cognito group", () => {
    expect(roleForSession(session("anyone@example.test", ["super_admin"]))).toBe("super_admin");
    expect(roleForSession(session("anyone@example.test", ["staff"]))).toBe("staff");
  });

  it("never grants a role from an email address or domain", () => {
    for (const email of ["travelian.pk@gmail.com", "someone@travelian.com", "x+qa@example.test", "owner@alhijaz.com"]) {
      expect(roleForSession(session(email))).toBe("customer");
      expect(canSwitchRoles(session(email))).toBe(false);
    }
    expect(roleForSession(null)).toBeNull();
  });
});
