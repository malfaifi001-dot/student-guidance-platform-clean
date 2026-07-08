import type { RuntimeValues } from "@/engine/runtime/field-dependency-engine";
import type { RuntimeWorkflow } from "@/engine/runtime/runtime-resolver";
import type {
  CustomReportField,
  CustomReportFieldType,
  CustomReportSchema,
  CustomReportValues,
} from "@/lib/custom-report/custom-report-types";
import { sanitizeAiReportSchema } from "@/lib/ai-report/ai-report-text-sanitizer";

export type AiReportSchema = CustomReportSchema;

export type AiReportRuntimeWorkflow = RuntimeWorkflow & {
  service: {
    slug: string;
  };
};

type CustomReportOptionLike = {
  label: string;
  value: string;
  order?: number;
};

const AI_REPORT_SERVICE_SLUG = "custom-report";
const AI_REPORT_SINGLE_STEP_TITLE = "بيانات التقرير المخصص";
const SELECTABLE_FIELD_TYPES = new Set<CustomReportFieldType>([
  "select",
  "multi_select",
  "radio",
]);

const BOOLEAN_CHOICE_OPTIONS = [
  { label: "نعم", value: "yes" },
  { label: "لا", value: "no" },
];

const FIELD_TYPE_MAP: Record<CustomReportFieldType, string> = {
  text: "TEXT",
  textarea: "TEXTAREA",
  number: "NUMBER",
  date: "DATE",
  select: "SELECT",
  multi_select: "MULTI_SELECT",
  checkbox: "CHECKBOX",
  radio: "RADIO",
};

const EVIDENCE_KEYWORDS = [
  "الشواهد",
  "شواهد",
  "مساحه شاهد",
  "مساحة شاهد",
  "المرفقات",
  "مرفقات",
  "رفع ملف",
  "رفع ملفات",
  "رفع صوره",
  "رفع صورة",
  "file upload",
  "image upload",
  "attachments",
  "attachment",
  "evidence",
  "proposed evidence",
];

const FIELD_OPTION_FALLBACKS: Array<{
  matchers: string[];
  options: Array<{ label: string; value: string }>;
}> = [
  {
    matchers: ["طريقة التقييم", "اسلوب التقييم", "أداة التقييم", "اداة التقييم"],
    options: [
      { label: "اختبار قصير", value: "short_quiz" },
      { label: "ملاحظة أداء", value: "performance_observation" },
      { label: "مهمة أدائية", value: "performance_task" },
      { label: "ورقة عمل", value: "worksheet" },
      { label: "تقويم شفهي", value: "oral_assessment" },
      { label: "بطاقة خروج", value: "exit_ticket" },
    ],
  },
  {
    matchers: ["مستوى الإتقان", "مستوى الاتقان", "الإتقان العام", "الاتقان العام"],
    options: [
      { label: "متقن بدرجة عالية", value: "high_mastery" },
      { label: "متقن", value: "mastery" },
      { label: "متقن جزئيًا", value: "partial_mastery" },
      { label: "يحتاج دعمًا", value: "needs_support" },
      { label: "يحتاج خطة علاجية", value: "needs_remedial_plan" },
    ],
  },
  {
    matchers: ["الأهداف التعليمية", "الاهداف التعليمية", "نواتج التعلم", "الأهداف", "الاهداف"],
    options: [
      { label: "قياس تحقق نواتج التعلم", value: "measure_learning_outcomes" },
      { label: "تنمية مهارة محددة", value: "develop_specific_skill" },
      { label: "معالجة فجوات تعلم", value: "address_learning_gaps" },
      { label: "تعزيز المشاركة", value: "enhance_participation" },
      { label: "تحسين مستوى الإتقان", value: "improve_mastery_level" },
    ],
  },
  {
    matchers: ["التوصيات", "توصيات"],
    options: [
      { label: "تنفيذ نشاط علاجي", value: "implement_remedial_activity" },
      { label: "تقديم تغذية راجعة", value: "provide_feedback" },
      { label: "إعادة شرح المهارة", value: "reteach_skill" },
      { label: "متابعة التقدم", value: "monitor_progress" },
      { label: "توظيف تقويم قصير", value: "use_short_assessment" },
    ],
  },
  {
    matchers: ["الإجراءات", "الاجراءات", "إجراءات", "اجراءات"],
    options: [
      { label: "تحديد مستوى الطلاب", value: "identify_student_levels" },
      { label: "تنفيذ نشاط تطبيقي", value: "implement_applied_activity" },
      { label: "تحليل النتائج", value: "analyze_results" },
      { label: "تقديم دعم موجه", value: "provide_targeted_support" },
      { label: "توثيق المخرجات", value: "document_outputs" },
    ],
  },
];

