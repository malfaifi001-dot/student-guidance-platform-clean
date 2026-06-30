import { NextResponse } from "next/server";

import { callDeepSeekChat } from "@/lib/ai/deepseek-client";
import {
  findRelevantAiReportKnowledge,
  normalizeAiReportArabicText,
} from "@/lib/ai-report/ai-report-knowledge-retriever";
import { normalizeAiReportSchema } from "@/lib/ai-report/ai-report-runtime-adapter";
import {
  sanitizeAiReportSchema,
  sanitizeAiReportText,
} from "@/lib/ai-report/ai-report-text-sanitizer";
import type {
  AiReportKnowledgeItem,
  AiReportKnowledgeSearchResult,
} from "@/lib/ai-report/ai-report-knowledge-types";
import { requireCustomReportContext } from "@/lib/custom-report/custom-report-auth";
import { extractJsonObject } from "@/lib/custom-report/custom-report-normalizer";
import type {
  CustomReportField,
  CustomReportOption,
  CustomReportSchema,
} from "@/lib/custom-report/custom-report-types";

type AiReport2SelectedReport = {
  reportSlug: string;
  reportName: string;
  reason?: string;
  confidence?: number;
};

type AiReport2FieldSuggestion = {
  key?: unknown;
  label?: unknown;
  type?: unknown;
  options?: unknown;
  placeholder?: unknown;
  helpText?: unknown;
  source?: unknown;
  sourceReportSlug?: unknown;
  sourceFieldKey?: unknown;
};

type AiReport2ModelResult = {
  confidence?: unknown;
  intentFamily?: unknown;
  reportIntent?: unknown;
  reasoningSummary?: unknown;
  selectedReports?: unknown;
  fields?: unknown;
  schema?: unknown;
};

type IntentFamilyBlueprint = {
  family: string;
  label: string;
  description: string;
  keywords: string[];
  recommendedFields: string[];
  avoidUnlessExplicit: string[];
};

const MAX_FIELDS = 10;
const MAX_OPTIONS_PER_FIELD = 8;
const MAX_KNOWLEDGE_ITEMS_FOR_MODEL = 240;

