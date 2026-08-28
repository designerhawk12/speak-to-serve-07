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
  normalizeDisplayLanguage,
  readLocalLanguagePreference,
  type DisplayLanguage,
  writeLocalLanguagePreference,
} from "./language";
import { useSession } from "./session";
import { translateUiMessage, type UiMessageKey, type UiMessageValues } from "./ui-messages";

interface LanguageValue {
  language: DisplayLanguage;
  setLanguage: (language: DisplayLanguage) => Promise<void>;
  t: (key: UiMessageKey, values?: UiMessageValues) => string;
}

const LanguageContext = createContext<LanguageValue | null>(null);

/**
 * Keeps a harmless browser preference for visitors and mirrors the preference
 * to the authenticated user's existing profile field. It intentionally has no
 * relationship to grievance-draft storage or case lifecycle state.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user, updatePreferredLanguage } = useSession();
  const [language, setLanguageState] = useState<DisplayLanguage>("en");
  const userId = user?.id;
  const preferredLanguage = user?.preferredLanguage;

  useEffect(() => {
    setLanguageState(
      userId ? normalizeDisplayLanguage(preferredLanguage) : readLocalLanguagePreference(),
    );
  }, [preferredLanguage, userId]);

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback(
    async (nextLanguage: DisplayLanguage) => {
      setLanguageState(nextLanguage);
      writeLocalLanguagePreference(nextLanguage);
      if (user) await updatePreferredLanguage(nextLanguage);
    },
    [updatePreferredLanguage, user],
  );

  const t = useCallback(
    (key: UiMessageKey, values?: UiMessageValues) => translateUiMessage(language, key, values),
    [language],
  );
  const value = useMemo<LanguageValue>(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t],
  );
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
