import { NextResponse } from "next/server";

import { callDeepSeekChat } from "@/lib/ai/deepseek-client";
import {
  findRelevantAiReportKnowledge,
  normalizeAiReportArabicText,
} from "@/lib/ai-report/ai-report-knowledge-retriever";
import { sanitizeAiReportText } from "@/lib/ai-report/ai-report-text-sanitizer";
import { requireCustomReportContext } from "@/lib/custom-report/custom-report-auth";
import { extractJsonObject } from "@/lib/custom-report/custom-report-normalizer";
import type {
  CustomReportOption,
  CustomReportSchema,
} from "@/lib/custom-report/custom-report-types";

const FIELD_OPTION_FALLBACKS: Array<{
  matchers: string[];
  options: string[];
}> = [
  {
    matchers: ["طريقة التقييم", "أسلوب التقييم", "أداة التقييم"],
    options: [
      "اختبار قصير",
      "ملاحظة أداء",
      "مهمة أدائية",
      "ورقة عمل",
      "تقويم شفهي",
      "بطاقة خروج",
    ],
  },
  {
    matchers: ["مستوى الإتقان", "الإتقان العام", "مستوى الإتقان العام"],
    options: [
      "متقن بدرجة عالية",
      "متقن",
      "متقن جزئيًا",
      "يحتاج دعمًا",
      "يحتاج خطة علاجية",
    ],
  },
  {
    matchers: ["الأهداف", "الأهداف التعليمية", "نواتج التعلم"],
    options: [
      "قياس تحقق نواتج التعلم",
      "تنمية مهارة محددة",
      "معالجة فجوات تعلم",
      "تعزيز المشاركة",
      "تحسين مستوى الإتقان",
    ],
  },
  {
    matchers: ["التوصيات", "التوصية"],
    options: [
      "تنفيذ نشاط علاجي",
      "تقديم تغذية راجعة",
      "إعادة شرح المهارة",
      "متابعة التقدم",
      "توظيف تقويم قصير",
    ],
  },
  {
    matchers: ["الإجراءات", "إجراءات", "الإجراء"],
    options: [
      "تحديد مستوى الطلاب",
      "تنفيذ نشاط تطبيقي",
      "تحليل النتائج",
      "تقديم دعم موجه",
      "توثيق المخرجات",
    ],
  },
];

function cleanText(value: unknown) {
  return sanitizeAiReportText(value);
}

function normalizeOptionValue(label: string, index: number) {
  const value = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return value || `option_${index + 1}`;
}

function dedupeOptions(options: CustomReportOption[]) {
  const seen = new Set<string>();

  return options.filter((option) => {
    const label = cleanText(option.label);
    const value = String(option.value || "").trim();

    if (!label || !value) {
      return false;
    }

    const dedupeKey = `${label.toLowerCase()}::${value.toLowerCase()}`;

    if (seen.has(dedupeKey)) {
      return false;
    }

    seen.add(dedupeKey);
    return true;
  });
}

function normalizeOptions(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return dedupeOptions(
    value
      .map((item, index) => {
        if (typeof item === "string") {
          const label = cleanText(item);

          if (!label) {
            return null;
          }

          return {
            label,
            value: normalizeOptionValue(label, index),
          };
        }

        if (!item || typeof item !== "object") {
          return null;
        }

        const record = item as Record<string, unknown>;
        const label = cleanText(record.label);

        if (!label) {
          return null;
        }

        const value = cleanText(record.value) || normalizeOptionValue(label, index);

        return {
          label,
          value,
        };
      })
      .filter(Boolean) as CustomReportOption[],
  ).slice(0, 8);
}

function buildContextPrompt(schema: CustomReportSchema, fieldLabel: string) {
  const fieldLabels = schema.sections
    .flatMap((section) => section.fields)
    .map((field) => field.label)
    .filter(Boolean)
    .slice(0, 18);

  return [
    schema.title,
    schema.description || "",
    fieldLabel,
    fieldLabels.join(" "),
  ]
    .join(" ")
    .trim();
}

function buildKnowledgeOptions(schema: CustomReportSchema, fieldLabel: string) {
  const knowledge = findRelevantAiReportKnowledge({
    prompt: buildContextPrompt(schema, fieldLabel),
    limit: 140,
  });
  const normalizedFieldLabel = normalizeAiReportArabicText(fieldLabel);

  const directMatches = knowledge.items
    .filter((item) => {
      const itemFieldLabel = normalizeAiReportArabicText(item.fieldLabel);

      return (
        itemFieldLabel === normalizedFieldLabel ||
        itemFieldLabel.includes(normalizedFieldLabel) ||
        normalizedFieldLabel.includes(itemFieldLabel)
      );
    })
    .map((item) => cleanText(item.optionLabel))
    .filter(Boolean);

  const generalMatches = knowledge.items
    .map((item) => cleanText(item.optionLabel))
    .filter(Boolean);

  const labels = Array.from(new Set([...directMatches, ...generalMatches])).slice(0, 8);

  return labels.map((label, index) => ({
    label,
    value: normalizeOptionValue(label, index),
  }));
}