function buildWorkflowId(schema: AiReportSchema) {
  const signature = schema.sections
    .map((section) => {
      const fieldKeys = section.fields.map((field) => field.key).join("-");
      return `${section.id}:${fieldKeys}`;
    })
    .join("|");

  return `ai-report:${schema.title}:${signature}`;
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}\s_-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasOtherOption(field: CustomReportField) {
  return Boolean(field.options?.some((option) => option.value === "other"));
}

function isEvidenceLikeField(field: CustomReportField) {
  const text = normalizeSearchText(
    [
      field.key,
      field.label,
      field.helpText ?? "",
      field.placeholder ?? "",
      field.reportLabel ?? "",
    ].join(" "),
  );

  return EVIDENCE_KEYWORDS.some((keyword) =>
    text.includes(normalizeSearchText(keyword)),
  );
}

function toRuntimeFieldType(type: CustomReportFieldType) {
  return FIELD_TYPE_MAP[type] ?? "TEXT";
}

function buildInitialFieldValue(field: CustomReportField) {
  if (field.type === "multi_select") {
    return [];
  }

  if (field.type === "checkbox") {
    return field.options?.length ? [] : false;
  }

  return "";
}

function normalizeOtherRuntimeValue(value: unknown) {
  if (value === "__OTHER__") {
    return "other";
  }

  if (Array.isArray(value)) {
    return value.map((item) => (item === "__OTHER__" ? "other" : String(item)));
  }

  return value;
}

function flattenAiReportFields(schema: AiReportSchema) {
  return schema.sections
    .flatMap((section) => section.fields)
    .filter((field) => !isEvidenceLikeField(field));
}

function normalizeOptionLabel(label: unknown) {
  return String(label ?? "").trim();
}

function normalizeOptionValue(value: unknown, fallbackLabel: string, fallbackIndex: number) {
  const text = String(value ?? "").trim();

  if (text) {
    return text;
  }

  return fallbackLabel
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "") || `option_${fallbackIndex + 1}`;
}

function buildUniqueOptionValue(
  value: string,
  usedValues: Set<string>,
  fallbackIndex: number,
) {
  const normalizedBase =
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "") || `option_${fallbackIndex + 1}`;

  let nextValue = normalizedBase;
  let suffix = 2;

  while (usedValues.has(nextValue)) {
    nextValue = `${normalizedBase}_${suffix}`;
    suffix += 1;
  }

  usedValues.add(nextValue);
  return nextValue;
}

function getFieldFallbackOptions(label: string) {
  const normalizedLabel = normalizeSearchText(label);

  return (
    FIELD_OPTION_FALLBACKS.find((item) =>
      item.matchers.some((matcher) =>
        normalizedLabel.includes(normalizeSearchText(matcher)),
      ),
    )?.options ?? []
  );
}

function normalizeSelectableOptions(
  field: CustomReportField,
  incomingOptions: CustomReportOptionLike[],
) {
  const seen = new Set<string>();
  const usedValues = new Set<string>();
  const normalizedOptions: Array<{ label: string; value: string; order: number }> = [];

  const pushOption = (option: CustomReportOptionLike) => {
    const label = normalizeOptionLabel(option.label);

    if (!label) {
      return;
    }

    const normalizedLabel = normalizeSearchText(label);
    const value =
      normalizedLabel === "اخرى"
        ? "other"
        : normalizeOptionValue(option.value, label, normalizedOptions.length);
    const dedupeKey = `${normalizedLabel}::${value.toLowerCase()}`;

    if (seen.has(dedupeKey)) {
      return;
    }

    seen.add(dedupeKey);
    if (value === "other" && usedValues.has("other")) {
      return;
    }

    const uniqueValue = buildUniqueOptionValue(
      value,
      usedValues,
      normalizedOptions.length,
    );
    normalizedOptions.push({
      label: normalizedLabel === "اخرى" ? "أخرى" : label,
      value,
      order: normalizedOptions.length + 1,
    });
  };

  for (const option of incomingOptions) {
    pushOption(option);
  }

  if (normalizedOptions.length >= 4) {
    return normalizedOptions.slice(0, 8);
  }

  for (const option of getFieldFallbackOptions(field.label)) {
    pushOption(option);
  }

  return normalizedOptions.slice(0, 8);
}