const INTENT_FAMILY_BLUEPRINTS: IntentFamilyBlueprint[] = [
  {
    family: "EVENT_ACTIVITY",
    label: "فعالية أو نشاط أو مناسبة",
    description:
      "يستخدم عندما يتحدث الوصف عن احتفالية، مناسبة، فعالية، أسبوع، حملة، معرض، مشاركة، برنامج، إذاعة، يوم وطني، يوم عالمي، أو نشاط مدرسي عام.",
    keywords: [
      "احتفالية",
      "اليوم الوطني",
      "مناسبة",
      "فعالية",
      "نشاط",
      "برنامج",
      "أسبوع",
      "حملة",
      "معرض",
      "مشاركة",
      "إذاعة",
      "تفعيل",
      "مبادرة وطنية",
    ],
    recommendedFields: [
      "اسم الفعالية أو المناسبة",
      "تاريخ التنفيذ",
      "مكان التنفيذ",
      "الفئة المستهدفة",
      "عدد المشاركين أو المستفيدين",
      "وصف الفعالية والفقرات المنفذة",
      "الأهداف الوطنية أو التربوية",
      "الشواهد والتوثيق",
      "أثر الفعالية",
      "التوصيات",
    ],
    avoidUnlessExplicit: [
      "مستوى الإتقان",
      "نتائج الاختبار",
      "تحليل الدرجات",
      "استراتيجيات التدريس",
      "أداء المتعلمين في الحصة",
    ],
  },
  {
    family: "LESSON_PRACTICE",
    label: "درس أو ممارسة تدريسية",
    description:
      "يستخدم عندما يتحدث الوصف عن درس، حصة، استراتيجية تدريس، إدارة صفية، تعلم نشط، أدوات تقنية، أو تنفيذ خطة تعلم.",
    keywords: [
      "درس",
      "حصة",
      "استراتيجية",
      "تدريس",
      "تعلم نشط",
      "إدارة الصف",
      "خطة درس",
      "تقنية التعليم",
      "أداة رقمية",
    ],
    recommendedFields: [
      "موضوع الدرس",
      "المادة والصف",
      "الأهداف التعليمية",
      "استراتيجيات التدريس",
      "إجراءات التنفيذ",
      "أدوات التعلم",
      "مشاركة المتعلمين",
      "الشواهد",
      "التحديات",
      "التوصيات",
    ],
    avoidUnlessExplicit: [
      "احتفالية",
      "مناسبة وطنية",
      "عدد زوار المعرض",
      "فقرات الحفل",
    ],
  },
  {
    family: "RESULTS_ANALYSIS",
    label: "تحليل نتائج أو اختبار",
    description:
      "يستخدم عندما يتحدث الوصف عن نتائج، اختبار، درجات، إتقان، فجوات تعلم، تحليل مستوى، علاج ضعف، أو تحسن تحصيلي.",
    keywords: [
      "نتائج",
      "اختبار",
      "درجات",
      "إتقان",
      "تحليل",
      "فجوات",
      "ضعف",
      "تحسن",
      "تحصيلي",
      "نهاية وحدة",
    ],
    recommendedFields: [
      "اسم الاختبار أو الوحدة",
      "المادة والصف",
      "عدد الطلاب",
      "مستوى الإتقان",
      "أبرز الفجوات",
      "الطلاب المستهدفون بالدعم",
      "الإجراءات العلاجية",
      "الشواهد",
      "مؤشرات التحسن",
      "التوصيات",
    ],
    avoidUnlessExplicit: [
      "فقرات احتفالية",
      "مكان الفعالية",
      "مشاركات المجتمع",
    ],
  },
  {
    family: "INITIATIVE_PROJECT",
    label: "مبادرة أو مشروع تطويري",
    description:
      "يستخدم عندما يتحدث الوصف عن مبادرة، مشروع، خطة تطوير، برنامج تحسين، تجربة، أو ممارسة نوعية ممتدة.",
    keywords: [
      "مبادرة",
      "مشروع",
      "تطوير",
      "تحسين",
      "برنامج نوعي",
      "تجربة",
      "خطة تطوير",
    ],
    recommendedFields: [
      "اسم المبادرة",
      "الفئة المستهدفة",
      "مبررات المبادرة",
      "الأهداف",
      "آلية التنفيذ",
      "الأدوار والمسؤوليات",
      "الشواهد",
      "مؤشرات الأثر",
      "التحديات",
      "التوصيات",
    ],
    avoidUnlessExplicit: [
      "درجات الاختبار التفصيلية",
      "تحليل سؤال بسؤال",
    ],
  },
  {
    family: "COMMUNICATION_PARTNERSHIP",
    label: "تواصل أو شراكة",
    description:
      "يستخدم عندما يتحدث الوصف عن تواصل مع ولي أمر، شراكة مجتمعية، اجتماع، تنسيق، رسالة، أو تعاون.",
    keywords: [
      "تواصل",
      "ولي أمر",
      "شراكة",
      "اجتماع",
      "تنسيق",
      "رسالة",
      "تعاون",
      "مجتمع",
    ],
    recommendedFields: [
      "موضوع التواصل أو الشراكة",
      "الأطراف المشاركة",
      "تاريخ التنفيذ",
      "هدف التواصل",
      "الإجراءات المنفذة",
      "مخرجات التواصل",
      "الشواهد",
      "الأثر",
      "التحديات",
      "التوصيات",
    ],
    avoidUnlessExplicit: [
      "استراتيجية تدريس",
      "تحليل درجات",
    ],
  },
  {
    family: "PORTFOLIO_EVIDENCE",
    label: "ملف إنجاز أو شواهد",
    description:
      "يستخدم عندما يتحدث الوصف عن ملف إنجاز، شواهد، توثيق، منجزات، أعمال، أو أدلة أداء.",
    keywords: [
      "ملف إنجاز",
      "شواهد",
      "توثيق",
      "منجزات",
      "أدلة",
      "أعمال",
      "نماذج",
    ],
    recommendedFields: [
      "عنوان المنجز",
      "وصف المنجز",
      "مجال الارتباط بالأداء",
      "الشواهد المتاحة",
      "أثر المنجز",
      "الدروس المستفادة",
      "التحديات",
      "فرص التحسين",
      "التوصيات",
    ],
    avoidUnlessExplicit: [
      "نتائج اختبار",
      "فقرات حفل",
    ],
  },
  {
    family: "GENERAL_TEACHER_REPORT",
    label: "تقرير عام للمعلم",
    description:
      "يستخدم عندما يكون الوصف عامًا أو مختصرًا جدًا ولا يكفي لتحديد عائلة دقيقة.",
    keywords: [
      "تقرير",
      "توثيق",
      "تنفيذ",
      "متابعة",
      "عمل",
    ],
    recommendedFields: [
      "عنوان التقرير",
      "وصف مختصر",
      "تاريخ التنفيذ",
      "الفئة المستهدفة",
      "الإجراءات المنفذة",
      "الشواهد",
      "النتائج",
      "التحديات",
      "التوصيات",
    ],
    avoidUnlessExplicit: [],
  },
];

function cleanText(value: unknown) {
  return sanitizeAiReportText(String(value ?? "").trim());
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toConfidence(value: unknown, fallback = 0.68) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return clamp(value, 0, 1);
}

