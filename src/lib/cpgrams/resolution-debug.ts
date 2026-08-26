type DebugContext = Record<string, string | number | boolean | null | undefined>;

export function safeResolutionErrorContext(error: unknown): DebugContext {
  if (!error || typeof error !== "object") return { errorMessage: "Unknown error" };
  const candidate = error as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown };
  return {
    errorCode: typeof candidate.code === "string" ? candidate.code : undefined,
    errorMessage: typeof candidate.message === "string" ? candidate.message : "Unknown error",
    errorDetails: typeof candidate.details === "string" ? candidate.details : undefined,
    errorHint: typeof candidate.hint === "string" ? candidate.hint : undefined,
  };
}

function emit(level: "debug" | "error", marker: string, message: string, context?: DebugContext) {
  if (!import.meta.env.DEV) return;
  console[level](`${marker} ${message}`, context ?? {});
}

export function resolutionRouteDebug(stage: string, message: string, context?: DebugContext) {
  emit("debug", `[resolution-route:${stage}]`, message, context);
}

export function resolutionConfirmDebug(stage: string, message: string, context?: DebugContext) {
  emit("debug", `[resolution-confirm:${stage}]`, message, context);
}

export function resolutionConfirmError(stage: string, message: string, context?: DebugContext) {
  emit("error", `[resolution-confirm:${stage}]`, message, context);
}
