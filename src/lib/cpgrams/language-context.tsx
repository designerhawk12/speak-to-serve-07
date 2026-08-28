import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  normalizeLanguage,
  readLocalLanguagePreference,
  type SupportedLanguage,
  writeLocalLanguagePreference,
} from "./language";
import { useSession } from "./session";

interface LanguageValue {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => Promise<void>;
}

const LanguageContext = createContext<LanguageValue | null>(null);

/**
 * Keeps a harmless browser preference for visitors and mirrors the preference
 * to the authenticated user's existing profile field. It intentionally has no
 * relationship to grievance-draft storage or case lifecycle state.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user, updatePreferredLanguage } = useSession();
  const [language, setLanguageState] = useState<SupportedLanguage>("en");
  const userId = user?.id;
  const preferredLanguage = user?.preferredLanguage;

  useEffect(() => {
    setLanguageState(userId ? normalizeLanguage(preferredLanguage) : readLocalLanguagePreference());
  }, [preferredLanguage, userId]);

  const setLanguage = useCallback(
    async (nextLanguage: SupportedLanguage) => {
      setLanguageState(nextLanguage);
      writeLocalLanguagePreference(nextLanguage);
      if (user) await updatePreferredLanguage(nextLanguage);
    },
    [updatePreferredLanguage, user],
  );

  const value = useMemo<LanguageValue>(() => ({ language, setLanguage }), [language, setLanguage]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
