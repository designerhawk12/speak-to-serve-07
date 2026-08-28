export const LANGUAGE_PREFERENCE_KEY = "cpgrams:preferred-language";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "gu", label: "ગુજરાતી" },
  { code: "mr", label: "मराठी" },
  { code: "bn", label: "বাংলা" },
  { code: "te", label: "తెలుగు" },
  { code: "as", label: "অসমীয়া" },
  { code: "or", label: "ଓଡ଼ିଆ" },
  { code: "ta", label: "தமிழ்" },
  { code: "ml", label: "മലയാളം" },
  { code: "ur", label: "اردو" },
  { code: "sd", label: "سنڌي" },
  { code: "brx", label: "बड़ो" },
  { code: "kok", label: "कोंकणी" },
  { code: "ne", label: "नेपाली" },
  { code: "mni", label: "মৈতৈলোন্" },
  { code: "pa", label: "ਪੰਜਾਬੀ" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "doi", label: "डोगरी" },
  { code: "mai", label: "मैथिली" },
  { code: "ks", label: "کٲشُر" },
  { code: "sa", label: "संस्कृतम्" },
  { code: "sat", label: "ᱥᱟᱱᱛᱟᱲᱤ" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];
export type DetectedLanguage = SupportedLanguage | "und";

/**
 * The intake/translation contract supports every language above. Fixed website
 * chrome is deliberately maintained in these three reviewed display languages.
 */
export const DISPLAY_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "ta", label: "தமிழ்" },
] as const;

export type DisplayLanguage = (typeof DISPLAY_LANGUAGES)[number]["code"];

const supportedLanguageCodes = new Set<string>(
  SUPPORTED_LANGUAGES.map((language) => language.code),
);
const displayLanguageCodes = new Set<string>(DISPLAY_LANGUAGES.map((language) => language.code));

export function normalizeLanguage(value: string | null | undefined): SupportedLanguage {
  const code = value?.trim().toLowerCase().split("-")[0] ?? "";
  return supportedLanguageCodes.has(code) ? (code as SupportedLanguage) : "en";
}

export function normalizeDisplayLanguage(value: string | null | undefined): DisplayLanguage {
  const code = value?.trim().toLowerCase().split("-")[0] ?? "";
  return displayLanguageCodes.has(code) ? (code as DisplayLanguage) : "en";
}

/**
 * A deliberately conservative, client-side script detector for filing metadata.
 * It is not a translation service and does not alter the citizen's original text.
 */
export function detectOriginalLanguage(
  text: string,
  preferredLanguage?: SupportedLanguage,
): DetectedLanguage {
  if (!text.trim()) return "und";
  const preferredScriptMatches =
    preferredLanguage &&
    (
      {
        hi: /[\u0900-\u097f]/u,
        mr: /[\u0900-\u097f]/u,
        brx: /[\u0900-\u097f]/u,
        kok: /[\u0900-\u097f]/u,
        ne: /[\u0900-\u097f]/u,
        doi: /[\u0900-\u097f]/u,
        mai: /[\u0900-\u097f]/u,
        sa: /[\u0900-\u097f]/u,
        bn: /[\u0980-\u09ff]/u,
        as: /[\u0980-\u09ff]/u,
        ur: /[\u0600-\u06ff]/u,
        sd: /[\u0600-\u06ff]/u,
        ks: /[\u0600-\u06ff]/u,
      } as Partial<Record<SupportedLanguage, RegExp>>
    )[preferredLanguage]?.test(text);
  if (preferredScriptMatches) return preferredLanguage;
  if (/[\u1c50-\u1c7f]/u.test(text)) return "sat";
  if (/[\uabc0-\uabff]/u.test(text)) return "mni";
  if (/[\u0d00-\u0d7f]/u.test(text)) return "ml";
  if (/[\u0c80-\u0cff]/u.test(text)) return "kn";
  if (/[\u0c00-\u0c7f]/u.test(text)) return "te";
  if (/[\u0b80-\u0bff]/u.test(text)) return "ta";
  if (/[\u0b00-\u0b7f]/u.test(text)) return "or";
  if (/[\u0a80-\u0aff]/u.test(text)) return "gu";
  if (/[\u0a00-\u0a7f]/u.test(text)) return "pa";
  if (/[ৰৱ]/u.test(text)) return "as";
  if (/[\u0980-\u09ff]/u.test(text)) return "bn";
  if (/[\u0900-\u097f]/u.test(text)) return "hi";
  if (/[\u0600-\u06ff]/u.test(text)) return "ur";
  if (/[A-Za-z]/u.test(text)) return "en";
  return "und";
}

export function readLocalLanguagePreference(): DisplayLanguage {
  if (typeof window === "undefined") return "en";
  return normalizeDisplayLanguage(window.localStorage.getItem(LANGUAGE_PREFERENCE_KEY));
}

export function writeLocalLanguagePreference(language: DisplayLanguage): void {
  if (typeof window !== "undefined") window.localStorage.setItem(LANGUAGE_PREFERENCE_KEY, language);
}
