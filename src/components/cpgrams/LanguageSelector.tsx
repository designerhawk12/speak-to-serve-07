import { Languages } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/lib/cpgrams/language-context";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/cpgrams/language";

/** Shared, non-destructive display-language control for every application shell. */
export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const [saveError, setSaveError] = useState<string | null>(null);
  return (
    <div className="relative">
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Languages className="size-4" aria-hidden />
        <span className="sr-only">Display language</span>
        <select
          className="focus-ring h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
          value={language}
          aria-label="Display language"
          onChange={(event) => {
            setSaveError(null);
            void setLanguage(event.target.value as SupportedLanguage).catch(() => {
              setSaveError(
                "Language is saved on this device but could not be saved to your profile.",
              );
            });
          }}
        >
          {SUPPORTED_LANGUAGES.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {saveError && (
        <span className="sr-only" role="status">
          {saveError}
        </span>
      )}
    </div>
  );
}