function normalizeKeyCandidate(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function uniqueFieldKey(label: string, index: number, usedKeys: Set<string>) {
  const candidate = normalizeKeyCandidate(label);
  const base = candidate || `ai_report2_field_${index + 1}`;

  let nextKey = base;
  let suffix = 2;

  while (usedKeys.has(nextKey)) {
    nextKey = `${base}_${suffix}`;
    suffix += 1;
  }

  usedKeys.add(nextKey);
  return nextKey;
}

function optionValue(label: string, index: number) {
  const normalized = normalizeKeyCandidate(label);
  return normalized || `option_${index + 1}`;
}

function normalizeOptions(value: unknown): CustomReportOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const options: CustomReportOption[] = [];

  for (const item of value) {
    const label =
      typeof item === "string"
        ? cleanText(item)
        : item && typeof item === "object"
          ? cleanText((item as Record<string, unknown>).label)
          : "";

    if (!label) {
      continue;
    }

    const dedupeKey = normalizeAiReportArabicText(label);

    if (!dedupeKey || seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    options.push({
      label,
      value: label === "أخرى" ? "other" : optionValue(label, options.length),
    });

    if (options.length >= MAX_OPTIONS_PER_FIELD) {
      break;
    }
  }

  return options;
}

function detectFieldType(type: unknown, options: CustomReportOption[]) {
  const rawType = cleanText(type).toLowerCase();

  if (options.length > 0) {
    return "multi_select" as const;
  }

  if (rawType === "date" || rawType.includes("date") || rawType.includes("تاريخ")) {
    return "date" as const;
  }

  return "textarea" as const;
}

function countSchemaFields(schema: CustomReportSchema) {
  return schema.sections.reduce(
    (total, section) => total + section.fields.length,
    0,
  );
}

function getIntentFamilyBlueprint(family: string) {
  return (
    INTENT_FAMILY_BLUEPRINTS.find((item) => item.family === family) ||
    INTENT_FAMILY_BLUEPRINTS[INTENT_FAMILY_BLUEPRINTS.length - 1]
  );
}

function inferIntentFamilyHints(prompt: string) {
  const normalizedPrompt = normalizeAiReportArabicText(prompt);

  return INTENT_FAMILY_BLUEPRINTS.map((blueprint) => {
    const matchedKeywords = blueprint.keywords.filter((keyword) =>
      normalizedPrompt.includes(normalizeAiReportArabicText(keyword)),
    );

    return {
      family: blueprint.family,
      label: blueprint.label,
      score: matchedKeywords.length,
      matchedKeywords,
      recommendedFields: blueprint.recommendedFields,
      avoidUnlessExplicit: blueprint.avoidUnlessExplicit,
    };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function normalizeSelectedReports(value: unknown): AiReport2SelectedReport[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const reportSlug = cleanText(record.reportSlug);
      const reportName = cleanText(record.reportName);

      if (!reportSlug && !reportName) {
        return null;
      }

      return {
        reportSlug,
        reportName,
        reason: cleanText(record.reason),
        confidence: toConfidence(record.confidence, 0.65),
      };
    })
    .filter(Boolean)
    .slice(0, 5) as AiReport2SelectedReport[];
}

function normalizeFieldsToSchema({
  prompt,
  result,
}: {
  prompt: string;
  result: AiReport2ModelResult;
}): CustomReportSchema | null {
  const rawSchema =
    result.schema && typeof result.schema === "object"
      ? (result.schema as Record<string, unknown>)
      : null;

  const rawFields = Array.isArray(result.fields)
    ? result.fields
    : rawSchema && Array.isArray(rawSchema.fields)
      ? rawSchema.fields
      : rawSchema &&
          Array.isArray(rawSchema.sections) &&
          rawSchema.sections[0] &&
          typeof rawSchema.sections[0] === "object" &&
          Array.isArray((rawSchema.sections[0] as Record<string, unknown>).fields)
        ? ((rawSchema.sections[0] as Record<string, unknown>).fields as unknown[])
        : [];

  if (!rawFields.length) {
    return null;
  }

  const usedKeys = new Set<string>();
  const fields = rawFields
    .map<CustomReportField | null>((field, index) => {
      if (!field || typeof field !== "object") {
        return null;
      }

      const record = field as AiReport2FieldSuggestion;
      const label = cleanText(record.label);

      if (!label) {
        return null;
      }

      const options = normalizeOptions(record.options);
      const type = detectFieldType(record.type, options);

      return {
        key: uniqueFieldKey(cleanText(record.key) || label, index, usedKeys),
        label,
        type,
        required: false,
        placeholder:
          type === "date"
            ? ""
            : cleanText(record.placeholder) || `اكتب ${label}`,
        helpText:
          cleanText(record.helpText) ||
          (options.length
            ? "يمكن اختيار أكثر من قيمة، وجميع الحقول اختيارية."
            : "حقل اختياري يكتبه المعلم عند الحاجة."),
        reportLabel: label,
        showInReport: true,
        order: index + 1,
        options,
      };
    })
    .filter((field): field is CustomReportField => field !== null)
    .slice(0, MAX_FIELDS);

  if (fields.length < 2) {
    return null;
  }

  const title =
    rawSchema && cleanText(rawSchema.title)
      ? cleanText(rawSchema.title)
      : `تقرير ذكي تجريبي - ${prompt.slice(0, 45)}`;

  const description =
    rawSchema && cleanText(rawSchema.description)
      ? cleanText(rawSchema.description)
      : "نموذج تجريبي مبني بواسطة DeepSeek من بنك قيم تقييم أداء المعلم.";

  return {
    title,
    description,
    version: 1,
    sections: [
      {
        id: "ai_report2_section_1",
        title: "بيانات التقرير الذكي التجريبي",
        description,
        order: 1,
        fields,
      },
    ],
  };
}

function groupKnowledgeByField(items: AiReportKnowledgeItem[]) {
  const map = new Map<
    string,
    {
      reportSlug: string;
      reportName: string;
      performanceElement: string;
      performanceElementCode: string;
      performanceElementLabel: string;
      reportCategory: string;
      category: string;
      fieldKey: string;
      fieldLabel: string;
      inputType: string;
      options: string[];
    }
  >();

  for (const item of items) {
    const fieldLabel = cleanText(item.fieldLabel || item.category || "حقل");
    const fieldKey = cleanText(item.fieldKey || fieldLabel);
    const key = `${item.reportSlug}::${fieldKey}::${fieldLabel}`;

    const existing =
      map.get(key) ||
      {
        reportSlug: item.reportSlug,
        reportName: item.reportName,
        performanceElement: item.performanceElement,
        performanceElementCode: item.performanceElement,
        performanceElementLabel: item.performanceElement,
        reportCategory: item.reportCategory,
        category: item.category,
        fieldKey,
        fieldLabel,
        inputType: item.inputType,
        options: [],
      };

    const option = cleanText(item.optionLabel);

    if (
      item.sourceType === "value_bank" &&
      option &&
      !existing.options.some(
        (current) =>
          normalizeAiReportArabicText(current) === normalizeAiReportArabicText(option),
      )
    ) {
      existing.options.push(option);
    }

    map.set(key, existing);
  }

  return Array.from(map.values());
}

function buildKnowledgeForModel({
  prompt,
  knowledge,
}: {
  prompt: string;
  knowledge: AiReportKnowledgeSearchResult;
}) {
  const groupedFields = groupKnowledgeByField(
    knowledge.items.slice(0, MAX_KNOWLEDGE_ITEMS_FOR_MODEL),
  ).slice(0, 110);

  return {
    intentFamilyBlueprints: INTENT_FAMILY_BLUEPRINTS.map((blueprint) => ({
      family: blueprint.family,
      label: blueprint.label,
      description: blueprint.description,
      keywords: blueprint.keywords,
      recommendedFields: blueprint.recommendedFields,
      avoidUnlessExplicit: blueprint.avoidUnlessExplicit,
    })),
    systemIntentHints: inferIntentFamilyHints(prompt),
    topReports: knowledge.topReports.slice(0, 20).map((report) => ({
      reportSlug: report.reportSlug,
      reportName: report.reportName,
      performanceElement: report.performanceElement,
      reportCategory: report.reportCategory,
      templatePattern: report.templatePattern,
      score: Math.round(report.score),
      matchedItemsCount: report.matchedItemsCount,
    })),
    candidateFields: groupedFields.map((field) => ({
      reportSlug: field.reportSlug,
      reportName: field.reportName,
      performanceElement: field.performanceElement,
      reportCategory: field.reportCategory,
      category: field.category,
      fieldKey: field.fieldKey,
      fieldLabel: field.fieldLabel,
      inputType: field.inputType,
      options: field.options.slice(0, MAX_OPTIONS_PER_FIELD),
    })),
  };
}

function buildBlueprintFallbackSchema({
  prompt,
  intentFamily,
  selectedReportName,
}: {
  prompt: string;
  intentFamily: string;
  selectedReportName?: string;
}): CustomReportSchema {
  const blueprint = getIntentFamilyBlueprint(intentFamily);
  const usedKeys = new Set<string>();

  const fields = blueprint.recommendedFields
    .slice(0, MAX_FIELDS)
    .map<CustomReportField>((label, index) => {
    const isDate = label.includes("تاريخ");
    const isMulti =
      label.includes("الأهداف") ||
      label.includes("الشواهد") ||
      label.includes("التحديات") ||
      label.includes("التوصيات") ||
      label.includes("الفئة") ||
      label.includes("استراتيجيات") ||
      label.includes("أدوات") ||
      label.includes("إجراءات");

    const options =
      isMulti && blueprint.family === "EVENT_ACTIVITY"
        ? normalizeOptions(
            label.includes("الأهداف")
              ? [
                  "تعزيز الانتماء الوطني",
                  "إبراز قيم المواطنة",
                  "تنمية روح المشاركة",
                  "تعزيز الاعتزاز بالهوية الوطنية",
                  "ربط الطلاب بالمناسبات الوطنية",
                ]
              : label.includes("الشواهد")
                ? [
                    "صور من الفعالية",
                    "فيديو توثيقي",
                    "إعلان أو تعميم",
                    "نماذج مشاركات الطلاب",
                    "تغذية راجعة من المشاركين",
                  ]
                : label.includes("التوصيات")
                  ? [
                      "توسيع مشاركة الطلاب",
                      "تنويع فقرات البرنامج",
                      "توثيق الشواهد مبكرًا",
                      "إشراك المجتمع المدرسي",
                    ]
                  : [],
          )
        : [];

    return {
      key: uniqueFieldKey(label, index, usedKeys),
      label,
      type: isDate ? "date" : options.length ? "multi_select" : "textarea",
      required: false,
      placeholder: isDate ? "" : `اكتب ${label}`,
      helpText: options.length
        ? "يمكن اختيار أكثر من قيمة، وجميع الحقول اختيارية."
        : "حقل اختياري في صلب التقرير.",
      reportLabel: label,
      showInReport: true,
      order: index + 1,
      options,
    };
    });

  return {
    version: 1,
    title: selectedReportName
      ? `تقرير ذكي تجريبي - ${selectedReportName}`
      : `تقرير ذكي تجريبي - ${prompt.slice(0, 45)}`,
    description: `نموذج احتياطي مبني على عائلة: ${blueprint.label}.`,
    sections: [
      {
        id: "ai_report2_section_1",
        title: "بيانات التقرير الذكي التجريبي",
        description: "جميع الحقول اختيارية ومقننة.",
        order: 1,
        fields,
      },
    ],
  };
}

function buildFallbackSchema({
  prompt,
  knowledge,
  modelResult,
}: {
  prompt: string;
  knowledge: AiReportKnowledgeSearchResult;
  modelResult: AiReport2ModelResult | null;
}): CustomReportSchema {
  const family = cleanText(modelResult?.intentFamily);
  const fallbackFamily =
    family ||
    inferIntentFamilyHints(prompt)[0]?.family ||
    "GENERAL_TEACHER_REPORT";

  const selectedReportName =
    normalizeSelectedReports(modelResult?.selectedReports)[0]?.reportName ||
    knowledge.topReports[0]?.reportName;

  return buildBlueprintFallbackSchema({
    prompt,
    intentFamily: fallbackFamily,
    selectedReportName,
  });
}

function countBankAndCustomUsage(schema: CustomReportSchema) {
  let bankValuesUsed = 0;
  let customValuesUsed = 0;

  for (const field of schema.sections.flatMap((section) => section.fields)) {
    if (field.options?.length) {
      bankValuesUsed += field.options.length;
    } else {
      customValuesUsed += 1;
    }
  }

  return {
    bankValuesUsed,
    customValuesUsed,
  };
}


function isDateOnlyField(label: string) {
  const normalized = normalizeAiReportArabicText(label);

  return (
    (normalized.includes("تاريخ") ||
      normalized.includes("موعد") ||
      normalized.includes("اليوم")) &&
    !normalized.includes("مكان") &&
    !normalized.includes("فقرات") &&
    !normalized.includes("وصف")
  );
}

function isNumericValueField(label: string) {
  const normalized = normalizeAiReportArabicText(label);

  return (
    normalized.includes("عدد") ||
    normalized.includes("كمية") ||
    normalized.includes("نسبة") ||
    normalized.includes("معدل") ||
    normalized.includes("درجة") ||
    normalized.includes("درجات") ||
    normalized.includes("مدة") ||
    normalized.includes("ساعات") ||
    normalized.includes("دقائق") ||
    normalized.includes("الحضور") ||
    normalized.includes("الغياب") ||
    normalized.includes("المستفيدين") ||
    normalized.includes("المشاركين") ||
    normalized.includes("المكرمين")
  );
}

function isFreeTextValueField(label: string) {
  const normalized = normalizeAiReportArabicText(label);

  return (
    normalized.includes("اسم") ||
    normalized.includes("عنوان") ||
    normalized.includes("موضوع") ||
    normalized.includes("وصف") ||
    normalized.includes("مكان") ||
    normalized.includes("جهة") ||
    normalized.includes("مصدر") ||
    normalized.includes("رابط") ||
    normalized.includes("ملاحظة")
  );
}

function dedupeChoiceOptions(options: CustomReportOption[]) {
  const seen = new Set<string>();
  const nextOptions: CustomReportOption[] = [];

  for (const option of options) {
    const label = cleanText(option.label);

    if (!label) {
      continue;
    }

    const key = normalizeAiReportArabicText(label);

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    nextOptions.push({
      label,
      value: label === "أخرى" ? "other" : optionValue(label, nextOptions.length),
    });

    if (nextOptions.length >= MAX_OPTIONS_PER_FIELD) {
      break;
    }
  }

  const optionsWithoutOther = nextOptions.filter(
    (option) => normalizeAiReportArabicText(option.label) !== normalizeAiReportArabicText("أخرى"),
  );

  return [
    ...optionsWithoutOther.slice(0, MAX_OPTIONS_PER_FIELD - 1),
    {
      label: "أخرى",
      value: "other",
    },
  ];
}

function labelHasAny(label: string, words: string[]) {
  const normalized = normalizeAiReportArabicText(label);

  return words.some((word) =>
    normalized.includes(normalizeAiReportArabicText(word)),
  );
}

function collectBankOptionsForField({
  label,
  knowledge,
  performanceElementCode,
}: {
  label: string;
  knowledge: AiReportKnowledgeSearchResult;
  performanceElementCode: string;
}) {
  const normalizedLabel = normalizeAiReportArabicText(label);
  const groupedFields = groupKnowledgeByField(knowledge.items);
  const scoredOptions: Array<{ option: string; score: number }> = [];

  for (const field of groupedFields) {
    const haystack = normalizeAiReportArabicText(
      [
        field.fieldLabel,
        field.fieldKey,
        field.category,
        field.reportName,
        field.performanceElementLabel,
        ...field.options,
      ].join(" "),
    );

    let score = 0;

    if (field.performanceElementCode === performanceElementCode) {
      score += 3;
    }

    for (const token of normalizedLabel.split(/\s+/).filter(Boolean)) {
      if (token.length >= 3 && haystack.includes(token)) {
        score += 2;
      }
    }

    if (
      normalizedLabel.includes(normalizeAiReportArabicText(field.fieldLabel)) ||
      normalizeAiReportArabicText(field.fieldLabel).includes(normalizedLabel)
    ) {
      score += 5;
    }

    if (score <= 0) {
      continue;
    }

    for (const option of field.options) {
      if (cleanText(option)) {
        scoredOptions.push({
          option,
          score,
        });
      }
    }
  }

  return normalizeOptions(
    scoredOptions
      .sort((a, b) => b.score - a.score)
      .map((item) => item.option),
  );
}

function buildContextualChoiceOptions({
  label,
  family,
}: {
  label: string;
  family: string;
}) {
  if (labelHasAny(label, ["خطوات", "إجراءات", "آلية", "فقرات", "تنفيذ"])) {
    return normalizeOptions([
      "تحديد الهدف ومتطلبات التنفيذ",
      "تهيئة الطلاب أو المشاركين قبل التنفيذ",
      "توزيع الأدوار والمهام",
      "تنفيذ النشاط أو الدرس وفق الخطة",
      "توظيف الوسائل والأدوات المناسبة",
      "متابعة التفاعل أثناء التنفيذ",
      "توثيق الشواهد أثناء التنفيذ",
      "قياس الأثر واستخلاص النتائج",
    ]);
  }

  if (labelHasAny(label, ["تحديات", "صعوبات", "معوقات"])) {
    return normalizeOptions([
      "ضيق وقت التنفيذ",
      "تفاوت مستويات الطلاب أو المشاركين",
      "ضعف تفاعل بعض الطلاب",
      "الحاجة إلى أدوات أو تجهيزات إضافية",
      "تحديات تقنية أثناء التنفيذ",
      "صعوبة تنظيم الأدوار",
      "قلة الشواهد المتاحة",
      "الحاجة إلى متابعة لاحقة",
    ]);
  }

  if (labelHasAny(label, ["توصيات", "مقترحات", "تحسين"])) {
    return normalizeOptions([
      "تنويع أساليب التنفيذ في المرات القادمة",
      "توسيع مشاركة الطلاب",
      "إعداد الشواهد قبل التنفيذ بوقت كاف",
      "توفير دعم أو أدوات إضافية",
      "تكرار التجربة مع تحسين آلية التطبيق",
      "تعزيز دور الطلاب في التنفيذ",
      "متابعة أثر التنفيذ لاحقًا",
      "مشاركة التجربة مع الزملاء",
    ]);
  }

  if (labelHasAny(label, ["أهداف", "هدف"])) {
    if (family === "EVENT_ACTIVITY" || family === "ENVIRONMENT_VALUES_HEALTH") {
      return normalizeOptions([
        "تعزيز الانتماء الوطني",
        "إبراز قيم المواطنة",
        "تنمية روح المشاركة",
        "تعزيز الاعتزاز بالهوية الوطنية",
        "ربط الطلاب بالمناسبات الوطنية والقيمية",
        "تنمية المسؤولية المجتمعية",
        "إثراء البيئة المدرسية",
      ]);
    }

    return normalizeOptions([
      "تحسين مستوى تعلم الطلاب",
      "تعزيز مشاركة الطلاب",
      "تنمية مهارات التفكير",
      "معالجة جوانب الضعف",
      "رفع مستوى الإتقان",
      "تنمية مهارات التواصل",
      "تحقيق نواتج التعلم",
    ]);
  }

  if (labelHasAny(label, ["شواهد", "توثيق", "أدلة"])) {
    return normalizeOptions([
      "صور من التنفيذ",
      "فيديو توثيقي",
      "نماذج من أعمال الطلاب",
      "رابط أو ملف داعم",
      "تعميم أو إعلان",
      "قائمة حضور أو مشاركة",
      "تغذية راجعة من الطلاب أو المشاركين",
      "نتائج أو مؤشرات قياس",
    ]);
  }

  if (labelHasAny(label, ["أثر", "نتائج", "مخرجات"])) {
    return normalizeOptions([
      "تحسن تفاعل الطلاب",
      "زيادة مستوى المشاركة",
      "تحقق أهداف التنفيذ بدرجة مناسبة",
      "ارتفاع الوعي بالموضوع",
      "تحسن في الأداء أو السلوك المستهدف",
      "ظهور مخرجات قابلة للتوثيق",
      "الحاجة إلى متابعة إضافية",
    ]);
  }

  if (labelHasAny(label, ["الفئة", "المستهدفة", "المشاركين", "المستفيدين"])) {
    return normalizeOptions([
      "طلاب الصفوف الأولية",
      "طلاب الصفوف العليا",
      "طلاب المرحلة المتوسطة",
      "طلاب المرحلة الثانوية",
      "مجموعة مختارة من الطلاب",
      "جميع طلاب الصف",
      "أولياء الأمور",
      "المجتمع المدرسي",
    ]);
  }

  if (labelHasAny(label, ["المادة", "الصف"])) {
    return normalizeOptions([
      "الرياضيات - الصفوف العليا",
      "العلوم - الصفوف العليا",
      "لغتي - الصفوف الأولية",
      "الدراسات الإسلامية",
      "اللغة الإنجليزية",
      "المهارات الرقمية",
      "جميع مواد الصف",
      "حسب المادة والصف المستهدف",
    ]);
  }

  if (labelHasAny(label, ["موضوع", "عنوان", "اسم"])) {
    return normalizeOptions([
      "يحدد حسب موضوع التنفيذ",
      "مرتبط بخطة الدرس أو النشاط",
      "مرتبط بمناسبة أو فعالية مدرسية",
      "مرتبط بمهارة تعليمية محددة",
      "مرتبط ببرنامج أو مبادرة",
      "مرتبط بتحسين أداء الطلاب",
      "مرتبط بتوثيق منجز مهني",
    ]);
  }

  if (labelHasAny(label, ["مكان"])) {
    return normalizeOptions([
      "الفصل الدراسي",
      "مصادر التعلم",
      "ساحة المدرسة",
      "المسرح المدرسي",
      "المعمل",
      "منصة رقمية",
      "بيئة تعلم خارجية",
    ]);
  }

  if (labelHasAny(label, ["وسائل", "أدوات", "تقنية"])) {
    return normalizeOptions([
      "عرض مرئي",
      "أوراق عمل",
      "منصة رقمية",
      "أداة تفاعلية",
      "بطاقات تعليمية",
      "فيديو تعليمي",
      "خرائط مفاهيم",
      "نماذج تطبيقية",
    ]);
  }

  if (labelHasAny(label, ["مشاركة", "تفاعل"])) {
    return normalizeOptions([
      "مشاركة فردية",
      "مشاركة جماعية",
      "مناقشة صفية",
      "عرض طلابي",
      "تعاون بين الطلاب",
      "تفاعل عبر أداة رقمية",
      "مبادرة من الطلاب",
    ]);
  }

  return normalizeOptions([
    "يناسب سياق التقرير",
    "يحتاج إلى توضيح من المعلم",
    "مرتبط بتنفيذ النشاط أو الدرس",
    "مرتبط بالشواهد المتاحة",
    "مرتبط بنتائج التنفيذ",
    "مرتبط بتحسين الممارسة",
  ]);
}

function buildChoiceOptionsForField({
  label,
  existingOptions,
  knowledge,
  family,
  performanceElementCode,
}: {
  label: string;
  existingOptions: CustomReportOption[];
  knowledge: AiReportKnowledgeSearchResult;
  family: string;
  performanceElementCode: string;
}) {
  const bankOptions = collectBankOptionsForField({
    label,
    knowledge,
    performanceElementCode,
  });

  const contextualOptions = buildContextualChoiceOptions({
    label,
    family,
  });

  return dedupeChoiceOptions([
    ...existingOptions,
    ...bankOptions,
    ...contextualOptions,
  ]);
}

function enforceChoiceFirstSchema({
  schema,
  prompt,
  knowledge,
  intentFamily,
  performanceElementCode,
}: {
  schema: CustomReportSchema;
  prompt: string;
  knowledge: AiReportKnowledgeSearchResult;
  intentFamily: string;
  performanceElementCode: string;
}): CustomReportSchema {
  return {
    ...schema,
    title: schema.title || `تقرير ذكي تجريبي - ${prompt.slice(0, 45)}`,
    sections: schema.sections.map((section) => ({
      ...section,
      fields: section.fields.slice(0, MAX_FIELDS).map((field, index) => {
        const label = cleanText(field.label || field.reportLabel || `حقل ${index + 1}`);

        if (isDateOnlyField(label)) {
          return {
            ...field,
            label,
            type: "date",
            required: false,
            options: [],
            order: index + 1,
          };
        }

        if (isNumericValueField(label)) {
          return {
            ...field,
            label,
            type: "number",
            required: false,
            placeholder: "أدخل الرقم فقط",
            helpText: "هذا الحقل رقمي، لذلك لا يظهر كاختيارات متعددة.",
            reportLabel: field.reportLabel || label,
            showInReport: true,
            options: [],
            order: index + 1,
          };
        }

        if (isFreeTextValueField(label)) {
          return {
            ...field,
            label,
            type: "textarea",
            required: false,
            placeholder: `اكتب ${label}`,
            helpText: "هذا الحقل يحتاج قيمة يكتبها المعلم حسب سياق التقرير.",
            reportLabel: field.reportLabel || label,
            showInReport: true,
            options: [],
            order: index + 1,
          };
        }

        const options = buildChoiceOptionsForField({
          label,
          existingOptions: normalizeOptions(field.options || []),
          knowledge,
          family: intentFamily,
          performanceElementCode,
        });

        return {
          ...field,
          label,
          type: "multi_select",
          required: false,
          placeholder: "",
          helpText: "اختر قيمة أو أكثر. جميع الحقول اختيارية ويمكن اختيار أخرى عند الحاجة.",
          reportLabel: field.reportLabel || label,
          showInReport: true,
          order: index + 1,
          options,
        };
      }),
    })),
  };
}
async function buildDeepSeekLedSchema({
  prompt,
  knowledge,
}: {
  prompt: string;
  knowledge: AiReportKnowledgeSearchResult;
}) {
  const knowledgeForModel = buildKnowledgeForModel({
    prompt,
    knowledge,
  });

  const content = await callDeepSeekChat({
    temperature: 0.22,
    maxTokens: 3800,
    messages: [
      {
        role: "system",
        content: [
          "أنت محرك فهم ذكي لبناء تقارير أداء المعلم داخل منصة مدرسية عربية.",
          "مهمتك الأساسية: فهم نية المعلم من وصف قصير جدًا أحيانًا، ثم بناء نموذج مختصر ودقيق.",
          "",
          "لا تفترض أن كل تقرير للمعلم هو درس تعليمي.",
          "قد يكون التقرير عن فعالية، احتفالية، يوم وطني، مبادرة، شراكة، تحليل نتائج، درس، ملف إنجاز، أو تقرير عام.",
          "",
          "طريقة التفكير المطلوبة داخليًا قبل إخراج JSON:",
          "1. افهم المعنى العام للوصف.",
          "2. اختر intentFamily الأنسب من عائلات التقارير المعطاة.",
          "3. راجع topReports وcandidateFields، لكن لا تتبعها إذا كانت تخالف معنى الوصف.",
          "4. استخدم بنك القيم قدر الإمكان.",
          "5. عند نقص البنك أو عدم مناسبته، أضف حقولًا مخصصة قليلة مناسبة للسياق.",
          "6. تجنب خلط العائلات: لا تضع حقول الإتقان والاختبارات في تقرير احتفالية إلا إذا ذكر المستخدم نتائج أو اختبار صراحة.",
          "",
          "القواعد الصارمة:",
          `- الحد الأقصى ${MAX_FIELDS} حقول فقط.`,
          "- كل الحقول required=false.",
          "- أي حقل يحتوي عدة قيم أو عدة نصوص يجب أن يكون type=multi_select.",
          "- الحقول النصية المفتوحة تكون textarea.",
          "- التاريخ يكون date.",
          "- لا تستخدم select أو radio.",
          "- لا تنشئ حقول upload.",
          "- لا تكرر نفس المعنى بأسماء مختلفة.",
          "- اجعل الحقول في صلب الموضوع، وليست عامة جدًا.",
          "- لا تجعل كل شيء من البنك إذا كان البنك غير مناسب للسياق.",
          "- مسموح 2 إلى 4 حقول مخصصة إذا كانت تخدم المعنى.",
          "",
          "أمثلة فهم:",
          "- 'تقرير تنفيذ احتفالية اليوم الوطني' => EVENT_ACTIVITY، وليس درسًا ولا تحليل نتائج.",
          "- 'تقرير تحليل نتائج نهاية الوحدة' => RESULTS_ANALYSIS.",
          "- 'تقرير تنوع استراتيجيات التدريس' => LESSON_PRACTICE.",
          "- 'تقرير مبادرة تحسين القراءة' => INITIATIVE_PROJECT.",
          "",
          "أعد JSON فقط بدون Markdown وبدون شرح خارجي بهذا الشكل:",
          `{
  "confidence": 0.82,
  "intentFamily": "EVENT_ACTIVITY | LESSON_PRACTICE | RESULTS_ANALYSIS | INITIATIVE_PROJECT | COMMUNICATION_PARTNERSHIP | PORTFOLIO_EVIDENCE | GENERAL_TEACHER_REPORT",
  "reportIntent": "نية التقرير",
  "reasoningSummary": "سبب اختيار العائلة والحقول باختصار",
  "selectedReports": [
    {
      "reportSlug": "slug من البنك إن وجد",
      "reportName": "اسم التقرير الأقرب",
      "reason": "سبب الاختيار",
      "confidence": 0.8
    }
  ],
  "fields": [
    {
      "key": "english_or_snake_key",
      "label": "اسم الحقل بالعربي",
      "type": "textarea | multi_select | date",
      "placeholder": "نص مساعد",
      "helpText": "معلومة قصيرة",
      "source": "bank | custom",
      "sourceReportSlug": "slug عند وجوده",
      "sourceFieldKey": "field_key عند وجوده",
      "options": [
        { "label": "قيمة من البنك أو قيمة مخصصة مناسبة" }
      ]
    }
  ],
  "schema": {
    "title": "عنوان التقرير",
    "description": "وصف مختصر"
  }
}`,
        ].join("\n"),
      },
      {
        role: "user",
        content: [
          "وصف المعلم:",
          prompt,
          "",
          "مواد البحث المرسلة لك:",
          JSON.stringify(knowledgeForModel, null, 2),
        ].join("\n"),
      },
    ],
  });

  return extractJsonObject(content) as AiReport2ModelResult;
}

export async function POST(request: Request) {
  const authContext = await requireCustomReportContext();

  if (!authContext.ok) {
    return NextResponse.json(
      { success: false, error: authContext.message },
      { status: authContext.status },
    );
  }

  const body = await request.json().catch(() => null);
  const prompt = cleanText(body?.prompt);

  if (prompt.length < 3) {
    return NextResponse.json(
      {
        success: false,
        error: "اكتب وصفًا مختصرًا للتقرير المطلوب.",
      },
      { status: 400 },
    );
  }

  const knowledge = findRelevantAiReportKnowledge({
    prompt,
    limit: 420,
  });

  let modelResult: AiReport2ModelResult | null = null;
  let schema: CustomReportSchema | null = null;

  try {
    modelResult = await buildDeepSeekLedSchema({
      prompt,
      knowledge,
    });

    schema = normalizeFieldsToSchema({
      prompt,
      result: modelResult,
    });
  } catch {
    modelResult = null;
    schema = null;
  }

  const selectedReports =
    normalizeSelectedReports(modelResult?.selectedReports).length > 0
      ? normalizeSelectedReports(modelResult?.selectedReports)
      : knowledge.topReports.slice(0, 3).map((report) => ({
          reportSlug: report.reportSlug,
          reportName: report.reportName,
          reason: "أقرب تقرير حسب بنك القيم.",
          confidence: 0.62,
        }));

  const nextSchema =
    schema && countSchemaFields(schema) >= 2
      ? schema
      : buildFallbackSchema({
          prompt,
          knowledge,
          modelResult,
        });

  const intentFamily =
    cleanText(modelResult?.intentFamily) ||
    inferIntentFamilyHints(prompt)[0]?.family ||
    "GENERAL_TEACHER_REPORT";

  const performanceElement =
    knowledge.topReports[0]?.performanceElement ||
    selectedReports[0]?.reportName ||
    intentFamily;

  const choiceFirstSchema = enforceChoiceFirstSchema({
    schema: nextSchema,
    prompt,
    knowledge,
    intentFamily,
    performanceElementCode: performanceElement,
  });

  const sanitizedSchema = normalizeAiReportSchema(
    sanitizeAiReportSchema(choiceFirstSchema),
  );

  const usage = countBankAndCustomUsage(sanitizedSchema);

  return NextResponse.json({
    success: true,
    confidence: toConfidence(
      modelResult?.confidence,
      selectedReports[0]?.confidence || 0.66,
    ),
    intentFamily,
    performanceElement,
    reportIntent: cleanText(modelResult?.reportIntent) || "تقرير تقييم أداء المعلم",
    reasoningSummary:
      cleanText(modelResult?.reasoningSummary) ||
      "تم اختيار الحقول بناءً على فهم سياق التقرير ومقارنته ببنك قيم تقييم أداء المعلم.",
    selectedReports,
    bankValuesUsed: usage.bankValuesUsed,
    customValuesUsed: usage.customValuesUsed,
    schema: sanitizedSchema,
  });
}
