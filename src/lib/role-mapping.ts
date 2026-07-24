import type { UserRole } from "@/data/models";
import type { AuthSession } from "@/lib/auth-session";

const ROLE_GROUPS: UserRole[] = ["super_admin", "admin", "staff", "agency_owner", "agency_staff", "customer", "qa", "internal_support"];
const ADMIN_PORTAL_ROLES: UserRole[] = ["super_admin", "admin", "staff", "agency_owner", "agency_staff", "qa", "internal_support"];
const ACCOUNT_ROLE_STORAGE_KEY = "travelian.account.roles.v1";

type StoredAccountRoles = Record<string, UserRole>;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function readStoredAccountRoles(): StoredAccountRoles {
  try {
    if (typeof localStorage === "undefined") return {};
    const raw = localStorage.getItem(ACCOUNT_ROLE_STORAGE_KEY);
    return raw ? JSON.parse(raw) as StoredAccountRoles : {};
  } catch {
    return {};
  }
}

export function rememberAccountRole(email: string, role: UserRole) {
  const normalized = normalizeEmail(email);
  if (!normalized || !ROLE_GROUPS.includes(role)) return;
  try {
    const stored = readStoredAccountRoles();
    localStorage.setItem(ACCOUNT_ROLE_STORAGE_KEY, JSON.stringify({ ...stored, [normalized]: role }));
  } catch {
    // Registration still succeeds if local storage is unavailable.
  }
}

export function accountRoleForEmail(email: string): UserRole | null {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  return readStoredAccountRoles()[normalized] || null;
}

export function roleForEmail(email: string): UserRole | null {
  const normalized = normalizeEmail(email);
  if (normalized === "travelian.pk@gmail.com" || normalized.endsWith("@travelian.com")) return "super_admin";
  if (normalized.includes("+qa@") || normalized.endsWith("@travelian-qa.local")) return "qa";
  if (normalized.includes("+support@") || normalized.endsWith("@travelian-support.local")) return "internal_support";
  const storedRole = accountRoleForEmail(normalized);
  if (storedRole) return storedRole;
  if (normalized.includes("alhijaz.com") || normalized.includes("safartours.com") || normalized.includes("noortravel.com")) return "agency_owner";
  return "customer";
}

export function roleForSession(session: AuthSession | null): UserRole | null {
  if (!session) return null;
  const groupRole = ROLE_GROUPS.find((role) => session.groups?.includes(role));
  return groupRole || roleForEmail(session.email);
}

export function isAdminPortalRole(role: UserRole | null | undefined) {
  return !!role && ADMIN_PORTAL_ROLES.includes(role);
}

export function canSwitchRoles(session: AuthSession | null, role: UserRole) {
  if (role === "super_admin" || role === "qa" || role === "internal_support") return true;
  const email = session?.email?.trim().toLowerCase() || "";
  return session?.groups?.some((group) => ["super_admin", "qa", "internal_support"].includes(group)) ||
    email === "travelian.pk@gmail.com" ||
    email.endsWith("@travelian.com") ||
    email.includes("+qa@") ||
    email.includes("+support@");
}
