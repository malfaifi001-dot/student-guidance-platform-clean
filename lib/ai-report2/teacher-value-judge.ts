import { callDeepSeekChat } from "@/lib/ai/deepseek-client";
import { normalizeAiReportArabicText } from "@/lib/ai-report/ai-report-knowledge-retriever";
import { extractJsonObject } from "@/lib/custom-report/custom-report-normalizer";
import type {
  CustomReportOption,
  CustomReportSchema,
} from "@/lib/custom-report/custom-report-types";

import type { TeacherIntentAnalysis } from "./teacher-intent-engine";
import { normalizeTeacherOptions } from "./teacher-field-rules";

type ValueJudgeFieldDecision = {
  label?: unknown;
  acceptedOptions?: unknown;
  rejectedOptions?: unknown;
  suggestedOptions?: unknown;
  reason?: unknown;
};

type ValueJudgeModelResult = {
  summary?: unknown;
  fields?: unknown;
};

export type TeacherValueJudgeResult = {
  schema: CustomReportSchema;
  applied: boolean;
  summary: string;
  rejectedValues: Array<{
    fieldLabel: string;
    value: string;
    reason: string;
  }>;
};

const MAX_OPTIONS_PER_FIELD = 8;
const MAX_OPTION_LENGTH = 90;

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizedKey(value: string) {
  return normalizeAiReportArabicText(value);
}

function normalizeValueArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of value) {
    const label =
      typeof item === "string"
        ? cleanText(item)
        : item && typeof item === "object"
          ? cleanText(
              (item as Record<string, unknown>).label ??
                (item as Record<string, unknown>).value,
            )
          : "";

    if (!label) {
      continue;
    }

    const key = normalizedKey(label);

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(label);

    if (result.length >= MAX_OPTIONS_PER_FIELD) {
      break;
    }
  }

  return result;
}

function isTechnicallyBadOption(value: string) {
  const normalized = normalizedKey(value);
  const wordCount = value.split(/\s+/).filter(Boolean).length;

  return (
    value.length > MAX_OPTION_LENGTH ||
    wordCount > 14 ||
    value.includes("[") ||
    value.includes("]") ||
    value.includes("-------") ||
    value.includes("\\") ||
    normalized.includes("صورة الشاهد") ||
    normalized.includes("الشاهد الاول") ||
    normalized.includes("الشاهد الثاني") ||
    normalized.includes("بداية التنفيذ") ||
    normalized.includes("نهاية التنفيذ") ||
    normalized.includes("بطاقة تنفيذ برنامج") ||
    normalized.includes("عدد حصص البرنامج") ||
    normalized.includes("قيمة مناسبة") ||
    normalized.includes("يناسب سياق") ||
    normalized.includes("مرتبطة بهدف") ||
    normalized.includes("مرتبط بهدف") ||
    normalized.includes("مرتبطة بالشواهد") ||
    normalized.includes("مرتبط بالشواهد") ||
    normalized.includes("تحتاج الى تحديد") ||
    normalized.includes("يحتاج الى توضيح")
  );
}

function cleanAcceptedOptions(options: string[]) {
  return options.filter((option) => !isTechnicallyBadOption(option));
}

function similarLabel(leftValue: string, rightValue: string) {
  const left = normalizedKey(leftValue);
  const right = normalizedKey(rightValue);

  if (!left || !right) {
    return false;
  }

  if (left.includes(right) || right.includes(left)) {
    return true;
  }

  const leftTokens = left.split(/\s+/).filter((token) => token.length >= 3);
  const rightTokens = new Set(
    right.split(/\s+/).filter((token) => token.length >= 3),
  );

  return leftTokens.some((token) => rightTokens.has(token));
}

function normalizeDecisionMap(value: unknown) {
  const map = new Map<
    string,
    {
      label: string;
      acceptedOptions: string[];
      rejectedOptions: Array<{ value: string; reason: string }>;
      suggestedOptions: string[];
      reason: string;
    }
  >();

  if (!Array.isArray(value)) {
    return map;
  }

  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const record = item as ValueJudgeFieldDecision;
    const label = cleanText(record.label);

    if (!label) {
      continue;
    }

    const acceptedOptions = cleanAcceptedOptions(
      normalizeValueArray(record.acceptedOptions),
    );

    const suggestedOptions = cleanAcceptedOptions(
      normalizeValueArray(record.suggestedOptions),
    );

    const rejectedOptions = Array.isArray(record.rejectedOptions)
      ? record.rejectedOptions
          .map((option) => {
            if (typeof option === "string") {
              return {
                value: cleanText(option),
                reason: "قيمة غير مناسبة لهذا الحقل.",
              };
            }

            if (!option || typeof option !== "object") {
              return null;
            }

            const optionRecord = option as Record<string, unknown>;

            return {
              value: cleanText(optionRecord.value ?? optionRecord.label),
              reason:
                cleanText(optionRecord.reason) ||
                "قيمة غير مناسبة لهذا الحقل.",
            };
          })
          .filter(
            (
              option,
            ): option is {
              value: string;
              reason: string;
            } => Boolean(option?.value),
          )
      : [];

    map.set(normalizedKey(label), {
      label,
      acceptedOptions,
      rejectedOptions,
      suggestedOptions,
      reason: cleanText(record.reason),
    });
  }

  return map;
}

