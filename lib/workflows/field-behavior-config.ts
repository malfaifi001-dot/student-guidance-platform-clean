export const WORKFLOW_AI_ACTIONS = [
  "GENERATE",
  "IMPROVE",
  "REWRITE",
  "SUMMARIZE",
  "RECOMMEND",
  "COMPLETE",
  "EXTRACT",
] as const;

export type WorkflowAiAction = (typeof WORKFLOW_AI_ACTIONS)[number];

export const WORKFLOW_AI_CONTEXT_MODES = [
  "PREVIOUS_FIELDS",
  "CURRENT_STEP",
  "SELECTED_FIELDS",
] as const;

export type WorkflowAiContextMode =
  (typeof WORKFLOW_AI_CONTEXT_MODES)[number];

export const WORKFLOW_AI_TONES = [
  "PROFESSIONAL",
  "FORMAL",
  "CONCISE",
  "EDUCATIONAL",
] as const;

export type WorkflowAiTone = (typeof WORKFLOW_AI_TONES)[number];

export type WorkflowFieldAiConfig = {
  enabled: boolean;
  actions: WorkflowAiAction[];
  contextMode: WorkflowAiContextMode;
  sourceFieldKeys: string[];
  instruction?: string;
  maxLength: number;
  tone: WorkflowAiTone;
};

export type WorkflowFieldBehaviorConfig = {
  ai?: WorkflowFieldAiConfig;
};

export const DEFAULT_WORKFLOW_FIELD_AI_CONFIG: WorkflowFieldAiConfig = {
  enabled: false,
  actions: ["GENERATE"],
  contextMode: "PREVIOUS_FIELDS",
  sourceFieldKeys: [],
  maxLength: 600,
  tone: "PROFESSIONAL",
};

const actionSet = new Set<string>(WORKFLOW_AI_ACTIONS);
const contextModeSet = new Set<string>(WORKFLOW_AI_CONTEXT_MODES);
const toneSet = new Set<string>(WORKFLOW_AI_TONES);

function objectValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, maxLength)
    : "";
}

export function supportsWorkflowFieldAi(fieldType: string, isRepeater = false) {
  return (
    !isRepeater &&
    (fieldType === "TEXT" ||
      fieldType === "TEXTAREA" ||
      fieldType === "RICH_TEXT")
  );
}

export function parseWorkflowFieldBehaviorConfig(
  value: unknown,
): WorkflowFieldBehaviorConfig {
  const root = objectValue(value);
  const aiValue = objectValue(root?.ai);

  if (!aiValue) return {};

  const actions = Array.isArray(aiValue.actions)
    ? [...new Set(aiValue.actions.filter(
        (action): action is WorkflowAiAction =>
          typeof action === "string" && actionSet.has(action),
      ))]
    : DEFAULT_WORKFLOW_FIELD_AI_CONFIG.actions;
  const contextMode =
    typeof aiValue.contextMode === "string" &&
    contextModeSet.has(aiValue.contextMode)
      ? (aiValue.contextMode as WorkflowAiContextMode)
      : DEFAULT_WORKFLOW_FIELD_AI_CONFIG.contextMode;
  const tone =
    typeof aiValue.tone === "string" && toneSet.has(aiValue.tone)
      ? (aiValue.tone as WorkflowAiTone)
      : DEFAULT_WORKFLOW_FIELD_AI_CONFIG.tone;
  const sourceFieldKeys = Array.isArray(aiValue.sourceFieldKeys)
    ? [...new Set(aiValue.sourceFieldKeys.map((key) => cleanText(key, 160)).filter(Boolean))].slice(0, 50)
    : [];
  const rawMaxLength = Number(aiValue.maxLength);
  const maxLength = Number.isFinite(rawMaxLength)
    ? Math.min(4000, Math.max(50, Math.round(rawMaxLength)))
    : DEFAULT_WORKFLOW_FIELD_AI_CONFIG.maxLength;
  const instruction = cleanText(aiValue.instruction, 2000);

  return {
    ai: {
      enabled: aiValue.enabled === true,
      actions: actions.length ? actions : ["GENERATE"],
      contextMode,
      sourceFieldKeys,
      ...(instruction ? { instruction } : {}),
      maxLength,
      tone,
    },
  };
}

export function validateWorkflowFieldBehaviorConfig(value: unknown) {
  const root = objectValue(value);
  if (!root || Object.keys(root).some((key) => key !== "ai")) {
    throw new Error("إعدادات سلوك الحقل غير صالحة.");
  }

  const parsed = parseWorkflowFieldBehaviorConfig(value);
  if (!parsed.ai) throw new Error("إعدادات الذكاء الاصطناعي غير صالحة.");
  const rawAi = objectValue(root.ai);
  if (parsed.ai.enabled && Array.isArray(rawAi?.actions) && rawAi.actions.length === 0) {
    throw new Error("اختر إجراءً واحدًا على الأقل للمساعد الذكي.");
  }
  if (parsed.ai.contextMode === "SELECTED_FIELDS" && parsed.ai.enabled && !parsed.ai.sourceFieldKeys.length) {
    throw new Error("اختر حقلًا واحدًا على الأقل كمصدر للبيانات.");
  }
  return parsed;
}

export const WORKFLOW_AI_ACTION_LABELS: Record<WorkflowAiAction, string> = {
  GENERATE: "اقتراح نص",
  IMPROVE: "تحسين الصياغة",
  REWRITE: "إعادة الصياغة",
  SUMMARIZE: "تلخيص",
  RECOMMEND: "توليد توصية",
  COMPLETE: "إكمال النص",
  EXTRACT: "تنظيم المعلومات",
};