function buildFallbackOptions(fieldLabel: string) {
  const normalizedFieldLabel = normalizeAiReportArabicText(fieldLabel);
  const fallback = FIELD_OPTION_FALLBACKS.find((entry) =>
    entry.matchers.some((matcher) =>
      normalizedFieldLabel.includes(normalizeAiReportArabicText(matcher)),
    ),
  );

  if (!fallback) {
    return [];
  }

  return fallback.options.map((label, index) => ({
    label,
    value: normalizeOptionValue(label, index),
  }));
}

async function buildAiSuggestedOptions(
  schema: CustomReportSchema,
  fieldLabel: string,
  seedOptions: CustomReportOption[],
) {
  const content = await callDeepSeekChat({
    temperature: 0.1,
    maxTokens: 500,
    messages: [
      {
        role: "system",
        content:
          "أنت مساعد يصمم خيارات حقول تقارير تعليمية. أعد JSON فقط بالشكل {\"options\":[{\"label\":\"...\",\"value\":\"...\"}]}. يجب أن تكون الخيارات بالعربية الواضحة، من 4 إلى 8 خيارات فقط، مناسبة للحقل نفسه، وغير عامة. لا تضف حقل شواهد، ولا تضف الشواهد المقترحة، ولا تستخدم نصوصًا مشوشة.",
      },
      {
        role: "user",
        content: `
عنوان التقرير: ${schema.title}
وصف التقرير: ${schema.description || "لا يوجد وصف إضافي."}
الحقل المطلوب: ${fieldLabel}
الحقول الحالية في التقرير:
${schema.sections
  .flatMap((section) => section.fields)
  .map((field, index) => `${index + 1}. ${field.label}`)
  .join("\n")}

الخيارات المرشحة من بنك المعرفة:
${seedOptions.map((option, index) => `${index + 1}. ${option.label}`).join("\n") || "لا توجد مرشحات كافية."}

قواعد صارمة:
- أعد 4 إلى 8 خيارات فقط.
- إذا استخدمت قيمة option.value فلتكن english_snake_case.
- يجب أن تكون الخيارات مرتبطة بالحقل "${fieldLabel}" نفسه.
- لا تضف "الشواهد المقترحة".
- لا تضف خيارات فارغة أو مكررة.
        `.trim(),
      },
    ],
  });

  const parsed = extractJsonObject(content) as { options?: unknown };
  return normalizeOptions(parsed.options);
}

export async function POST(request: Request) {
  const context = await requireCustomReportContext();

  if (!context.ok) {
    return NextResponse.json(
      { success: false, error: context.message },
      { status: context.status },
    );
  }

  const body = await request.json().catch(() => null);
  const schema =
    body?.schema && typeof body.schema === "object"
      ? (body.schema as CustomReportSchema)
      : null;
  const fieldLabel = cleanText(body?.fieldLabel);
  const fieldType = cleanText(body?.fieldType);

  if (!schema || !fieldLabel || fieldType !== "multi_select") {
    return NextResponse.json(
      {
        success: false,
        error: "بيانات اقتراح الخيارات غير صالحة.",
      },
      { status: 400 },
    );
  }

  const knowledgeOptions = buildKnowledgeOptions(schema, fieldLabel);
  const fallbackOptions = buildFallbackOptions(fieldLabel);

  try {
    const aiOptions = await buildAiSuggestedOptions(schema, fieldLabel, [
      ...knowledgeOptions,
      ...fallbackOptions,
    ]);
    const options = dedupeOptions(aiOptions).slice(0, 8);

    if (options.length >= 4) {
      return NextResponse.json({ success: true, options });
    }
  } catch {
    // Fall back safely to grounded options below.
  }

  const options = dedupeOptions([...knowledgeOptions, ...fallbackOptions]).slice(0, 8);

  if (options.length < 4) {
    return NextResponse.json(
      {
        success: false,
        error: "تعذر اقتراح خيارات كافية لهذا الحقل. اكتبها يدويًا أو جرّب اسم حقل أوضح.",
      },
      { status: 422 },
    );
  }

  return NextResponse.json({ success: true, options });
}
