/**
 * Role-aware session placeholder.
 *
 * NOT production permissions. Supabase auth + RLS will replace the store here,
 * while the `useSession` / `RoleGuard` surface stays the same.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { UserRole } from "./types";

export interface SessionUser {
  id: string;
  name: string;
  role: UserRole;
  officeLabel?: string;
}

interface SessionValue {
  user: SessionUser | null;
  /** Demo-only: lets the shell render role sections before auth exists. */
  setRole: (role: UserRole) => void;
  signOut: () => void;
}

const DEMO_USERS: Record<Exclude<UserRole, "public">, SessionUser> = {
  citizen: { id: "demo-citizen", name: "Citizen (demo)", role: "citizen" },
  officer: {
    id: "demo-officer",
    name: "Officer (demo)",
    role: "officer",
    officeLabel: "Department of Posts",
  },
  nodal: {
    id: "demo-nodal",
    name: "Nodal Supervisor (demo)",
    role: "nodal",
    officeLabel: "Ministry of Communications",
  },
  appellate: {
    id: "demo-appellate",
    name: "Appellate Authority (demo)",
    role: "appellate",
    officeLabel: "Appellate Cell",
  },
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(DEMO_USERS.citizen);

  const value = useMemo<SessionValue>(
    () => ({
      user,
      setRole: (role) => setUser(role === "public" ? null : DEMO_USERS[role]),
      signOut: () => setUser(null),
    }),
    [user],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  public: "Visitor",
  citizen: "Citizen",
  officer: "Government Officer",
  nodal: "Nodal / Supervisor",
  appellate: "Appellate Authority",
};
