import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/cpgrams/language-context";
import {
  translateForDisplay,
  translatedTextForView,
  type TranslationGateway,
} from "@/lib/cpgrams/translation";

export function TranslatedText({
  text,
  sourceLanguage,
  contentType,
  gateway,
  className,
}: {
  text: string;
  sourceLanguage?: string | null;
  contentType: "message" | "resolution" | "clarification" | "grievance";
  gateway?: TranslationGateway;
  className?: string;
}) {
  const { language } = useLanguage();
  const [showOriginal, setShowOriginal] = useState(false);
  const translation = useQuery({
    queryKey: ["cpgrams", "translation", contentType, sourceLanguage ?? "detected", language, text],
    queryFn: () =>
      translateForDisplay(
        {
          text,
          ...(sourceLanguage === undefined ? {} : { sourceLanguage }),
          targetLanguage: language,
          contentType,
        },
        gateway,
      ),
    staleTime: Infinity,
  });
  const display = translation.data;
  const renderedText = display ? translatedTextForView(display, showOriginal) : text;

  return (
    <div className={className}>
      <p className="whitespace-pre-line">{renderedText}</p>
      {display?.translated && (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="mt-1 h-auto px-0 text-xs"
          onClick={() => setShowOriginal((current) => !current)}
        >
          {showOriginal ? "View translated text" : "View original text"}
        </Button>
      )}
    </div>
  );
}
