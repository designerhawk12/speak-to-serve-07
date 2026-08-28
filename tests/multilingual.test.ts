import { afterEach, expect, test } from "bun:test";
import {
  detectOriginalLanguage,
  LANGUAGE_PREFERENCE_KEY,
  readLocalLanguagePreference,
  writeLocalLanguagePreference,
} from "../src/lib/cpgrams/language";
import { createNewGrievanceDraft } from "../src/lib/cpgrams/grievance-draft";
import {
  clearTranslationCacheForTests,
  translateForDisplay,
  translatedTextForView,
  type TranslationGateway,
} from "../src/lib/cpgrams/translation";

const localValues = new Map<string, string>();

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: {
      getItem: (key: string) => localValues.get(key) ?? null,
      setItem: (key: string, value: string) => localValues.set(key, value),
    },
  },
});

afterEach(() => {
  localValues.clear();
  clearTranslationCacheForTests();
});

test("persists the safe visitor language preference", () => {
  writeLocalLanguagePreference("hi");
  expect(localValues.get(LANGUAGE_PREFERENCE_KEY)).toBe("hi");
  expect(readLocalLanguagePreference()).toBe("hi");
});

test("detects and preserves English, Hindi, and Tamil filing text", () => {
  const english = "Streetlight outside my home has not worked for three weeks.";
  const hindi = "मेरे घर के बाहर स्ट्रीटलाइट तीन सप्ताह से खराब है।";
  const tamil = "என் வீட்டிற்கு வெளியே உள்ள தெருவிளக்கு மூன்று வாரங்களாக வேலை செய்யவில்லை.";
  expect(detectOriginalLanguage(english)).toBe("en");
  expect(detectOriginalLanguage(hindi)).toBe("hi");
  expect(detectOriginalLanguage(tamil)).toBe("ta");
  expect(hindi).toContain("स्ट्रीटलाइट");
  expect(tamil).toContain("தெருவிளக்கு");
});

test("keeps Unicode grievance, outcome, and clarification text unchanged in the draft contract", () => {
  const draft = createNewGrievanceDraft();
  const hindiGrievance = "पेंशन भुगतान में देरी हो रही है।";
  const tamilOutcome = "நிலுவையில் உள்ள ஓய்வூதியத்தை வழங்கவும்.";
  const hindiClarification = "मेरी पेंशन भुगतान आदेश संख्या संलग्न है।";
  expect({ ...draft, problem: hindiGrievance, requestedOutcome: tamilOutcome }).toEqual({
    ...draft,
    problem: hindiGrievance,
    requestedOutcome: tamilOutcome,
  });
  expect(hindiClarification).toBe("मेरी पेंशन भुगतान आदेश संख्या संलग्न है।");
});

test("uses a server translation result for a citizen display and preserves an original toggle", async () => {
  let calls = 0;
  const gateway: TranslationGateway = {
    async translate() {
      calls += 1;
      return { translatedText: "कार्रवाई पूरी कर दी गई है।", provider: "test-server" };
    },
  };
  const request = {
    text: "The repair work has been completed.",
    sourceLanguage: "en",
    targetLanguage: "hi" as const,
    contentType: "resolution" as const,
  };
  const display = await translateForDisplay(request, gateway);
  expect(display.translated).toBe(true);
  expect(translatedTextForView(display, false)).toBe("कार्रवाई पूरी कर दी गई है।");
  expect(translatedTextForView(display, true)).toBe(request.text);
  await translateForDisplay(request, gateway);
  expect(calls).toBe(1);
});

test("shows the original authoritative text when the translation service is unavailable", async () => {
  const display = await translateForDisplay(
    {
      text: "The repair work has been completed.",
      sourceLanguage: "en",
      targetLanguage: "hi",
      contentType: "message",
    },
    {
      async translate() {
        throw new Error("server unavailable");
      },
    },
  );
  expect(display.translated).toBe(false);
  expect(display.text).toBe("The repair work has been completed.");
});

test("does not guess a translation source for an unknown filing language", async () => {
  let called = false;
  const display = await translateForDisplay(
    {
      text: "एक परीक्षण",
      sourceLanguage: "und",
      targetLanguage: "ta",
      contentType: "grievance",
    },
    {
      async translate() {
        called = true;
        return { translatedText: "சோதனை", provider: "test-server" };
      },
    },
  );
  expect(called).toBe(false);
  expect(display.translated).toBe(false);
  expect(display.text).toBe("एक परीक्षण");
});

test("changing language does not mutate or reset a saved grievance draft", () => {
  const draft = {
    ...createNewGrievanceDraft(),
    problem: "मेरी शिकायत",
    requestedOutcome: "समाधान चाहिए",
    currentStep: 4,
  };
  writeLocalLanguagePreference("ta");
  expect(readLocalLanguagePreference()).toBe("ta");
  expect(draft.problem).toBe("मेरी शिकायत");
  expect(draft.requestedOutcome).toBe("समाधान चाहिए");
  expect(draft.currentStep).toBe(4);
});
