export interface StructuredProviderRequest {
  schemaName: string;
  jsonSchema: Record<string, unknown>;
  instructions: string;
  input: string;
}

export interface StructuredProvider {
  readonly provider: "openai" | "gemini";
  readonly model: string;
  readonly label: string;
  generate(request: StructuredProviderRequest): Promise<unknown>;
}

export interface StructuredProviderRuntime {
  getEnv(name: string): string | undefined;
  fetchImpl?: typeof fetch;
}

export type ProviderFailureStage =
  "HTTP" | "timeout" | "response extraction" | "JSON parse" | "Zod/schema validation";

export interface SafeProviderResponseEnvelope {
  status: string | null;
  object: string | null;
  step_types: string[];
  content_types: string[][];
  number_of_steps: number;
  number_of_content_blocks: number;
}

export class ProviderFailure extends Error {
  constructor(
    readonly provider: string,
    readonly model: string,
    readonly stage: ProviderFailureStage,
    readonly safeMessage: string,
    readonly options: {
      status?: number;
      code?: string;
      retryable?: boolean;
      responseEnvelope?: SafeProviderResponseEnvelope;
    } = {},
  ) {
    super(safeMessage);
  }

  get status() {
    return this.options.status;
  }

  get code() {
    return this.options.code;
  }

  get retryable() {
    return this.options.retryable ?? false;
  }
}

export function safeProviderDiagnostic(error: unknown) {
  if (error instanceof ProviderFailure) {
    return {
      provider: error.provider,
      model: error.model,
      stage: error.stage,
      http_status: error.status ?? null,
      provider_code: error.code ?? null,
      message: error.safeMessage,
      ...(error.options.responseEnvelope
        ? { response_envelope: error.options.responseEnvelope }
        : {}),
    };
  }
  return {
    provider: "unknown",
    model: "unknown",
    stage: "unknown",
    http_status: null,
    provider_code: null,
    message: "Provider failed without a safe diagnostic.",
  };
}

function safeEnvelopeLabel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const label = value.trim().slice(0, 48);
  return label && /^[a-z0-9_.-]+$/iu.test(label) ? label : "unknown";
}

function safeGeminiResponseEnvelope(
  payload: Record<string, unknown>,
): SafeProviderResponseEnvelope {
  const steps = Array.isArray(payload.steps) ? payload.steps : [];
  const contentTypes = steps.map((step) => {
    if (!step || typeof step !== "object") return [];
    const content = (step as { content?: unknown }).content;
    if (!Array.isArray(content)) return [];
    return content.map((block) => {
      if (!block || typeof block !== "object") return "unknown";
      return safeEnvelopeLabel((block as { type?: unknown }).type) ?? "unknown";
    });
  });
  return {
    status: safeEnvelopeLabel(payload.status),
    object: safeEnvelopeLabel(payload.object),
    step_types: steps.map((step) => {
      if (!step || typeof step !== "object") return "unknown";
      return safeEnvelopeLabel((step as { type?: unknown }).type) ?? "unknown";
    }),
    content_types: contentTypes,
    number_of_steps: steps.length,
    number_of_content_blocks: contentTypes.reduce((total, types) => total + types.length, 0),
  };
}

function boundedInteger(raw: string | undefined, fallback: number, min: number, max: number) {
  const value = Number(raw);
  return Number.isFinite(value) ? Math.min(max, Math.max(min, Math.trunc(value))) : fallback;
}

function shouldRetry(error: unknown): boolean {
  return error instanceof ProviderFailure && error.retryable;
}

function providerFetch(runtime: StructuredProviderRuntime) {
  return runtime.fetchImpl ?? fetch;
}