function normalizeFieldForSingleStep(
  field: CustomReportField,
  index: number,
): CustomReportField {
  const hasExplicitOptions = (field.options ?? []).length > 0;
  const normalizedType =
    field.type === "checkbox" && !hasExplicitOptions ? "radio" : field.type;
  const sourceOptions =
    normalizedType === "radio" &&
    field.type === "checkbox" &&
    !hasExplicitOptions
      ? BOOLEAN_CHOICE_OPTIONS
      : field.options ?? [];

  if (!SELECTABLE_FIELD_TYPES.has(normalizedType)) {
    return {
      ...field,
      type: normalizedType,
      required: false,
      order: index + 1,
      options: (sourceOptions ?? [])
        .map((option, optionIndex) => ({
          label: option.label,
          value: option.value,
          order: optionIndex + 1,
        }))
        .slice(0, 8),
    };
  }

  const normalizedOptions = normalizeSelectableOptions(field, sourceOptions);

  if (normalizedOptions.length < 4) {
    return {
      ...field,
      type: "textarea",
      required: false,
      order: index + 1,
      options: [],
    };
  }

  return {
    ...field,
    type: normalizedType,
    required: false,
    order: index + 1,
    options: normalizedOptions,
  };
}

export function normalizeAiReportSchema(schema: AiReportSchema): AiReportSchema {
  const sanitizedSchema = sanitizeAiReportSchema(schema);
  const flattenedFields = flattenAiReportFields(sanitizedSchema).map((field, index) =>
    normalizeFieldForSingleStep(field, index),
  );

  return {
    ...sanitizedSchema,
    title: sanitizedSchema.title || AI_REPORT_SINGLE_STEP_TITLE,
    description: sanitizedSchema.description,
    sections: [
      {
        id: "ai_report_section_1",
        title: AI_REPORT_SINGLE_STEP_TITLE,
        description: sanitizedSchema.description || undefined,
        order: 1,
        fields: flattenedFields,
      },
    ],
  };
}

export function buildAiReportRuntimeWorkflow(
  schema: AiReportSchema,
): AiReportRuntimeWorkflow {
  const normalizedSchema = normalizeAiReportSchema(sanitizeAiReportSchema(schema));
  const fields = normalizedSchema.sections[0]?.fields ?? [];

  return {
    id: buildWorkflowId(normalizedSchema),
    name: normalizedSchema.title,
    serviceSlug: AI_REPORT_SERVICE_SLUG,
    service: {
      slug: AI_REPORT_SERVICE_SLUG,
    },
    studentPickerMode: "DISABLED",
    evidenceMode: "ENABLED",
    steps: [
      {
        id: "ai-report-step-1",
        title: AI_REPORT_SINGLE_STEP_TITLE,
        description: normalizedSchema.description ?? null,
        order: 1,
        fields: fields.map((field, fieldIndex) => ({
          id: `ai-report-field:step-1:${field.key}`,
          key: field.key,
          label: field.label,
          type: toRuntimeFieldType(field.type),
          placeholder: field.placeholder ?? null,
          helpText: field.helpText ?? null,
          isRequired: false,
          order: fieldIndex + 1,
          dependsOnFieldKey: null,
          linkedToValue: null,
          allowOther: hasOtherOption(field),
          isRepeater: false,
          options: (field.options ?? [])
            .filter((option) => option.value !== "other")
            .map((option, optionIndex) => ({
              id: `ai-report-option:step-1:${field.key}:${optionIndex + 1}:${option.value}`,
              label: option.label,
              value: option.value,
              order: optionIndex + 1,
              linkedToValue: null,
            })),
        })),
      },
    ],
  };
}

export function buildAiReportInitialValues(schema: AiReportSchema): RuntimeValues {
  const normalizedSchema = normalizeAiReportSchema(sanitizeAiReportSchema(schema));
  const values: RuntimeValues = {};

  for (const field of normalizedSchema.sections[0]?.fields ?? []) {
    values[field.key] = buildInitialFieldValue(field);

    if (hasOtherOption(field)) {
      values[`${field.key}__other`] = "";
    }
  }

  return values;
}

export function buildAiReportSubmissionValues(
  schema: AiReportSchema,
  values: RuntimeValues,
): CustomReportValues {
  const normalizedSchema = normalizeAiReportSchema(sanitizeAiReportSchema(schema));
  const nextValues: CustomReportValues = {};

  for (const field of normalizedSchema.sections[0]?.fields ?? []) {
    const normalizedValue = normalizeOtherRuntimeValue(values[field.key]);

    if (
      normalizedValue === undefined ||
      normalizedValue === null ||
      normalizedValue === ""
    ) {
      if (field.type === "checkbox" && !field.options?.length) {
        nextValues[field.key] = Boolean(normalizedValue);
      }
    } else if (
      Array.isArray(normalizedValue) ||
      typeof normalizedValue === "string" ||
      typeof normalizedValue === "number" ||
      typeof normalizedValue === "boolean"
    ) {
      nextValues[field.key] = normalizedValue as CustomReportValues[string];
    }

    if (hasOtherOption(field)) {
      const otherValue = values[`${field.key}__other`];
      nextValues[`${field.key}__other`] =
        typeof otherValue === "string" ? otherValue : null;
    }
  }

  return nextValues;
}
