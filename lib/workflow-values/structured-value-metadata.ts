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
  semanticType?: "student-data";
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
  semanticType: "student-data",
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

const BROADCAST_SCHEDULE_STRUCTURED_VALUE_METADATA = {
  fieldKey: "broadcast_schedule_items",
  tableTitle: "خطة الإذاعة المدرسية",
  tableColumns: [
    { key: "week", label: "الأسبوع" },
    { key: "day", label: "اليوم" },
    { key: "date", label: "التاريخ" },
    { key: "grade", label: "الصف" },
    { key: "topic", label: "الموضوع" },
    { key: "responsible", label: "المسؤول" },
  ],
  repeatHeader: true,
  stripedRows: true,
} satisfies StructuredValueTableMetadata;

const STRUCTURED_VALUE_TABLE_METADATA = new Map<string, StructuredValueTableMetadata>([
  [
    SELECTED_STUDENTS_STRUCTURED_VALUE_METADATA.fieldKey,
    SELECTED_STUDENTS_STRUCTURED_VALUE_METADATA,
  ],
  [
    BROADCAST_SCHEDULE_STRUCTURED_VALUE_METADATA.fieldKey,
    BROADCAST_SCHEDULE_STRUCTURED_VALUE_METADATA,
  ],
]);

function normalizeFieldKey(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[\s./-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

const STUDENT_IDENTITY_FIELD_KEYS = new Set([
  ...SELECTED_STUDENTS_STRUCTURED_VALUE_METADATA.tableColumns.map((column) =>
    normalizeFieldKey(column.key),
  ),
  "student_id",
  "student_name",
  "gender",
]);

type StudentIdentityFieldLike = {
  id?: unknown;
  key?: unknown;
  fieldKey?: unknown;
  name?: unknown;
  boundFieldKey?: unknown;
  sourceFieldKey?: unknown;
};

export function isStudentIdentityField(field: StudentIdentityFieldLike) {
  const candidates = [
    field.key,
    field.fieldKey,
    field.boundFieldKey,
    field.sourceFieldKey,
    field.name,
    field.id,
  ];

  return candidates.some((candidate) => {
    const key = normalizeFieldKey(String(candidate ?? ""));
    if (!key) return false;
    if (STUDENT_IDENTITY_FIELD_KEYS.has(key)) return true;

    const hasStudentPrefix = key.startsWith("student_");
    const withoutStudentPrefix = key.replace(/^student_/, "");
    if (withoutStudentPrefix === "name") return hasStudentPrefix;
    if (withoutStudentPrefix === "class") return hasStudentPrefix;

    return STUDENT_IDENTITY_FIELD_KEYS.has(withoutStudentPrefix);
  });
}

export function getStructuredValueTableMetadata(fieldKey: string) {
  return STRUCTURED_VALUE_TABLE_METADATA.get(normalizeFieldKey(fieldKey));
}

type StudentDataTableLike = {
  sourceFieldKey?: unknown;
  sourceTableId?: unknown;
  columns?: unknown;
};

export function isStudentDataTable(table: StudentDataTableLike) {
  const sourceFieldKey = normalizeFieldKey(String(table.sourceFieldKey ?? ""));
  const sourceTableId = normalizeFieldKey(
    String(table.sourceTableId ?? "").replace(/^table:/i, ""),
  );
  const metadata =
    getStructuredValueTableMetadata(sourceFieldKey) ||
    getStructuredValueTableMetadata(sourceTableId);
  if (metadata?.semanticType === "student-data") return true;

  const columnKeys = Array.isArray(table.columns)
    ? table.columns
        .map((column) =>
          normalizeFieldKey(
            typeof column === "string"
              ? column
              : String((column as { key?: unknown } | null)?.key ?? ""),
          ),
        )
        .filter(Boolean)
    : [];
  const keys = new Set(columnKeys);
  const hasIdentity = keys.has("full_name") && keys.has("national_id");
  const hasStudentContext = [
    "grade",
    "classroom",
    "stage",
    "guardian_name",
    "guardian_phone",
  ].some((key) => keys.has(key));

  return hasIdentity && hasStudentContext;
}
