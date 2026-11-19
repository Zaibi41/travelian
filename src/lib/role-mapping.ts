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

// B18 / D42: the role comes only from the signed-in user's Cognito groups (the same token the gateway checks). No email
// address, domain or browser-saved value ever grants a role here; the gateway decides what each role may see and do.
export function roleForSession(session: AuthSession | null): UserRole | null {
  if (!session) return null;
  return ROLE_GROUPS.find((role) => session.groups?.includes(role)) || "customer";
}

export function isAdminPortalRole(role: UserRole | null | undefined) {
  return !!role && ADMIN_PORTAL_ROLES.includes(role);
}

export function canSwitchRoles(session: AuthSession | null, _role?: UserRole) {
  return Boolean(session?.groups?.some((group) => ["super_admin", "qa", "internal_support"].includes(group)));
}