function buildFallbackOptionsForField(label: string, analysis: TeacherIntentAnalysis) {
  const normalized = normalizedKey(label);

  if (normalized.includes("الفئة") || normalized.includes("المستهدفة")) {
    if (analysis.primaryIntent.code === "STUDENT_RECOGNITION") {
      return [
        "الطلاب المتفوقون",
        "الطلاب المكرمون",
        "الطلاب الأكثر التزامًا",
        "مجموعة مختارة من الطلاب",
        "جميع طلاب الصف",
      ];
    }

    return [
      "طلاب الصف",
      "مجموعة مختارة من الطلاب",
      "الطلاب المستهدفون",
      "المجتمع المدرسي",
      "أولياء الأمور",
    ];
  }

  if (normalized.includes("اثر") || normalized.includes("أثر")) {
    return [
      "ارتفاع دافعية الطلاب",
      "زيادة مستوى المشاركة",
      "تعزيز السلوك الإيجابي",
      "تحسن التفاعل داخل البيئة التعليمية",
      "تحقق أهداف التنفيذ بدرجة مناسبة",
    ];
  }

  if (normalized.includes("اهداف") || normalized.includes("أهداف")) {
    return [
      "تعزيز الدافعية للتعلم",
      "تنمية روح المشاركة",
      "تحقيق أهداف التقرير",
      "إبراز الجوانب الإيجابية",
      "تحسين البيئة التعليمية",
    ];
  }

  if (normalized.includes("توصيات")) {
    return [
      "تكرار التجربة مع التحسين",
      "توسيع مشاركة الطلاب",
      "تنويع أساليب التنفيذ",
      "توثيق الشواهد مبكرًا",
      "متابعة الأثر لاحقًا",
    ];
  }

  if (normalized.includes("تحديات")) {
    return [
      "ضيق وقت التنفيذ",
      "تفاوت تفاعل الطلاب",
      "الحاجة إلى تنظيم أكبر",
      "الحاجة إلى أدوات داعمة",
      "قلة الشواهد المتاحة",
    ];
  }

  if (normalized.includes("شواهد") || normalized.includes("توثيق")) {
    return [
      "صور من التنفيذ",
      "فيديو توثيقي",
      "نماذج من أعمال الطلاب",
      "قائمة حضور أو مشاركة",
      "رابط أو ملف داعم",
    ];
  }
  return [];
}

function mergeJudgedOptions({
  acceptedOptions,
  suggestedOptions,
  fallbackOptions,
}: {
  acceptedOptions: string[];
  suggestedOptions: string[];
  fallbackOptions: string[];
}): CustomReportOption[] {
  const merged = [
    ...acceptedOptions,
    ...suggestedOptions,
    ...fallbackOptions,
  ];

  return normalizeTeacherOptions(merged, MAX_OPTIONS_PER_FIELD);
}

