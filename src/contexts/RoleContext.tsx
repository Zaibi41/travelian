import { createContext, useContext, useState, ReactNode } from "react";
import { UserRole } from "@/data/models";
import { getSession } from "@/lib/auth-session";
import { roleForSession } from "@/lib/role-mapping";

interface RoleContextType {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  currentUser: { name: string; email: string; agencyId?: string; agencyName?: string };
}

const roleUsers: Record<UserRole, { name: string; email: string; agencyId?: string; agencyName?: string }> = {
  super_admin: { name: "Super Admin", email: "" },
  admin: { name: "Admin", email: "" },
  staff: { name: "Staff", email: "" },
  agency_owner: { name: "Agency Owner", email: "" },
  agency_staff: { name: "Agency Staff", email: "" },
  customer: { name: "Customer", email: "" },
  qa: { name: "QA", email: "" },
  internal_support: { name: "Internal Support", email: "" },
};

const RoleContext = createContext<RoleContextType | undefined>(undefined);
const ROLE_STORAGE_KEY = "travelian.admin.role.v1";

function getInitialRole(): UserRole {
  try {
    const sessionRole = roleForSession(getSession());
    if (sessionRole) return sessionRole;
    const stored = localStorage.getItem(ROLE_STORAGE_KEY) as UserRole | null;
    if (stored && stored in roleUsers) return stored;
  } catch {
    // localStorage can be unavailable in non-browser rendering.
  }
  return "customer";
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const [currentRoleState, setCurrentRoleState] = useState<UserRole>(getInitialRole);
  const setCurrentRole = (role: UserRole) => {
    setCurrentRoleState(role);
    try {
      localStorage.setItem(ROLE_STORAGE_KEY, role);
    } catch {
      // Ignore storage failures and keep the in-memory role.
    }
  };
  const currentRole = currentRoleState;
  const session = getSession();
  const fallbackUser = roleUsers[currentRole];
  const currentUser = session
    ? { ...fallbackUser, name: session.name || fallbackUser.name, email: session.email || fallbackUser.email }
    : fallbackUser;

  return (
    <RoleContext.Provider value={{ currentRole, setCurrentRole, currentUser }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
