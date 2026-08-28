import { supabase } from "@/integrations/supabase/client";
import {
  detectOriginalLanguage,
  normalizeLanguage,
  SUPPORTED_LANGUAGES,
  type DetectedLanguage,
  type SupportedLanguage,
} from "./language";

export interface TranslationRequest {
  text: string;
  sourceLanguage: DetectedLanguage;
  targetLanguage: SupportedLanguage;
  contentType: "message" | "resolution" | "clarification" | "grievance";
}

export interface TranslationGateway {
  translate(request: TranslationRequest): Promise<{ translatedText: string; provider: string }>;
}

export interface TranslationDisplay {
  text: string;
  originalText: string;
  sourceLanguage: DetectedLanguage;
  targetLanguage: SupportedLanguage;
  translated: boolean;
  provider: string | null;
}

class TranslationUnavailableError extends Error {
  constructor() {
    super("Translation is not configured.");
  }
}

const translationEndpoint = import.meta.env["VITE_TRANSLATION_EDGE_FUNCTION"]?.trim();
const translationCache = new Map<string, TranslationDisplay>();
const MAX_CACHE_ENTRIES = 100;
const supportedSourceLanguages = new Set<string>(
  SUPPORTED_LANGUAGES.map((language) => language.code),
);

function cacheKey(request: TranslationRequest): string {
  return `${request.contentType}:${request.sourceLanguage}:${request.targetLanguage}:${request.text}`;
}

/**
 * The browser knows only a server endpoint name. Any provider credential and
 * provider-specific call must remain in that server endpoint, never in React.
 */
export const serverTranslationGateway: TranslationGateway = {
  async translate(request) {
    if (!translationEndpoint) throw new TranslationUnavailableError();
    const { data, error } = await supabase.functions.invoke(translationEndpoint, {
      body: {
        text: request.text,
        source_language: request.sourceLanguage,
        target_language: request.targetLanguage,
        content_type: request.contentType,
      },
    });
    if (
      error ||
      !data ||
      typeof data.translated_text !== "string" ||
      !data.translated_text.trim()
    ) {
      throw new TranslationUnavailableError();
    }
    return {
      translatedText: data.translated_text,
      provider: typeof data.provider === "string" ? data.provider : "server",
    };
  },
};

export async function translateForDisplay(
  input: Omit<TranslationRequest, "sourceLanguage"> & { sourceLanguage?: string | null },
  gateway: TranslationGateway = serverTranslationGateway,
): Promise<TranslationDisplay> {
  const suppliedSourceLanguage = input.sourceLanguage?.trim().toLowerCase().split("-")[0];
  const sourceLanguage: DetectedLanguage = !suppliedSourceLanguage
    ? detectOriginalLanguage(input.text)
    : suppliedSourceLanguage === "und"
      ? "und"
      : supportedSourceLanguages.has(suppliedSourceLanguage)
        ? (suppliedSourceLanguage as SupportedLanguage)
        : "und";
  const targetLanguage = normalizeLanguage(input.targetLanguage);
  const original: TranslationDisplay = {
    text: input.text,
    originalText: input.text,
    sourceLanguage,
    targetLanguage,
    translated: false,
    provider: null,
  };
  if (!input.text.trim() || sourceLanguage === "und" || sourceLanguage === targetLanguage)
    return original;

  const request: TranslationRequest = { ...input, sourceLanguage, targetLanguage };
  const key = cacheKey(request);
  const cached = translationCache.get(key);
  if (cached) return cached;

  try {
    const result = await gateway.translate(request);
    const display: TranslationDisplay = {
      ...original,
      text: result.translatedText,
      translated: true,
      provider: result.provider,
    };
    if (translationCache.size >= MAX_CACHE_ENTRIES)
      translationCache.delete(translationCache.keys().next().value!);
    translationCache.set(key, display);
    return display;
  } catch {
    return original;
  }
}

export function translatedTextForView(display: TranslationDisplay, showOriginal: boolean): string {
  return display.translated && !showOriginal ? display.text : display.originalText;
}

export function clearTranslationCacheForTests(): void {
  translationCache.clear();
}
