type CaseReportTitleOption = {
  label?: string | null;
  value?: string | null;
};

type CaseReportTitleField = {
  key?: string | null;
  label?: string | null;
  options?: CaseReportTitleOption[] | null;
};

type CaseReportTitleValue = {
  fieldKey?: string | null;
  value?: unknown;
  jsonValue?: unknown;
  field?: CaseReportTitleField | null;
};

type CaseReportTitleInput = {
  title?: string | null;
  workflowSnapshot?: unknown;
  workflow?: {
    name?: string | null;
  } | null;
  service?: {
    name?: string | null;
  } | null;
  values?: CaseReportTitleValue[] | null;
};

const TITLE_INTENT_TOKENS = [
  "title",
  "name",
  "program",
  "activity",
  "subject",
  "topic",
  "report",
  "request",
  "type",
  "عنوان",
  "اسم",
  "برنامج",
  "نشاط",
  "موضوع",
  "تقرير",
  "طلب",
  "نوع",
] as const;

function cleanTitle(value: unknown) {
  const title = String(value ?? "").replace(/\s+/g, " ").trim();

  if (
    !title ||
    title === "null" ||
    title === "undefined" ||
    title.length > 140
  ) {
    return "";
  }

  return title;
}

function normalizeArabicTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

function isArabicDisplayTitle(value: unknown) {
  const title = cleanTitle(value);

  if (!title || !/[\u0600-\u06ff]/u.test(title) || title.includes("_")) {
    return false;
  }

  const normalized = normalizeArabicTitle(title);

  return ![
    "بدون عنوان",
    "حاله بدون عنوان",
    "حاله جديده",
  ].includes(normalized);
}

function collectSelectedValues(value: unknown): string[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (["string", "number", "boolean"].includes(typeof value)) {
    return [cleanTitle(value)].filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectSelectedValues);
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    return ["value", "id", "key", "slug", "label", "name", "title"].flatMap(
      (key) => collectSelectedValues(record[key]),
    );
  }

  return [];
}

function getSnapshotWorkflow(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object") {
    return null;
  }

  const record = snapshot as Record<string, unknown>;

  if (Array.isArray(record.steps)) {
    return record;
  }

  for (const key of ["workflow", "runtimeWorkflow"]) {
    const nested = record[key];

    if (
      nested &&
      typeof nested === "object" &&
      Array.isArray((nested as Record<string, unknown>).steps)
    ) {
      return nested as Record<string, unknown>;
    }
  }

  return record;
}

function getSnapshotFields(snapshot: unknown) {
  const workflow = getSnapshotWorkflow(snapshot);
  const steps = Array.isArray(workflow?.steps) ? workflow.steps : [];
  const fields = new Map<string, CaseReportTitleField>();

  for (const step of steps) {
    if (!step || typeof step !== "object") continue;

    const stepFields = Array.isArray((step as Record<string, unknown>).fields)
      ? ((step as Record<string, unknown>).fields as unknown[])
      : [];

    for (const item of stepFields) {
      if (!item || typeof item !== "object") continue;

      const field = item as CaseReportTitleField;
      const key = cleanTitle(field.key);

      if (key) fields.set(key, field);
    }
  }

  return fields;
}

function getValueField(
  value: CaseReportTitleValue,
  snapshotFields: Map<string, CaseReportTitleField>,
) {
  const fieldKey = cleanTitle(value.field?.key || value.fieldKey);
  const snapshotField = snapshotFields.get(fieldKey);

  return {
    key: fieldKey,
    label: cleanTitle(value.field?.label || snapshotField?.label),
    options:
      value.field?.options?.length
        ? value.field.options
        : snapshotField?.options || [],
  };
}

function resolveOptionLabel(
  value: CaseReportTitleValue,
  field: CaseReportTitleField,
  expectedValue?: string,
) {
  const selectedValues = collectSelectedValues(value.jsonValue ?? value.value);
  const expected = cleanTitle(expectedValue);
  const options = Array.isArray(field.options) ? field.options : [];

  for (const selectedValue of selectedValues) {
    if (expected && selectedValue !== expected) continue;

    const option = options.find(
      (item) =>
        cleanTitle(item.value) === selectedValue ||
        cleanTitle(item.label) === selectedValue,
    );

    if (isArabicDisplayTitle(option?.label)) {
      return cleanTitle(option?.label);
    }
  }

  return "";
}

function isTitleField(field: CaseReportTitleField) {
  const metadata = `${cleanTitle(field.key)} ${cleanTitle(field.label)}`.toLowerCase();

  return TITLE_INTENT_TOKENS.some((token) => metadata.includes(token));
}

function resolveArabicValue(value: CaseReportTitleValue) {
  for (const candidate of collectSelectedValues(value.jsonValue ?? value.value)) {
    if (isArabicDisplayTitle(candidate)) return candidate;
  }

  return "";
}

function resolveSnapshotWorkflowTitle(snapshot: unknown) {
  const workflow = getSnapshotWorkflow(snapshot);

  for (const key of ["title", "name", "label"]) {
    const candidate = workflow?.[key];

    if (isArabicDisplayTitle(candidate)) return cleanTitle(candidate);
  }

  return "";
}

export function resolveArabicCaseReportTitle(
  caseEntry: CaseReportTitleInput,
) {
  const savedTitle = cleanTitle(caseEntry.title);

  if (isArabicDisplayTitle(savedTitle)) {
    return savedTitle;
  }

  const values = Array.isArray(caseEntry.values) ? caseEntry.values : [];
  const snapshotFields = getSnapshotFields(caseEntry.workflowSnapshot);

  if (savedTitle) {
    for (const value of values) {
      const field = getValueField(value, snapshotFields);
      const optionLabel = resolveOptionLabel(value, field, savedTitle);

      if (optionLabel) return optionLabel;
    }
  }

  for (const value of values) {
    const field = getValueField(value, snapshotFields);

    if (!isTitleField(field)) continue;

    const optionLabel = resolveOptionLabel(value, field);

    if (optionLabel) return optionLabel;

    const explicitArabicValue = resolveArabicValue(value);

    if (explicitArabicValue) return explicitArabicValue;
  }

  const snapshotTitle = resolveSnapshotWorkflowTitle(caseEntry.workflowSnapshot);

  if (snapshotTitle) return snapshotTitle;

  if (isArabicDisplayTitle(caseEntry.workflow?.name)) {
    return cleanTitle(caseEntry.workflow?.name);
  }

  if (isArabicDisplayTitle(caseEntry.service?.name)) {
    return cleanTitle(caseEntry.service?.name);
  }

  return "تقرير الحالة";
}
