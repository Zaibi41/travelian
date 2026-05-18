import type { UserRole } from "@/data/mock";
import type { AuthSession } from "@/lib/auth-session";

const ROLE_GROUPS: UserRole[] = ["super_admin", "admin", "staff", "agency_owner", "agency_staff"];

export function roleForEmail(email: string): UserRole | null {
  const normalized = email.trim().toLowerCase();
  if (normalized === "travelian.pk@gmail.com" || normalized.endsWith("@travelian.com")) return "super_admin";
  if (normalized.includes("alhijaz.com") || normalized.includes("safartours.com") || normalized.includes("noortravel.com")) return "agency_owner";
  return null;
}

export function roleForSession(session: AuthSession | null): UserRole | null {
  if (!session) return null;
  const groupRole = ROLE_GROUPS.find((role) => session.groups?.includes(role));
  return groupRole || roleForEmail(session.email);
}
