import { Languages } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/lib/cpgrams/language-context";
import { DISPLAY_LANGUAGES, type DisplayLanguage } from "@/lib/cpgrams/language";

/** Shared, non-destructive display-language control for every application shell. */
export function LanguageSelector() {
  const { language, setLanguage, t } = useLanguage();
  const [saveError, setSaveError] = useState<string | null>(null);
  return (
    <div className="relative">
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Languages className="size-4" aria-hidden />
        <span className="sr-only">{t("language.display")}</span>
        <select
          className="focus-ring h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
          value={language}
          aria-label={t("language.display")}
          onChange={(event) => {
            setSaveError(null);
            void setLanguage(event.target.value as DisplayLanguage).catch(() => {
              setSaveError(t("language.saveError"));
            });
          }}
        >
          {DISPLAY_LANGUAGES.map((option) => (
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
