export type StructuredValueColumnMetadata = {
  key: string;
  label: string;
  width?: number;
  hidden?: boolean;
  optionLabels?: Record<string, string>;
};

export type StructuredValueTableMetadata = {
  fieldKey: string;
  tableTitle: string;
  tableColumns: StructuredValueColumnMetadata[];
  repeatHeader?: boolean;
  compact?: boolean;
  stripedRows?: boolean;
  highlightFirstColumn?: boolean;
};

/**
 * Domain metadata for structured runtime values that are not backed by a
 * DynamicField of their own. Workflow/snapshot metadata always takes priority
 * over these defaults in the report extractor.
 */
export const SELECTED_STUDENTS_STRUCTURED_VALUE_METADATA = {
  fieldKey: "selected_students_json",
  tableTitle: "الطلاب المختارون",
  tableColumns: [
    { key: "fullName", label: "الاسم الكامل" },
    { key: "nationalId", label: "رقم الهوية" },
    { key: "grade", label: "الصف" },
    { key: "classroom", label: "الفصل" },
    { key: "stage", label: "المرحلة" },
    { key: "guardianName", label: "اسم ولي الأمر" },
    { key: "guardianPhone", label: "رقم جوال ولي الأمر" },
  ],
  repeatHeader: true,
  stripedRows: true,
} satisfies StructuredValueTableMetadata;

const STRUCTURED_VALUE_TABLE_METADATA = new Map<string, StructuredValueTableMetadata>([
  [
    SELECTED_STUDENTS_STRUCTURED_VALUE_METADATA.fieldKey,
    SELECTED_STUDENTS_STRUCTURED_VALUE_METADATA,
  ],
]);

function normalizeFieldKey(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function getStructuredValueTableMetadata(fieldKey: string) {
  return STRUCTURED_VALUE_TABLE_METADATA.get(normalizeFieldKey(fieldKey));
}
