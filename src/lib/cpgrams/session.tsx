import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { UserRole } from "./types";
import { shouldLoadProfileForSession } from "./auth-workflows";

export type AppRole = Database["public"]["Enums"]["app_role"];

export interface SessionUser {
  id: string;
  name: string;
  email: string | null;
  role: AppRole;
  officeLabel?: string;
}

export type ProfileState = "loading" | "ready" | "missing" | "error";

interface SessionValue {
  session: Session | null;
  user: SessionUser | null;
  profileState: ProfileState;
  isLoading: boolean;
  refreshProfile: (authUser?: User) => Promise<SessionUser | null>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

function profileToSessionUser(profile: Database["public"]["Tables"]["profiles"]["Row"]): SessionUser {
  const sessionUser: SessionUser = {
    id: profile.id,
    name: profile.full_name || profile.email || "Account holder",
    email: profile.email,
    role: profile.role,
  };
  if (profile.designation) sessionUser.officeLabel = profile.designation;
  return sessionUser;
}

/**
 * Owns the browser Supabase session and the matching RLS-protected profile.
 * Authorization always uses `profiles.role`; user metadata is never trusted for roles.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [profileState, setProfileState] = useState<ProfileState>("loading");
  const [isLoading, setIsLoading] = useState(true);
  const profileRequest = useRef(0);

  const refreshProfile = useCallback(async (authUser?: User): Promise<SessionUser | null> => {
    const requestId = ++profileRequest.current;

    if (!authUser) {
      setUser(null);
      setProfileState("missing");
      return null;
    }

    setProfileState("loading");
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, organization_id, designation, preferred_language, created_at, updated_at, phone")
      .eq("id", authUser.id)
      .maybeSingle();

    if (error) {
      if (requestId !== profileRequest.current) return null;
      console.error("[Auth] Unable to load the signed-in profile.", error);
      setUser(null);
      setProfileState("error");
      return null;
    }

    if (!data) {
      if (requestId !== profileRequest.current) return null;
      setUser(null);
      setProfileState("missing");
      return null;
    }

    const profile = profileToSessionUser(data);
    if (requestId !== profileRequest.current) return profile;
    setUser(profile);
    setProfileState("ready");
    return profile;
  }, []);

  const applySession = useCallback(
    (nextSession: Session | null) => {
      setSession(nextSession);
      if (!shouldLoadProfileForSession(nextSession)) {
        profileRequest.current += 1;
        setUser(null);
        setProfileState("missing");
        setIsLoading(false);
        return;
      }

      // Keep Supabase auth callbacks synchronous; querying in the callback can deadlock the client.
      window.setTimeout(() => {
        void refreshProfile(nextSession.user).finally(() => setIsLoading(false));
      }, 0);
    },
    [refreshProfile],
  );

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) console.error("[Auth] Unable to restore the session.", error);
      applySession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      applySession(nextSession);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [applySession]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    applySession(null);
  }, [applySession]);

  const value = useMemo<SessionValue>(
    () => ({ session, user, profileState, isLoading, refreshProfile, signOut }),
    [session, user, profileState, isLoading, refreshProfile, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/** @deprecated Use AuthProvider in new code. */
export const SessionProvider = AuthProvider;

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <AuthProvider>");
  return ctx;
}

type RoleLabel = UserRole | AppRole;

export const ROLE_LABELS: Record<RoleLabel, string> = {
  public: "Visitor",
  citizen: "Citizen",
  officer: "Government Officer",
  gro: "Government Officer",
  nodal: "Nodal / Supervisor",
  appellate: "Appellate Authority",
  platform_admin: "Platform administrator",
};
