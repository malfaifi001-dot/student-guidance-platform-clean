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
