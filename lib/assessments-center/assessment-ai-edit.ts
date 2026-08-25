const EDITABLE_AI_KEYS = new Set([
  "executiveSummary", "analyticalReading", "strengths", "improvementAreas",
  "weaknesses", "possibleCauses", "improvementPriorities", "recommendations",
  "remedialActions", "enrichmentActions", "developmentPlan", "challengesAndRisks",
  "followUpIndicators", "finalConclusion", "notablePatterns",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 5) throw new Error("AI_CONTENT_TOO_DEEP");
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 30000) throw new Error("AI_CONTENT_TOO_LONG");
    return trimmed;
  }
  if (Array.isArray(value)) {
    if (value.length > 300) throw new Error("AI_ARRAY_TOO_LARGE");
    return value.map((item) => sanitize(item, depth + 1));
  }
  if (isRecord(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (!/^[A-Za-z0-9_]{1,80}$/.test(key)) throw new Error("AI_FIELD_INVALID");
      result[key] = sanitize(item, depth + 1);
    }
    return result;
  }
  if (value === null || typeof value === "number" || typeof value === "boolean") return value;
  throw new Error("AI_VALUE_INVALID");
}

export function validateAiPatch(input: unknown) {
  if (!isRecord(input)) return { success: false as const, error: "AI_PATCH_INVALID" };
  const result: Record<string, unknown> = {};
  try {
    for (const [key, value] of Object.entries(input)) {
      if (!EDITABLE_AI_KEYS.has(key)) return { success: false as const, error: "AI_FIELD_NOT_EDITABLE" };
      result[key] = sanitize(value);
    }
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "AI_PATCH_INVALID" };
  }
  return { success: true as const, value: result };
}

export function mergeEditableAi(current: unknown, patch: Record<string, unknown>) {
  return { ...(isRecord(current) ? current : {}), ...patch };
}

