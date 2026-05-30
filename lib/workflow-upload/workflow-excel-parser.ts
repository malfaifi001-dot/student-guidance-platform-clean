import * as XLSX from "xlsx";

export type ParsedWorkflowRow = {
  stepTitle: string;
  stepDescription?: string;
  stepOrder?: number;

  fieldKey: string;
  fieldLabel: string;
  fieldType: string;
  fieldRequired: boolean;
  fieldOrder?: number;
  allowOther: boolean;

  dependsOnFieldKey?: string;

  /**
   * Legacy/global linked value.
   * نتركه للتوافق مع الملفات القديمة، لكن الأفضل مستقبلاً استخدام:
   * fieldLinkedToValue للحقل كاملًا
   * optionLinkedToValue لخيار داخل الحقل
   */
  linkedToValue?: string;

  /**
   * يستخدم لإخفاء/إظهار الحقل كاملًا بناءً على قيمة حقل سابق.
   */
  fieldLinkedToValue?: string;

  optionLabel?: string;
  optionValue?: string;
  optionOrder?: number;

  /**
   * هذا هو المهم للربط الحالي:
   * البرنامج → خيارات الإجراء
   * الإجراء → خيارات آلية التنفيذ
   * آلية التنفيذ → خيارات الشاهد أو غيره
   */
  optionLinkedToValue?: string;
};

function normalize(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeHeader(value: unknown) {
  return normalize(value)
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

function bool(value: unknown) {
  const v = normalize(value).toLowerCase();
  return ["true", "yes", "1", "نعم", "صح", "مطلوب"].includes(v);
}

function numberOrUndefined(value: unknown) {
  const normalized = normalize(value);
  if (!normalized) return undefined;

  const n = Number(normalized);
  return Number.isFinite(n) ? n : undefined;
}

const headerMap: Record<keyof ParsedWorkflowRow, string[]> = {
  stepTitle: [
    "steptitle",
    "step_title",
    "step title",
    "عنوان الخطوه",
    "عنوان الخطوة",
    "الخطوه",
    "الخطوة",
    "القسم",
  ],

  stepDescription: [
    "stepdescription",
    "step_description",
    "step description",
    "وصف الخطوه",
    "وصف الخطوة",
    "وصف القسم",
  ],

  stepOrder: [
    "steporder",
    "step_order",
    "step order",
    "ترتيب الخطوه",
    "ترتيب الخطوة",
    "ترتيب القسم",
  ],

  fieldKey: [
    "fieldkey",
    "field_key",
    "field key",
    "مفتاح الحقل",
    "key",
  ],

  fieldLabel: [
    "fieldlabel",
    "field_label",
    "field label",
    "اسم الحقل",
    "الحقل",
  ],

  fieldType: [
    "fieldtype",
    "field_type",
    "field type",
    "نوع الحقل",
    "type",
  ],

  fieldRequired: [
    "fieldrequired",
    "required",
    "isrequired",
    "is_required",
    "مطلوب",
  ],

  fieldOrder: [
    "fieldorder",
    "field_order",
    "field order",
    "ترتيب الحقل",
  ],

  allowOther: [
    "allowother",
    "allow_other",
    "allow other",
    "اخرى",
    "يسمح اخرى",
    "السماح باخرى",
  ],

  dependsOnFieldKey: [
    "dependsonfieldkey",
    "depends_on_field_key",
    "depends_on",
    "depends on",
    "parentfieldkey",
    "parent_field_key",
    "يعتمد على",
    "يعتمد علي",
    "الحقل الاب",
    "الحقل الأب",
  ],

  linkedToValue: [
    "linkedtovalue",
    "linked_to_value",
    "linked to value",
    "القيمه المرتبطه",
    "القيمة المرتبطة",
    "يرتبط بالقيمه",
    "يرتبط بالقيمة",
  ],

  fieldLinkedToValue: [
    "fieldlinkedtovalue",
    "field_linked_to_value",
    "field linked to value",
    "fieldlinkedvalue",
    "field_linked_value",
    "قيمة ربط الحقل",
    "القيمه المرتبطه بالحقل",
    "القيمة المرتبطة بالحقل",
  ],

  optionLabel: [
    "optionlabel",
    "option_label",
    "option label",
    "الخيار",
    "اسم الخيار",
  ],

  optionValue: [
    "optionvalue",
    "option_value",
    "option value",
    "قيمة الخيار",
    "قيمه الخيار",
  ],

  optionOrder: [
    "optionorder",
    "option_order",
    "option order",
    "ترتيب الخيار",
  ],

  optionLinkedToValue: [
    "optionlinkedtovalue",
    "option_linked_to_value",
    "option linked to value",
    "optionlinkedvalue",
    "option_linked_value",
    "parentvalue",
    "parent_value",
    "dependsvalue",
    "depends_on_value",
    "optionparentvalue",
    "option_parent_value",
    "قيمة ربط الخيار",
    "قيمه ربط الخيار",
    "القيمة المرتبطة بالخيار",
    "القيمه المرتبطه بالخيار",
    "قيمة الاب",
    "قيمة الأب",
    "القيمة الاب",
    "القيمة الأب",
  ],
};

function detectHeaderIndex(rows: unknown[][]) {
  let bestIndex = 0;
  let bestScore = 0;

  rows.slice(0, 20).forEach((row, index) => {
    const cells = row.map(normalizeHeader);
    let score = 0;

    Object.values(headerMap).forEach((aliases) => {
      const normalizedAliases = aliases.map(normalizeHeader);

      if (
        normalizedAliases.some((alias) =>
          cells.some((cell) => cell === alias || cell.includes(alias))
        )
      ) {
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
  const normalizedHeaders = headers.map(normalizeHeader);

  Object.entries(headerMap).forEach(([key, aliases]) => {
    const normalizedAliases = aliases.map(normalizeHeader);

    const index = normalizedHeaders.findIndex((header) =>
      normalizedAliases.some(
        (alias) => header === alias || header.includes(alias)
      )
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
        stepOrder: numberOrUndefined(get("stepOrder")),

        fieldKey: get("fieldKey"),
        fieldLabel: get("fieldLabel"),
        fieldType: get("fieldType") || "TEXT",
        fieldRequired: bool(get("fieldRequired")),
        fieldOrder: numberOrUndefined(get("fieldOrder")) ?? index + 1,
        allowOther: bool(get("allowOther")),

        dependsOnFieldKey: get("dependsOnFieldKey") || undefined,

        linkedToValue: get("linkedToValue") || undefined,
        fieldLinkedToValue: get("fieldLinkedToValue") || undefined,

        optionLabel: get("optionLabel") || undefined,
        optionValue: get("optionValue") || undefined,
        optionOrder: numberOrUndefined(get("optionOrder")),
        optionLinkedToValue: get("optionLinkedToValue") || undefined,
      };
    })
    .filter((row) => row.stepTitle && row.fieldKey && row.fieldLabel);
}