export async function judgeTeacherSchemaValues({
  schema,
  analysis,
}: {
  schema: CustomReportSchema;
  analysis: TeacherIntentAnalysis;
}): Promise<TeacherValueJudgeResult> {
  const multiSelectFields = schema.sections
    .flatMap((section) => section.fields)
    .filter((field) => field.type === "multi_select");

  if (!multiSelectFields.length) {
    return {
      schema,
      applied: false,
      summary: "لا توجد حقول اختيار متعدد تحتاج مراجعة قيم.",
      rejectedValues: [],
    };
  }

  const valuePayload = multiSelectFields.map((field) => ({
    label: field.label,
    type: field.type,
    helpText: field.helpText,
    options: (field.options || [])
      .map((option) => option.label)
      .filter(Boolean)
      .slice(0, MAX_OPTIONS_PER_FIELD),
  }));

  try {
    const content = await callDeepSeekChat({
      temperature: 0.08,
      maxTokens: 3600,
      messages: [
        {
          role: "system",
          content: [
            "أنت حكم جودة للقيم داخل نموذج تقرير معلم عربي.",
            "مهمتك مراجعة خيارات الحقول فقط، وليس إعادة بناء الحقول.",
            "",
            "احكم على كل خيار بالسؤال التالي:",
            "هل هذه القيمة تصلح فعلًا كخيار داخل هذا الحقل، بناءً على نية المعلم وعنصر الأداء؟",
            "",
            "ارفض أي قيمة تكون:",
            "- شاهدًا أو صورة أو ملفًا داخل حقل ليس شواهد.",
            "- تاريخًا أو مدة داخل حقل ليس تاريخًا أو مدة.",
            "- عددًا أو إحصائية داخل حقل ليس رقميًا.",
            "- نصًا طويلًا مركبًا وليس خيارًا قصيرًا.",
            "- تنتمي لحقل آخر مثل جهة التنفيذ أو عدد الحصص أو بطاقة البرنامج.",
            "- من بنك القيم لكنها لا تخدم نية المعلم.",
            "",
            "اقبل فقط القيم القصيرة الواضحة التي يمكن للمعلم اختيارها.",
            "إذا أصبحت الخيارات قليلة، اقترح خيارات بديلة مناسبة للمعلم.",
            "لا تكرر الخيارات.",
            "لا تستخدم قيمًا عامة مثل: قيمة مناسبة لسياق التقرير، مرتبطة بهدف التقرير، مرتبطة بالشواهد المتاحة.",
            "الأفضل إرجاع 4 أو 5 قيم قوية بدل 8 قيم ضعيفة.",
            "إذا لم توجد قيم مناسبة، اقترح قيمًا قصيرة ومباشرة من نية المعلم.",
            `الحد الأقصى ${MAX_OPTIONS_PER_FIELD} خيارات لكل حقل.`,
            "",
            "أعد JSON فقط بدون Markdown بهذا الشكل:",
            `{
  "summary": "ملخص قصير لما تم تنظيفه",
  "fields": [
    {
      "label": "اسم الحقل كما ورد",
      "acceptedOptions": ["قيمة مقبولة"],
      "rejectedOptions": [
        {
          "value": "قيمة مرفوضة",
          "reason": "سبب الرفض"
        }
      ],
      "suggestedOptions": ["قيمة بديلة مناسبة"],
      "reason": "سبب الحكم على قيم الحقل"
    }
  ]
}`,
          ].join("\n"),
        },
        {
          role: "user",
          content: [
            "تحليل نية المعلم:",
            JSON.stringify(
              {
                prompt: analysis.prompt,
                teacherIntent: analysis.primaryIntent.label,
                intentCode: analysis.primaryIntent.code,
                intentFamily: analysis.primaryIntent.family,
                performanceElement: analysis.resolvedPerformanceElementLabel,
                action: analysis.teacherAction,
                audience: analysis.teacherAudience,
                purpose: analysis.teacherPurpose,
                avoidUnlessExplicit: analysis.primaryIntent.avoidUnlessExplicit,
              },
              null,
              2,
            ),
            "",
            "الحقول وخياراتها الحالية:",
            JSON.stringify(valuePayload, null, 2),
          ].join("\n"),
        },
      ],
    });

    const result = extractJsonObject(content) as ValueJudgeModelResult;
    const decisions = normalizeDecisionMap(result.fields);
    const rejectedValues: TeacherValueJudgeResult["rejectedValues"] = [];

    const nextSchema: CustomReportSchema = {
      ...schema,
      sections: schema.sections.map((section) => ({
        ...section,
        fields: section.fields.map((field) => {
          if (field.type !== "multi_select") {
            return field;
          }

          const decision = Array.from(decisions.values()).find((item) =>
            similarLabel(item.label, field.label),
          );

          const fallbackOptions = buildFallbackOptionsForField(field.label, analysis);

          if (!decision) {
            const existingOptions = cleanAcceptedOptions(
              (field.options || []).map((option) => option.label),
            );

            return {
              ...field,
              options: mergeJudgedOptions({
                acceptedOptions: existingOptions,
                suggestedOptions: [],
                fallbackOptions,
              }),
            };
          }

          for (const rejected of decision.rejectedOptions) {
            rejectedValues.push({
              fieldLabel: field.label,
              value: rejected.value,
              reason: rejected.reason,
            });
          }

          return {
            ...field,
            helpText:
              field.helpText ||
              "تمت مراجعة الخيارات دلاليًا لتناسب نية المعلم.",
            options: mergeJudgedOptions({
              acceptedOptions: decision.acceptedOptions,
              suggestedOptions: decision.suggestedOptions,
              fallbackOptions,
            }),
          };
        }),
      })),
    };

    return {
      schema: nextSchema,
      applied: true,
      summary:
        cleanText(result.summary) ||
        "تمت مراجعة خيارات الحقول دلاليًا وفق نية المعلم.",
      rejectedValues,
    };
  } catch {
    return {
      schema,
      applied: false,
      summary:
        "تعذرت مراجعة القيم عبر DeepSeek، وتم استخدام النموذج بعد الحراسة الأساسية.",
      rejectedValues: [],
    };
  }
}