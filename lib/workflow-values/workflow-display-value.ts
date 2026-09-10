import { repairPotentialUtf8Mojibake } from "@/lib/text/repair-utf8-mojibake";
import { formatHijriDateWithDay } from "@/lib/workflow-values/hijri-date";

export type WorkflowOptionLike = {
  label?: string | null;
  value?: string | null;
};

export type WorkflowFieldLike = {
  key?: string | null;
  label?: string | null;
  type?: string | null;
  options?: WorkflowOptionLike[] | null;
};

export type WorkflowValueLike = {
  id?: string | null;
  fieldKey?: string | null;
  value?: string | null;
  jsonValue?: unknown;
  field?: WorkflowFieldLike | null;
};

type WorkflowDefinitionLike = {
  steps?: Array<{
    fields?: WorkflowFieldLike[] | null;
  }> | null;
} | null | undefined;

const WORKFLOW_TITLE_FIELD_KEYS = [
  "program_name",
  "activity_program",
  "activity_name",
  "program",
  "title",
  "اسم البرنامج",
  "اسم النشاط",
] as const;

export function getWorkflowFieldKey(item: WorkflowValueLike) {
  return item.field?.key || item.fieldKey || item.id || "";
}

export function getWorkflowFieldLabel(item: WorkflowValueLike, index?: number) {
  return repairPotentialUtf8Mojibake(
    item.field?.label ||
    item.field?.key ||
    item.fieldKey ||
    (typeof index === "number" ? `قيمة رقم ${index + 1}` : "قيمة"),
  );
}

export function formatWorkflowDisplayValue(
  item: WorkflowValueLike,
  allValues: WorkflowValueLike[] = [],
) {
  const fieldKey = getWorkflowFieldKey(item);
  const rawValue = getRawWorkflowValue(item);
  const otherValue = getOtherValueForField(fieldKey, allValues);

  if (String(item.field?.type || "").toUpperCase() === "DATE") {
    return formatHijriDateWithDay(String(rawValue || "")) || String(rawValue || "");
  }

  return formatValueByFieldOptions(
    rawValue,
    item.field?.options || [],
    otherValue,
  );
}

/**
 * Converts a raw workflow submission record into display values using the
 * workflow's persisted DynamicFieldOption metadata. The source record is not
 * changed; this is strictly a presentation adapter.
 */
export function buildWorkflowDisplayValues(
  values: Record<string, unknown>,
  workflow: WorkflowDefinitionLike,
): WorkflowValueLike[] {
  const fields = new Map<string, WorkflowFieldLike>();

  for (const step of workflow?.steps || []) {
    for (const field of step.fields || []) {
      const key = String(field.key || "").trim();
      if (key) fields.set(key, field);
    }
  }

  return Object.entries(values).map(([fieldKey, rawValue]) => ({
    fieldKey,
    value: typeof rawValue === "string" ? rawValue : null,
    jsonValue: typeof rawValue === "string" ? undefined : rawValue,
    field: fields.get(fieldKey) || { key: fieldKey },
  }));
}

/**
 * Resolves the primary human-readable title from a raw workflow submission.
 * Option labels remain the source of truth; raw option values stay stored.
 */
export function resolveWorkflowRecordTitle(
  values: Record<string, unknown>,
  workflow: WorkflowDefinitionLike,
  fallback: string,
) {
  const displayValues = buildWorkflowDisplayValues(values, workflow);

  for (const fieldKey of WORKFLOW_TITLE_FIELD_KEYS) {
    const value = displayValues.find(
      (item) => getWorkflowFieldKey(item) === fieldKey,
    );
    const display = value
      ? formatWorkflowDisplayValue(value, displayValues).trim()
      : "";

    if (display) return display;
  }

  for (const value of displayValues) {
    const display = formatWorkflowDisplayValue(value, displayValues).trim();
    if (display) return display;
  }

  return fallback;
}

export function stringifyWorkflowRawValue(value: unknown): string {
  if (value === null || value === undefined) return "";

  if (typeof value === "string") {
    return repairPotentialUtf8Mojibake(value) || "";
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => stringifyWorkflowRawValue(item))
      .filter(Boolean)
      .join("، ");
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (typeof record.fullName === "string") return record.fullName;
    if (typeof record.name === "string") return record.name;
    if (typeof record.label === "string") return record.label;
    if (typeof record.value === "string") return record.value;

    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

function getRawWorkflowValue(item: WorkflowValueLike) {
  if (item.jsonValue !== null && item.jsonValue !== undefined) {
    return normalizeStoredValue(item.jsonValue);
  }

  return normalizeStoredValue(item.value);
}

function normalizeStoredValue(value: unknown): unknown {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();

  if (!trimmed) return "";

  if (
    (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
    (trimmed.startsWith("{") && trimmed.endsWith("}"))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

function formatValueByFieldOptions(
  value: unknown,
  options: WorkflowOptionLike[],
  otherValue?: string,
): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => formatSingleChoice(item, options, otherValue))
      .filter(Boolean)
      .join("، ");
  }

  return formatSingleChoice(value, options, otherValue);
}

function formatSingleChoice(
  value: unknown,
  options: WorkflowOptionLike[],
  otherValue?: string,
): string {
  const normalizedValue = stringifyWorkflowRawValue(value).trim();

  if (!normalizedValue) return "";

  if (normalizedValue === "__OTHER__" || normalizedValue === "OTHER") {
    return otherValue?.trim() || "أخرى";
  }

  const matchedOption = options.find(
    (option) => String(option.value ?? "").trim() === normalizedValue,
  );

  if (matchedOption?.label) {
    return repairPotentialUtf8Mojibake(matchedOption.label) || matchedOption.label;
  }

  return repairPotentialUtf8Mojibake(normalizedValue) || normalizedValue;
}

function getOtherValueForField(
  fieldKey: string,
  allValues: WorkflowValueLike[],
) {
  if (!fieldKey) return "";

  const otherKey = `${fieldKey}__other`;

  const found = allValues.find((item) => {
    const key = getWorkflowFieldKey(item);
    return key === otherKey || item.fieldKey === otherKey;
  });

  if (!found) return "";

  return stringifyWorkflowRawValue(found.value ?? found.jsonValue);
}
