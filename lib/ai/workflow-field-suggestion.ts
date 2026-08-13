import { callDeepSeekChat } from "@/lib/ai/deepseek-client";
import type {
  WorkflowAiAction,
  WorkflowFieldAiConfig,
} from "@/lib/workflows/field-behavior-config";

export type WorkflowAiContextItem = {
  label: string;
  value: string;
};

type SuggestionInput = {
  action: WorkflowAiAction;
  config: WorkflowFieldAiConfig;
  serviceName: string;
  workflowName: string;
  stepTitle: string;
  targetFieldLabel: string;
  currentText?: string;
  context: WorkflowAiContextItem[];
  richText?: boolean;
};

const actionInstructions: Record<WorkflowAiAction, string> = {
  GENERATE: "اكتب نصًا مناسبًا للحقل المطلوب.",
  IMPROVE: "حسّن صياغة النص الحالي مع الحفاظ على معناه وحقائقه.",
  REWRITE: "أعد صياغة النص الحالي بأسلوب أوضح دون إضافة حقائق.",
  SUMMARIZE: "لخّص المعلومات المقدمة بدقة.",
  RECOMMEND: "اكتب توصية مهنية مستندة فقط إلى المعلومات المقدمة.",
  COMPLETE: "أكمل النص الحالي بما يتسق مع السياق دون اختلاق معلومات.",
  EXTRACT: "استخرج المعلومات المفيدة ونظّمها في نص واضح.",
};

const toneLabels = {
  PROFESSIONAL: "مهنية",
  FORMAL: "رسمية",
  CONCISE: "موجزة",
  EDUCATIONAL: "تربوية",
} as const;

function sanitize(value: string, maxLength: number) {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export async function generateWorkflowFieldSuggestion(input: SuggestionInput) {
  const context = input.context
    .map((item) => ({
      label: sanitize(item.label, 160),
      value: sanitize(item.value, 1200),
    }))
    .filter((item) => item.label && item.value)
    .slice(0, 40);
  const contextText = context.length
    ? context.map((item) => `${item.label}: ${item.value}`).join("\n")
    : "لا توجد قيم إضافية مدخلة.";
  const currentText = sanitize(input.currentText ?? "", 4000);
  const instruction = sanitize(input.config.instruction ?? "", 2000);

  const result = await callDeepSeekChat({
    temperature: 0.2,
    maxTokens: Math.min(1800, Math.max(120, Math.ceil(input.config.maxLength / 2))),
    timeoutMs: 60000,
    messages: [
      {
        role: "system",
        content: [
          "أنت مساعد للكتابة المهنية في منصة مدرسية سعودية.",
          "استخدم فقط السياق المقدم، ولا تخترع حقائق عن الطلاب أو حوادث أو تواريخ أو تشخيصات أو نتائج.",
          "اكتب بالعربية المهنية، وأعد محتوى الحقل المطلوب فقط دون مقدمات أو شرح.",
          input.richText
            ? "يمكن استخدام تنسيق بسيط عند الحاجة."
            : "لا تستخدم Markdown أو عناوين تنسيقية.",
          `لا تتجاوز ${input.config.maxLength} حرفًا.`,
        ].join(" "),
      },
      {
        role: "user",
        content: [
          `الخدمة: ${sanitize(input.serviceName, 160)}`,
          `سير العمل: ${sanitize(input.workflowName, 160)}`,
          `الخطوة: ${sanitize(input.stepTitle, 160)}`,
          "",
          contextText,
          currentText ? `\nالنص الحالي:\n${currentText}` : "",
          "",
          `الحقل المستهدف: ${sanitize(input.targetFieldLabel, 160)}`,
          `المطلوب: ${actionInstructions[input.action]}`,
          `نبرة النص: ${toneLabels[input.config.tone]}`,
          instruction ? `تعليمات خاصة: ${instruction}` : "",
        ].filter(Boolean).join("\n"),
      },
    ],
  });

  return sanitize(result, input.config.maxLength);
}
