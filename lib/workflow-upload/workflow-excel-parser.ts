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

  defaultValue?: string;
  defaultValues?: string;
  autoSelectWhenLinked?: boolean;

  dependsOnFieldKey?: string;

  linkedToValue?: string;
  fieldLinkedToValue?: string;

  optionLabel?: string;
  optionValue?: string;
  optionOrder?: number;
  optionLinkedToValue?: string;
};

function normalize(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeHeader(value: unknown) {
  return normalize(value)
    .toLowerCase()
    .replace(/[\u0623\u0625\u0622]/g, "\u0627")
    .replace(/\u0649/g, "\u064a")
    .replace(/\u0629/g, "\u0647");
}

function bool(value: unknown) {
  const v = normalize(value).toLowerCase();

  return [
    "true",
    "yes",
    "y",
    "1",
    "required",
    "\u0646\u0639\u0645",
    "\u0635\u062d",
    "\u0645\u0637\u0644\u0648\u0628",
  ].includes(v);
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
    "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u062e\u0637\u0648\u0647",
    "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u062e\u0637\u0648\u0629",
    "\u0627\u0644\u062e\u0637\u0648\u0647",
    "\u0627\u0644\u062e\u0637\u0648\u0629",
    "\u0627\u0644\u0642\u0633\u0645",
  ],

  stepDescription: [
    "stepdescription",
    "step_description",
    "step description",
    "\u0648\u0635\u0641 \u0627\u0644\u062e\u0637\u0648\u0647",
    "\u0648\u0635\u0641 \u0627\u0644\u062e\u0637\u0648\u0629",
    "\u0648\u0635\u0641 \u0627\u0644\u0642\u0633\u0645",
  ],

  stepOrder: [
    "steporder",
    "step_order",
    "step order",
    "\u062a\u0631\u062a\u064a\u0628 \u0627\u0644\u062e\u0637\u0648\u0647",
    "\u062a\u0631\u062a\u064a\u0628 \u0627\u0644\u062e\u0637\u0648\u0629",
    "\u062a\u0631\u062a\u064a\u0628 \u0627\u0644\u0642\u0633\u0645",
  ],

  fieldKey: [
    "fieldkey",
    "field_key",
    "field key",
    "key",
    "\u0645\u0641\u062a\u0627\u062d \u0627\u0644\u062d\u0642\u0644",
  ],

  fieldLabel: [
    "fieldlabel",
    "field_label",
    "field label",
    "\u0627\u0633\u0645 \u0627\u0644\u062d\u0642\u0644",
    "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u062d\u0642\u0644",
    "\u0627\u0644\u062d\u0642\u0644",
  ],

  fieldType: [
    "fieldtype",
    "field_type",
    "field type",
    "type",
    "\u0646\u0648\u0639 \u0627\u0644\u062d\u0642\u0644",
  ],

  fieldRequired: [
    "fieldrequired",
    "required",
    "isrequired",
    "is_required",
    "\u0645\u0637\u0644\u0648\u0628",
  ],

  fieldOrder: [
    "fieldorder",
    "field_order",
    "field order",
    "\u062a\u0631\u062a\u064a\u0628 \u0627\u0644\u062d\u0642\u0644",
  ],

  allowOther: [
    "allowother",
    "allow_other",
    "allow other",
    "other",
    "\u0627\u062e\u0631\u0649",
    "\u0623\u062e\u0631\u0649",
    "\u064a\u0633\u0645\u062d \u0627\u062e\u0631\u0649",
    "\u064a\u0633\u0645\u062d \u0623\u062e\u0631\u0649",
    "\u0627\u0644\u0633\u0645\u0627\u062d \u0628\u0627\u062e\u0631\u0649",
    "\u0627\u0644\u0633\u0645\u0627\u062d \u0628\u0623\u062e\u0631\u0649",
  ],

  defaultValue: [
    "defaultvalue",
    "default_value",
    "default value",
    "default",
    "القيمة الافتراضية",
    "القيمه الافتراضيه",
    "قيمة افتراضية",
    "قيمه افتراضيه",
  ],

  defaultValues: [
    "defaultvalues",
    "default_values",
    "default values",
    "defaults",
    "القيم الافتراضية",
    "القيم الافتراضيه",
    "قيم افتراضية",
    "قيم افتراضيه",
  ],

  autoSelectWhenLinked: [
    "autoselectwhenlinked",
    "auto_select_when_linked",
    "auto select when linked",
    "autoselect",
    "auto_select",
    "تحديد تلقائي",
    "اختيار تلقائي",
    "يحدد تلقائيا",
    "يختار تلقائيا",
  ],

  dependsOnFieldKey: [
    "dependsonfieldkey",
    "depends_on_field_key",
    "depends_on",
    "depends on",
    "parentfieldkey",
    "parent_field_key",
    "\u064a\u0639\u062a\u0645\u062f \u0639\u0644\u0649",
    "\u064a\u0639\u062a\u0645\u062f \u0639\u0644\u064a",
    "\u0627\u0644\u062d\u0642\u0644 \u0627\u0644\u0627\u0628",
    "\u0627\u0644\u062d\u0642\u0644 \u0627\u0644\u0623\u0628",
  ],

  linkedToValue: [
    "linkedtovalue",
    "linked_to_value",
    "linked to value",
    "\u0627\u0644\u0642\u064a\u0645\u0647 \u0627\u0644\u0645\u0631\u062a\u0628\u0637\u0647",
    "\u0627\u0644\u0642\u064a\u0645\u0629 \u0627\u0644\u0645\u0631\u062a\u0628\u0637\u0629",
    "\u064a\u0631\u062a\u0628\u0637 \u0628\u0627\u0644\u0642\u064a\u0645\u0647",
    "\u064a\u0631\u062a\u0628\u0637 \u0628\u0627\u0644\u0642\u064a\u0645\u0629",
  ],

  fieldLinkedToValue: [
    "fieldlinkedtovalue",
    "field_linked_to_value",
    "field linked to value",
    "fieldlinkedvalue",
    "field_linked_value",
    "\u0642\u064a\u0645\u0629 \u0631\u0628\u0637 \u0627\u0644\u062d\u0642\u0644",
    "\u0627\u0644\u0642\u064a\u0645\u0647 \u0627\u0644\u0645\u0631\u062a\u0628\u0637\u0647 \u0628\u0627\u0644\u062d\u0642\u0644",
    "\u0627\u0644\u0642\u064a\u0645\u0629 \u0627\u0644\u0645\u0631\u062a\u0628\u0637\u0629 \u0628\u0627\u0644\u062d\u0642\u0644",
  ],

  optionLabel: [
    "optionlabel",
    "option_label",
    "option label",
    "\u0627\u0644\u062e\u064a\u0627\u0631",
    "\u0627\u0633\u0645 \u0627\u0644\u062e\u064a\u0627\u0631",
  ],

  optionValue: [
    "optionvalue",
    "option_value",
    "option value",
    "\u0642\u064a\u0645\u0629 \u0627\u0644\u062e\u064a\u0627\u0631",
    "\u0642\u064a\u0645\u0647 \u0627\u0644\u062e\u064a\u0627\u0631",
  ],

  optionOrder: [
    "optionorder",
    "option_order",
    "option order",
    "\u062a\u0631\u062a\u064a\u0628 \u0627\u0644\u062e\u064a\u0627\u0631",
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
    "\u0642\u064a\u0645\u0629 \u0631\u0628\u0637 \u0627\u0644\u062e\u064a\u0627\u0631",
    "\u0642\u064a\u0645\u0647 \u0631\u0628\u0637 \u0627\u0644\u062e\u064a\u0627\u0631",
    "\u0627\u0644\u0642\u064a\u0645\u0629 \u0627\u0644\u0645\u0631\u062a\u0628\u0637\u0629 \u0628\u0627\u0644\u062e\u064a\u0627\u0631",
    "\u0627\u0644\u0642\u064a\u0645\u0647 \u0627\u0644\u0645\u0631\u062a\u0628\u0637\u0647 \u0628\u0627\u0644\u062e\u064a\u0627\u0631",
    "\u0642\u064a\u0645\u0629 \u0627\u0644\u0627\u0628",
    "\u0642\u064a\u0645\u0629 \u0627\u0644\u0623\u0628",
    "\u0627\u0644\u0642\u064a\u0645\u0629 \u0627\u0644\u0627\u0628",
    "\u0627\u0644\u0642\u064a\u0645\u0629 \u0627\u0644\u0623\u0628",
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
          cells.some((cell) => cell === alias || cell.includes(alias)),
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

    const exactIndex = normalizedHeaders.findIndex((header) =>
      normalizedAliases.some((alias) => header === alias),
    );
    const index =
      exactIndex >= 0
        ? exactIndex
        : key === "linkedToValue"
          ? -1
          : normalizedHeaders.findIndex((header) =>
              normalizedAliases.some((alias) => header.includes(alias)),
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
