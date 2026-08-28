import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.4";
import { z } from "npm:zod@3.24.2";
import {
  ELIGIBILITY_CLASSES,
  ELIGIBILITY_PROMPT_VERSION,
  GUIDANCE_PROMPT_VERSION,
  classifyEligibilityDeterministically,
  containsForbiddenGovernmentActionClaim,
  deterministicGuidanceReply,
  guidanceDisclaimer,
  mayUseCitizenCaseContext,
  redactCommonPii,
  type SafeCaseSnapshot,
} from "../_shared/ai-core.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  Vary: "Origin",
};

const MAX_ANONYMOUS_PER_MINUTE = 12;
const MAX_AUTHENTICATED_PER_MINUTE = 30;

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("classify_intake"),
    text: z.string().trim().min(10).max(6000),
    requested_outcome: z.string().trim().max(2000).nullable().optional(),
    language: z.string().trim().min(2).max(12).default("en"),
  }),
  z.object({
    action: z.literal("guidance_chat"),
    message: z.string().trim().min(2).max(2000),
    language: z.string().trim().min(2).max(12).default("en"),
    grievance_id: z.string().uuid().nullable().optional(),
  }),
]);

const eligibilityProviderSchema = z
  .object({
    classification: z.enum(ELIGIBILITY_CLASSES),
    confidence: z.number().min(0).max(1),
    guidance: z.string().min(1).max(1600),
    can_continue: z.literal(true),
    advisory: z.literal(true),
  })
  .strict();

const guidanceProviderSchema = z
  .object({
    answer: z.string().min(1).max(2500),
    suggested_actions: z.array(z.string().min(1).max(180)).max(5),
    case_context_used: z.boolean(),
  })
  .strict();

const eligibilityJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["classification", "confidence", "guidance", "can_continue", "advisory"],
  properties: {
    classification: { type: "string", enum: [...ELIGIBILITY_CLASSES] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    guidance: { type: "string" },
    can_continue: { type: "boolean", const: true },
    advisory: { type: "boolean", const: true },
  },
};

const guidanceJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["answer", "suggested_actions", "case_context_used"],
  properties: {
    answer: { type: "string" },
    suggested_actions: { type: "array", maxItems: 5, items: { type: "string" } },
    case_context_used: { type: "boolean" },
  },
};

interface StructuredProviderRequest {
  schemaName: string;
  jsonSchema: Record<string, unknown>;
  instructions: string;
  input: string;
}

interface StructuredProvider {
  readonly label: string;
  generate(request: StructuredProviderRequest): Promise<unknown>;
}

class ProviderHttpError extends Error {
  constructor(readonly status: number) {
    super(`Provider returned HTTP ${status}.`);
  }
}

function boundedInteger(raw: string | undefined, fallback: number, min: number, max: number) {
  const value = Number(raw);
  return Number.isFinite(value) ? Math.min(max, Math.max(min, Math.trunc(value))) : fallback;
}

function shouldRetry(error: unknown): boolean {
  return (
    error instanceof DOMException ||
    (error instanceof ProviderHttpError &&
      (error.status === 408 || error.status === 429 || error.status >= 500))
  );
}

