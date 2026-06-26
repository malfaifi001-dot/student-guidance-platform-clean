import { callDeepSeekChat } from "@/lib/ai/deepseek-client";
import {
  applyReportLanguageModeToText,
  getReportLanguageModeInstruction,
  getReportLanguageModeLabel,
  normalizeReportLanguageMode,
  type ReportLanguageMode,
} from "@/lib/report-engine/report-language-mode";
import type {
  ReportFlowPrepareContext,
  ReportFlowSummaryField,
} from "@/lib/report-flow/report-flow-types";

const MAX_SUMMARY_WORDS = 40;
const FALLBACK_SUMMARY =
  "تم تنفيذ المتابعة وفق البيانات المختارة، مع توثيق الإجراء المتخذ ودعم الحالة بما يعزز جودة المتابعة المدرسية.";

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeWhitespace(value: string) {
  return cleanText(value).replace(/\s+/g, " ");
}

function getArabicWordCount(value: string) {
  return normalizeWhitespace(value).split(" ").filter(Boolean).length;
}

function buildFallbackSummary(context: ReportFlowPrepareContext) {
  return applyReportLanguageModeToText(
    FALLBACK_SUMMARY,
    normalizeReportLanguageMode(context.languageMode),
  );
}

function findSentenceBoundaryIndex(words: string[]) {
  let boundaryIndex = -1;

  for (let index = 0; index < Math.min(words.length, MAX_SUMMARY_WORDS); index += 1) {
    if (/[.؟!؛،][)"'\]]*$/.test(words[index] || "")) {
      boundaryIndex = index;
    }
  }

  return boundaryIndex;
}

function normalizeModelSummary(summary: string, languageMode: ReportLanguageMode) {
  const normalized = normalizeWhitespace(
    applyReportLanguageModeToText(
      cleanText(summary)
        .replace(/^["'“”«»]+|["'“”«»]+$/g, "")
        .replace(/^(إليك الوصف|الوصف|النص المقترح)\s*[:：-]?\s*/u, ""),
      languageMode,
    ),
  );

  if (!normalized) {
    return "";
  }

  if (getArabicWordCount(normalized) <= MAX_SUMMARY_WORDS) {
    return normalized;
  }

  const words = normalized.split(" ").filter(Boolean);
  const boundaryIndex = findSentenceBoundaryIndex(words);

  if (boundaryIndex >= 0) {
    return words.slice(0, boundaryIndex + 1).join(" ");
  }

  return "";
}

export async function generateExecutionSummary({
  context,
  fields,
}: {
  context: ReportFlowPrepareContext;
  fields: ReportFlowSummaryField[];
}) {
  const languageMode = normalizeReportLanguageMode(context.languageMode);
  const safeFields = fields
    .filter((field) => cleanText(field.label) && cleanText(field.value))
    .slice(0, 20);

  if (!safeFields.length) {
    return {
      summary: buildFallbackSummary(context),
      source: "FALLBACK" as const,
    };
  }

  const fieldLines = safeFields
    .map((field) => `- ${field.label}: ${field.value}`)
    .join("\n");

  const prompt = `
اكتب وصف تنفيذ رسميًا باللغة العربية من جملة أو جملتين مكتملتين، لا يتجاوز 40 كلمة، دون تعداد أو عناوين، ولا تقطع الجملة. أعد الوصف فقط.
التزم بالتعليمات التالية بدقة:
- النص عربي رسمي واضح.
- الحد الأقصى 40 كلمة.
- جملة واحدة أو جملتان مكتملتان فقط.
- ممنوع التعداد أو العناوين أو الشرح الإضافي.
- ممنوع مقدمات مثل: إليك الوصف.
- ممنوع قطع الجملة.
- لا تذكر الذكاء الاصطناعي أو Workflow أو الحقول أو البيانات المختارة.
- استخدم فقط المعلومات الواردة أدناه دون اختراع نتائج أو معلومات جديدة.
- لا تذكر أسماء المنفذين أو المستخدمين أو الأشخاص داخل الوصف.

صيغة التقرير المطلوبة: ${getReportLanguageModeLabel(languageMode)}
${getReportLanguageModeInstruction(languageMode)}

سياق التقرير:
- عنوان التقرير: ${cleanText(context.title) || "تقرير"}
- اسم الخدمة: ${cleanText(context.serviceName) || "خدمة"}
- نوع الخدمة: ${cleanText(context.serviceSlug) || "general"}

البيانات المعتمدة:
${fieldLines}
`.trim();

  try {
    const summary = await callDeepSeekChat({
      messages: [
        {
          role: "system",
          content:
            "أنت مساعد لصياغة تقارير مدرسية عربية رسمية. أعد وصف التنفيذ فقط في جملة أو جملتين مكتملتين لا تتجاوز 40 كلمة، دون تعداد أو عناوين أو مقدمات.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
      maxTokens: 180,
    });

    const finalSummary = normalizeModelSummary(summary, languageMode);

    if (!finalSummary) {
      return {
        summary: buildFallbackSummary(context),
        source: "FALLBACK" as const,
      };
    }

    return {
      summary: finalSummary,
      source: "AI" as const,
    };
  } catch {
    return {
      summary: buildFallbackSummary(context),
      source: "FALLBACK" as const,
    };
  }
}
