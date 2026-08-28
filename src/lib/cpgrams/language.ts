export const LANGUAGE_PREFERENCE_KEY = "cpgrams:preferred-language";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "ta", label: "தமிழ்" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];
export type DetectedLanguage = SupportedLanguage | "und";

const supportedLanguageCodes = new Set<string>(
  SUPPORTED_LANGUAGES.map((language) => language.code),
);

export function normalizeLanguage(value: string | null | undefined): SupportedLanguage {
  const code = value?.trim().toLowerCase().split("-")[0] ?? "";
  return supportedLanguageCodes.has(code) ? (code as SupportedLanguage) : "en";
}

/**
 * A deliberately conservative, client-side script detector for filing metadata.
 * It is not a translation service and does not alter the citizen's original text.
 */
export function detectOriginalLanguage(text: string): DetectedLanguage {
  if (!text.trim()) return "und";
  if (/[^\u0900-\u097f]*[\u0900-\u097f]/u.test(text)) return "hi";
  if (/[^\u0b80-\u0bff]*[\u0b80-\u0bff]/u.test(text)) return "ta";
  if (/[A-Za-z]/u.test(text)) return "en";
  return "und";
}

export function readLocalLanguagePreference(): SupportedLanguage {
  if (typeof window === "undefined") return "en";
  return normalizeLanguage(window.localStorage.getItem(LANGUAGE_PREFERENCE_KEY));
}

export function writeLocalLanguagePreference(language: SupportedLanguage): void {
  if (typeof window !== "undefined") window.localStorage.setItem(LANGUAGE_PREFERENCE_KEY, language);
}
