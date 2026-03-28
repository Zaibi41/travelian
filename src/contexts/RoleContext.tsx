import { createContext, useContext, useState, ReactNode } from "react";
import { UserRole } from "@/data/mock";

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

export function RoleProvider({ children }: { children: ReactNode }) {
  const [currentRole, setCurrentRole] = useState<UserRole>("super_admin");
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