async function withRetry<T>(work: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const timeoutMs = boundedInteger(Deno.env.get("AI_TIMEOUT_MS"), 8000, 2000, 20000);
  const retryLimit = boundedInteger(Deno.env.get("AI_RETRY_LIMIT"), 1, 0, 2);
  let lastError: unknown;
  for (let attempt = 0; attempt <= retryLimit; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort("AI provider timeout"), timeoutMs);
    try {
      return await work(controller.signal);
    } catch (error) {
      lastError = error;
      if (attempt >= retryLimit || !shouldRetry(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

function extractResponseText(payload: unknown): string {
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

class OpenAiStructuredProvider implements StructuredProvider {
  readonly label: string;
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {
    this.label = `openai:${model}`;
  }

  async generate(request: StructuredProviderRequest): Promise<unknown> {
    return withRetry(async (signal) => {
      const response = await fetch("https://api.openai.com/v1/responses", {
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
      if (!response.ok) throw new ProviderHttpError(response.status);
      const payload = await response.json();
      return JSON.parse(extractResponseText(payload));
    });
  }
}

function configuredProvider(): StructuredProvider | null {
  if ((Deno.env.get("AI_PROVIDER") ?? "deterministic").toLowerCase() !== "openai") return null;
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return null;
  return new OpenAiStructuredProvider(apiKey, Deno.env.get("AI_MODEL") ?? "gpt-5-mini");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bearerToken(req: Request): string | null {
  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return null;
  const token = authorization.slice(7).trim();
  return token && !token.startsWith("sb_") ? token : null;
}

function requestAddress(req: Request) {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

async function loadAuthenticatedUser(callerClient: ReturnType<typeof createClient>, req: Request) {
  const token = bearerToken(req);
  if (!token) return null;
  const { data, error } = await callerClient.auth.getUser(token);
  return error ? null : data.user;
}

async function loadOwnedCaseContext(
  callerClient: ReturnType<typeof createClient>,
  userId: string | null,
  grievanceId: string | null | undefined,
): Promise<{ id: string; snapshot: SafeCaseSnapshot } | null> {
  if (!grievanceId) return null;
  if (!userId) throw new Error("CASE_CONTEXT_DENIED");
  const { data: profile, error: profileError } = await callerClient
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle();
  if (profileError || profile?.role !== "citizen") throw new Error("CASE_CONTEXT_DENIED");
  const { data, error } = await callerClient
    .from("grievances")
    .select(
      "id, citizen_id, organization_id, registration_number, short_title, administrative_state, outcome_state, citizen_confirmation_state, submitted_at, updated_at",
    )
    .eq("id", grievanceId)
    .maybeSingle();
  if (
    error ||
    !data ||
    !mayUseCitizenCaseContext({
      profile_role: profile.role,
      user_id: userId,
      citizen_id: data.citizen_id,
    })
  )
    throw new Error("CASE_CONTEXT_DENIED");
  let organizationName: string | null = null;
  if (data.organization_id) {
    const { data: organization, error: organizationError } = await callerClient
      .from("organizations")
      .select("name")
      .eq("id", data.organization_id)
      .maybeSingle();
    if (!organizationError) organizationName = organization?.name ?? null;
  }
  return {
    id: data.id,
    snapshot: {
      registration_number: data.registration_number,
      short_title: data.short_title,
      administrative_state: data.administrative_state,
      outcome_state: data.outcome_state,
      citizen_confirmation_state: data.citizen_confirmation_state,
      organization_name: organizationName,
      submitted_at: data.submitted_at,
      updated_at: data.updated_at,
    },
  };
}

async function enforceRateLimit(
  auditClient: ReturnType<typeof createClient>,
  action: "classify_intake" | "guidance_chat",
  fingerprint: string,
  authenticated: boolean,
) {
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count, error } = await auditClient
    .from("ai_runs")
    .select("id", { count: "exact", head: true })
    .eq("run_kind", action)
    .contains("suggestion", { request_fingerprint: fingerprint })
    .gte("created_at", since);
  if (error) throw new Error("AUDIT_UNAVAILABLE");
  const limit = authenticated ? MAX_AUTHENTICATED_PER_MINUTE : MAX_ANONYMOUS_PER_MINUTE;
  if ((count ?? 0) >= limit) throw new Error("RATE_LIMITED");
}

async function auditRun(
  auditClient: ReturnType<typeof createClient>,
  values: {
    action: "classify_intake" | "guidance_chat";
    modelLabel: string;
    inputLength: number;
    redactionCount: number;
    requestedBy: string | null;
    grievanceId: string | null;
    fingerprint: string;
    confidence: number | null;
    outcome: string;
    fallbackUsed: boolean;
    promptVersion: string;
    caseContextUsed: boolean;
  },
) {
  const { error } = await auditClient.from("ai_runs").insert({
    run_kind: values.action,
    model_label: values.modelLabel,
    input_summary: `${values.action}; chars=${values.inputLength}; pii_redactions=${values.redactionCount}`,
    requested_by: values.requestedBy,
    grievance_id: values.grievanceId,
    confidence: values.confidence,
    suggestion: {
      outcome: values.outcome,
      prompt_version: values.promptVersion,
      fallback_used: values.fallbackUsed,
      validation_status: "passed",
      case_context_used: values.caseContextUsed,
      request_fingerprint: values.fingerprint,
    },
  });
  if (error) throw new Error("AUDIT_UNAVAILABLE");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey)
      return json({ error: "Gateway unavailable." }, 503);

    const body = requestSchema.safeParse(await req.json());
    if (!body.success) return json({ error: "Invalid guidance request." }, 400);

    const authorization = req.headers.get("Authorization");
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: authorization ? { headers: { Authorization: authorization } } : undefined,
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const auditClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const user = await loadAuthenticatedUser(callerClient, req);
    const fingerprint = await sha256(
      `${Deno.env.get("AI_RATE_LIMIT_SALT") ?? serviceRoleKey}:${user?.id ?? requestAddress(req)}`,
    );
    await enforceRateLimit(auditClient, body.data.action, fingerprint, Boolean(user));

    const provider = configuredProvider();
    if (body.data.action === "classify_intake") {
      const joined = `${body.data.text}\nRequested outcome: ${body.data.requested_outcome ?? "not provided"}`;
      const redacted = redactCommonPii(joined);
      let result = classifyEligibilityDeterministically(redacted.text);
      let fallbackUsed = true;
      let modelLabel = "deterministic-fallback";
      if (provider) {
        try {
          const candidate = await provider.generate({
            schemaName: "cpgrams_eligibility_guidance",
            jsonSchema: eligibilityJsonSchema,
            instructions: `You provide advisory CPGRAMS intake guidance in language ${body.data.language}. Never reject a filing authoritatively. Never close, transfer, resolve, assign, or decide a grievance or appeal. Classify only into the supplied enum. Uncertain cases must remain continuable. Return no chain-of-thought and only the JSON schema. Prompt version: ${ELIGIBILITY_PROMPT_VERSION}.`,
            input: redacted.text,
          });
          result = eligibilityProviderSchema.parse(candidate);
          fallbackUsed = false;
          modelLabel = provider.label;
        } catch (error) {
          console.error(
            "[ai-gateway] Provider classification failed; deterministic fallback used.",
            {
              name: error instanceof Error ? error.name : "unknown",
            },
          );
        }
      }
      await auditRun(auditClient, {
        action: body.data.action,
        modelLabel,
        inputLength: joined.length,
        redactionCount: redacted.redaction_count,
        requestedBy: user?.id ?? null,
        grievanceId: null,
        fingerprint,
        confidence: result.confidence,
        outcome: result.classification,
        fallbackUsed,
        promptVersion: ELIGIBILITY_PROMPT_VERSION,
        caseContextUsed: false,
      });
      return json({
        kind: "eligibility_result",
        ...result,
        provider: modelLabel,
        prompt_version: ELIGIBILITY_PROMPT_VERSION,
        fallback_used: fallbackUsed,
      });
    }

    const caseContext = await loadOwnedCaseContext(
      callerClient,
      user?.id ?? null,
      body.data.grievance_id,
    );
    const redacted = redactCommonPii(body.data.message);
    let result = deterministicGuidanceReply(
      redacted.text,
      body.data.language,
      caseContext?.snapshot ?? null,
    );
    let fallbackUsed = true;
    let modelLabel = "deterministic-fallback";
    if (provider) {
      try {
        const candidate = guidanceProviderSchema.parse(
          await provider.generate({
            schemaName: "cpgrams_citizen_guidance",
            jsonSchema: guidanceJsonSchema,
            instructions: `You are a CPGRAMS guidance assistant. Reply in language ${body.data.language}. Explain filing, eligibility, statuses, appeals, and how to formulate a grievance. Case context, when present, is read-only factual data belonging to the authenticated citizen. Never claim you performed a government action. Never reject, close, transfer, resolve, assign, or decide a case or appeal. Never invent case facts, events, evidence, or officer statements. Do not expose hidden reasoning. Return only the JSON schema. Prompt version: ${GUIDANCE_PROMPT_VERSION}.`,
            input: JSON.stringify({
              question: redacted.text,
              case_context: caseContext?.snapshot ?? null,
            }),
          }),
        );
        if (containsForbiddenGovernmentActionClaim(candidate.answer))
          throw new Error("Unsafe government-action claim.");
        if (candidate.case_context_used && !caseContext)
          throw new Error("Provider claimed unavailable case context.");
        result = candidate;
        fallbackUsed = false;
        modelLabel = provider.label;
      } catch (error) {
        console.error("[ai-gateway] Provider guidance failed safety/validation; fallback used.", {
          name: error instanceof Error ? error.name : "unknown",
        });
      }
    }
    await auditRun(auditClient, {
      action: body.data.action,
      modelLabel,
      inputLength: body.data.message.length,
      redactionCount: redacted.redaction_count,
      requestedBy: user?.id ?? null,
      grievanceId: caseContext?.id ?? null,
      fingerprint,
      confidence: null,
      outcome: "guidance_returned",
      fallbackUsed,
      promptVersion: GUIDANCE_PROMPT_VERSION,
      caseContextUsed: result.case_context_used,
    });
    return json({
      kind: "guidance_result",
      ...result,
      disclaimer: guidanceDisclaimer(body.data.language),
      provider: modelLabel,
      prompt_version: GUIDANCE_PROMPT_VERSION,
      fallback_used: fallbackUsed,
    });
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: "Invalid JSON request." }, 400);
    if (error instanceof Error && error.message === "CASE_CONTEXT_DENIED")
      return json({ error: "Case context is not available." }, 403);
    if (error instanceof Error && error.message === "RATE_LIMITED")
      return json({ error: "Too many guidance requests. Please try again shortly." }, 429);
    console.error("[ai-gateway] Request failed.", {
      code: error instanceof Error ? error.message : "unknown",
    });
    return json({ error: "The guidance service is temporarily unavailable." }, 503);
  }
});
