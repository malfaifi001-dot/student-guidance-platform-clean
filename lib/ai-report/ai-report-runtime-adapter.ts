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

const AI_REPORT_SERVICE_SLUG = "custom-report";
const AI_REPORT_SINGLE_STEP_TITLE = "بيانات التقرير المخصص";
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

function buildWorkflowId(schema: AiReportSchema) {
  const signature = schema.sections
    .map((section) => {
      const fieldKeys = section.fields.map((field) => field.key).join("-");
      return `${section.id}:${fieldKeys}`;
    })
    .join("|");

  return `ai-report:${schema.title}:${signature}`;
}

function hasOtherOption(field: CustomReportField) {
  return Boolean(field.options?.some((option) => option.value === "other"));
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

function isEvidenceLikeField(field: CustomReportField) {
  const text = normalizeSearchText(
    [
      field.key,
      field.label,
      field.helpText ?? "",
      field.placeholder ?? "",
    ].join(" "),
  );

  return (
    text.includes("الشواهد") ||
    text.includes("شواهد") ||
    text.includes("مساحه شاهد") ||
    text.includes("المرفقات") ||
    text.includes("مرفقات") ||
    text.includes("attachments") ||
    text.includes("attachment") ||
    text.includes("evidence") ||
    text.includes("file upload") ||
    text.includes("file_upload") ||
    text.includes("image upload") ||
    text.includes("image_upload") ||
    text.includes("proposed evidence")
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

export function normalizeAiReportSchema(schema: AiReportSchema): AiReportSchema {
  const sanitizedSchema = sanitizeAiReportSchema(schema);
  const flattenedFields = flattenAiReportFields(sanitizedSchema).map((field, index) => {
    const hasExplicitOptions = (field.options ?? []).length > 0;
    const normalizedType =
      field.type === "checkbox" && !hasExplicitOptions ? "radio" : field.type;
    const sourceOptions =
      normalizedType === "radio" && field.type === "checkbox" && !hasExplicitOptions
        ? BOOLEAN_CHOICE_OPTIONS
        : field.options ?? [];
    const options = sourceOptions.map((option, optionIndex) => ({
      label: option.label,
      value: option.value,
      order: optionIndex + 1,
    }));

    return {
      ...field,
      type: normalizedType,
      required: false,
      order: index + 1,
      options,
    };
  });

  return {
    ...sanitizedSchema,
    title: sanitizedSchema.title,
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
  const flattenedFields = flattenAiReportFields(normalizedSchema);

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
        fields: flattenedFields.map((field, fieldIndex) => ({
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
          options: (field.options ?? [])
            .filter((option) => option.value !== "other")
            .map((option, optionIndex) => ({
              id: `ai-report-option:step-1:${field.key}:${option.value}`,
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

export function buildAiReportInitialValues(
  schema: AiReportSchema,
): RuntimeValues {
  const normalizedSchema = normalizeAiReportSchema(sanitizeAiReportSchema(schema));
  const values: RuntimeValues = {};

  for (const section of normalizedSchema.sections) {
    for (const field of section.fields) {
      values[field.key] = buildInitialFieldValue(field);

      if (hasOtherOption(field)) {
        values[`${field.key}__other`] = "";
      }
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

  for (const section of normalizedSchema.sections) {
    for (const field of section.fields) {
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
  }

  return nextValues;
}