async function withRetry<T>(
  runtime: StructuredProviderRuntime,
  identity: Pick<StructuredProvider, "provider" | "model">,
  work: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const timeoutMs = boundedInteger(runtime.getEnv("AI_TIMEOUT_MS"), 8000, 2000, 20000);
  const retryLimit = boundedInteger(runtime.getEnv("AI_RETRY_LIMIT"), 1, 0, 2);
  let lastError: unknown;
  for (let attempt = 0; attempt <= retryLimit; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort("AI provider timeout"), timeoutMs);
    try {
      return await work(controller.signal);
    } catch (caught) {
      const error =
        caught instanceof ProviderFailure
          ? caught
          : new ProviderFailure(
              identity.provider,
              identity.model,
              caught instanceof DOMException ? "timeout" : "response extraction",
              caught instanceof DOMException
                ? "Provider request timed out."
                : "Provider response could not be processed.",
              { retryable: caught instanceof DOMException },
            );
      lastError = error;
      if (attempt >= retryLimit || !shouldRetry(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

function extractOpenAiResponseText(payload: unknown): string {
  if (!payload || typeof payload !== "object") throw new Error("Provider response is empty.");
  const direct = (payload as { output_text?: unknown }).output_text;
  if (typeof direct === "string" && direct.trim()) return direct;
  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) throw new Error("Provider response has no structured text.");
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string")
        return (part as { text: string }).text;
    }
  }
  throw new Error("Provider response has no structured text.");
}

function sanitizeProviderMessage(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu, "[redacted-email]")
    .replace(/(?<!\d)(?:\+91[ -]?)?[6-9]\d{9}(?!\d)/gu, "[redacted-phone]")
    .trim();
  return normalized ? normalized.slice(0, 180) : undefined;
}

async function geminiHttpFailure(response: Response, model: string): Promise<ProviderFailure> {
  let code: string | undefined;
  let message: string | undefined;
  try {
    const payload = (await response.json()) as {
      error?: { status?: unknown; code?: unknown; message?: unknown };
    };
    code =
      typeof payload.error?.status === "string"
        ? payload.error.status
        : typeof payload.error?.code === "string"
          ? payload.error.code
          : typeof payload.error?.code === "number"
            ? String(payload.error.code)
            : undefined;
    message = sanitizeProviderMessage(payload.error?.message);
  } catch {
    // An empty/non-JSON error body is still represented by the HTTP status only.
  }
  return new ProviderFailure(
    "gemini",
    model,
    "HTTP",
    message ?? `Gemini returned HTTP ${response.status}.`,
    {
      status: response.status,
      code,
      retryable: response.status === 408 || response.status === 429 || response.status >= 500,
    },
  );
}

/** Extracts only final user-visible model text from the raw Gemini Interactions REST payload. */
export function extractGeminiResponseText(payload: unknown, model = "unknown"): string {
  if (!payload || typeof payload !== "object")
    throw new ProviderFailure("gemini", model, "response extraction", "Gemini response was empty.");
  const record = payload as Record<string, unknown>;
  const envelope = safeGeminiResponseEnvelope(record);
  const status = record.status;
  if (typeof status === "string" && status !== "completed" && status !== "incomplete") {
    throw new ProviderFailure(
      "gemini",
      model,
      "response extraction",
      `Gemini interaction did not complete (${status}).`,
      { responseEnvelope: envelope },
    );
  }

  // The raw REST Interactions envelope is authoritative. Use the final model_output step that
  // contains visible text, concatenate its text blocks in order, and never inspect thought steps.
  const steps = record.steps;
  if (Array.isArray(steps)) {
    for (let stepIndex = steps.length - 1; stepIndex >= 0; stepIndex -= 1) {
      const step = steps[stepIndex];
      if (!step || typeof step !== "object" || (step as { type?: unknown }).type !== "model_output")
        continue;
      const content = (step as { content?: unknown }).content;
      if (!Array.isArray(content)) continue;
      const text = content
        .filter((block): block is { type: "text"; text: string } =>
          Boolean(
            block &&
            typeof block === "object" &&
            (block as { type?: unknown }).type === "text" &&
            typeof (block as { text?: unknown }).text === "string",
          ),
        )
        .map((block) => block.text)
        .join("");
      if (text.trim()) return text;
    }
  }

  // Compatibility fallbacks for SDK convenience properties and older fixtures.
  const direct = record.output_text;
  if (typeof direct === "string" && direct.trim()) return direct;
  const camelCase = record.outputText;
  if (typeof camelCase === "string" && camelCase.trim()) return camelCase;
  const outputs = record.outputs;
  if (Array.isArray(outputs)) {
    const text = outputs
      .filter((output): output is { type: "text"; text: string } =>
        Boolean(
          output &&
          typeof output === "object" &&
          (output as { type?: unknown }).type === "text" &&
          typeof (output as { text?: unknown }).text === "string",
        ),
      )
      .map((output) => output.text)
      .join("");
    if (text.trim()) return text;
  }
  throw new ProviderFailure(
    "gemini",
    model,
    "response extraction",
    "Gemini response has no structured text.",
    { responseEnvelope: envelope },
  );
}

