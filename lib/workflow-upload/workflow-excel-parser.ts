import * as XLSX from "xlsx";

export type ParsedWorkflowRow = {
  stepTitle: string;
  stepDescription?: string;
  fieldKey: string;
  fieldLabel: string;
  fieldType: string;
  fieldRequired: boolean;
  fieldOrder?: number;
  allowOther: boolean;
  dependsOnFieldKey?: string;
  linkedToValue?: string;
  optionLabel?: string;
  optionValue?: string;
  optionOrder?: number;
};

function normalize(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function bool(value: unknown) {
  const v = normalize(value).toLowerCase();
  return ["true", "yes", "1", "نعم", "صح", "مطلوب"].includes(v);
}

function numberOrUndefined(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

const headerMap: Record<keyof ParsedWorkflowRow, string[]> = {
  stepTitle: ["stepTitle", "step_title", "عنوان الخطوة", "الخطوة"],
  stepDescription: ["stepDescription", "step_description", "وصف الخطوة"],
  fieldKey: ["fieldKey", "field_key", "مفتاح الحقل", "key"],
  fieldLabel: ["fieldLabel", "field_label", "اسم الحقل", "الحقل"],
  fieldType: ["fieldType", "field_type", "نوع الحقل", "type"],
  fieldRequired: ["fieldRequired", "required", "مطلوب"],
  fieldOrder: ["fieldOrder", "field_order", "ترتيب الحقل"],
  allowOther: ["allowOther", "allow_other", "أخرى", "يسمح أخرى"],
  dependsOnFieldKey: ["dependsOnFieldKey", "depends_on", "يعتمد على"],
  linkedToValue: ["linkedToValue", "linked_to_value", "القيمة المرتبطة"],
  optionLabel: ["optionLabel", "option_label", "الخيار"],
  optionValue: ["optionValue", "option_value", "قيمة الخيار"],
  optionOrder: ["optionOrder", "option_order", "ترتيب الخيار"],
};

function detectHeaderIndex(rows: unknown[][]) {
  let bestIndex = 0;
  let bestScore = 0;

  rows.slice(0, 10).forEach((row, index) => {
    const cells = row.map(normalize);
    let score = 0;

    Object.values(headerMap).forEach((aliases) => {
      if (aliases.some((alias) => cells.some((cell) => cell.includes(alias)))) {
        score++;
      }
    });

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function mapHeaders(headers: string[]) {
  const result = new Map<keyof ParsedWorkflowRow, number>();

  Object.entries(headerMap).forEach(([key, aliases]) => {
    const index = headers.findIndex((header) =>
      aliases.some((alias) => header.includes(alias))
    );

    if (index >= 0) {
      result.set(key as keyof ParsedWorkflowRow, index);
    }
  });

  return result;
}

export async function parseWorkflowExcel(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
  });

  const headerIndex = detectHeaderIndex(rows);
  const headers = rows[headerIndex].map(normalize);
  const mapped = mapHeaders(headers);

  const dataRows = rows.slice(headerIndex + 1);

  return dataRows
    .map((row, index): ParsedWorkflowRow => {
      const get = (key: keyof ParsedWorkflowRow) => {
        const colIndex = mapped.get(key);
        return colIndex === undefined ? "" : normalize(row[colIndex]);
      };

      return {
        stepTitle: get("stepTitle"),
        stepDescription: get("stepDescription") || undefined,
        fieldKey: get("fieldKey"),
        fieldLabel: get("fieldLabel"),
        fieldType: get("fieldType") || "TEXT",
        fieldRequired: bool(get("fieldRequired")),
        fieldOrder: numberOrUndefined(get("fieldOrder")) ?? index + 1,
        allowOther: bool(get("allowOther")),
        dependsOnFieldKey: get("dependsOnFieldKey") || undefined,
        linkedToValue: get("linkedToValue") || undefined,
        optionLabel: get("optionLabel") || undefined,
        optionValue: get("optionValue") || undefined,
        optionOrder: numberOrUndefined(get("optionOrder")),
      };
    })
    .filter((row) => row.stepTitle && row.fieldKey && row.fieldLabel);
}