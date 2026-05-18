import { createContext, useContext, useState, ReactNode } from "react";
import { UserRole } from "@/data/mock";
import { getSession } from "@/lib/auth-session";
import { roleForSession } from "@/lib/role-mapping";

interface RoleContextType {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  currentUser: { name: string; email: string; agencyId?: string; agencyName?: string };
}

const roleUsers: Record<UserRole, { name: string; email: string; agencyId?: string; agencyName?: string }> = {
  super_admin: { name: "Ahmed Khan", email: "ahmed@travelian.com" },
  admin: { name: "Sara Ali", email: "sara@travelian.com" },
  staff: { name: "Omar Farooq", email: "omar@travelian.com" },
  agency_owner: { name: "Fatima Zahra", email: "fatima@alhijaz.com", agencyId: "a1", agencyName: "Al Hijaz Tours" },
  agency_staff: { name: "Hassan Raza", email: "hassan@alhijaz.com", agencyId: "a1", agencyName: "Al Hijaz Tours" },
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
  return "super_admin";
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
  const currentUser = roleUsers[currentRole];

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