function parseProviderJson(provider: string, model: string, text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new ProviderFailure(provider, model, "JSON parse", "Provider returned malformed JSON.");
  }
}

class OpenAiStructuredProvider implements StructuredProvider {
  readonly provider = "openai" as const;
  readonly label: string;

  constructor(
    private readonly apiKey: string,
    readonly model: string,
    private readonly runtime: StructuredProviderRuntime,
  ) {
    this.label = `${this.provider}:${model}`;
  }

  async generate(request: StructuredProviderRequest): Promise<unknown> {
    return withRetry(this.runtime, this, async (signal) => {
      const response = await providerFetch(this.runtime)("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        signal,
        body: JSON.stringify({
          model: this.model,
          store: false,
          instructions: request.instructions,
          input: request.input,
          text: {
            format: {
              type: "json_schema",
              name: request.schemaName,
              strict: true,
              schema: request.jsonSchema,
            },
          },
        }),
      });
      if (!response.ok)
        throw new ProviderFailure(
          this.provider,
          this.model,
          "HTTP",
          `OpenAI returned HTTP ${response.status}.`,
          {
            status: response.status,
            retryable: response.status === 408 || response.status === 429 || response.status >= 500,
          },
        );
      return parseProviderJson(
        this.provider,
        this.model,
        extractOpenAiResponseText(await response.json()),
      );
    });
  }
}

class GeminiStructuredProvider implements StructuredProvider {
  readonly provider = "gemini" as const;
  readonly label: string;

  constructor(
    private readonly apiKey: string,
    readonly model: string,
    private readonly runtime: StructuredProviderRuntime,
  ) {
    this.label = `${this.provider}:${model}`;
  }

  async generate(request: StructuredProviderRequest): Promise<unknown> {
    return withRetry(this.runtime, this, async (signal) => {
      const response = await providerFetch(this.runtime)(
        "https://generativelanguage.googleapis.com/v1beta/interactions",
        {
          method: "POST",
          headers: {
            "x-goog-api-key": this.apiKey,
            "Content-Type": "application/json",
            "Api-Revision": "2026-05-20",
          },
          signal,
          body: JSON.stringify({
            model: this.model,
            store: false,
            input: request.input,
            system_instruction: request.instructions,
            response_format: {
              type: "text",
              mime_type: "application/json",
              schema: request.jsonSchema,
            },
            generation_config: { temperature: 0 },
          }),
        },
      );
      if (!response.ok) throw await geminiHttpFailure(response, this.model);
      return parseProviderJson(
        this.provider,
        this.model,
        extractGeminiResponseText(await response.json(), this.model),
      );
    });
  }
}

/**
 * Resolves a server-only provider. A missing or unsupported provider intentionally leaves the
 * caller on the existing deterministic/manual path.
 */
export function configuredStructuredProvider(
  runtime: StructuredProviderRuntime,
): StructuredProvider | null {
  const provider = (runtime.getEnv("AI_PROVIDER") ?? "deterministic").trim().toLowerCase();
  const model = runtime.getEnv("AI_MODEL")?.trim();
  if (provider === "gemini") {
    const apiKey = runtime.getEnv("GEMINI_API_KEY")?.trim();
    return apiKey
      ? new GeminiStructuredProvider(apiKey, model || "gemini-2.5-flash", runtime)
      : null;
  }
  if (provider === "openai") {
    const apiKey = runtime.getEnv("OPENAI_API_KEY")?.trim();
    return apiKey ? new OpenAiStructuredProvider(apiKey, model || "gpt-5-mini", runtime) : null;
  }
  return null;
}
