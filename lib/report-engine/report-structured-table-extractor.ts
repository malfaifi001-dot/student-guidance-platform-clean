import type {
  SmartReportTable,
  SmartReportTableColumn,
  SmartReportTableRow,
} from "@/lib/report-engine/smart-report-types";

export type StructuredTableOptionLike = {
  id?: string | null;
  key?: string | null;
  value?: string | null;
  label?: string | null;
  name?: string | null;
};

export type StructuredTableFieldLike = {
  key?: string | null;
  label?: string | null;
  type?: string | null;
  defaultJson?: unknown;
  settings?: unknown;
  metadata?: unknown;
  options?: StructuredTableOptionLike[] | null;
};

export type StructuredTableValueLike = {
  id?: string | null;
  fieldKey?: string | null;
  value?: unknown;
  jsonValue?: unknown;
  field?: StructuredTableFieldLike | null;
};

type StructuredTableConfig = {
  tableTitle?: string;
  tableColumns?: unknown;
  columns?: unknown;
  hiddenColumns?: unknown;
  repeatHeader?: boolean;
  compact?: boolean;
  stripedRows?: boolean;
  highlightFirstColumn?: boolean;
};

const ARABIC_COLUMN_LABELS: Record<string, string> = {
  agenda: "جدول الأعمال",
  discussion: "محور النقاش",
  recommendation: "التوصية",
  name: "الاسم",
  role: "الصفة",
  signature: "التوقيع",
  title: "العنوان",
  description: "الوصف",
  result: "النتيجة",
  notes: "الملاحظات",
  note: "ملاحظة",
  count: "العدد",
  category: "التصنيف",
  type: "النوع",
};

const TABLE_TITLE_FALLBACKS: Record<string, string> = {
  committee_items: "جدول الاجتماع",
  committee_members: "أعضاء اللجنة",
};

const TECHNICAL_KEYS = new Set([
  "id",
  "_id",
  "rowid",
  "row_id",
  "uuid",
  "key",
  "order",
  "sortorder",
  "createdat",
  "updatedat",
  "created_at",
  "updated_at",
  "metadata",
  "settings",
  "linkedtovalue",
  "sourcefieldkey",
]);

function text(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  return "";
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeKey(value: unknown) {
  return text(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function parseJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const clean = value.trim();
  if (!clean || (!clean.startsWith("[") && !clean.startsWith("{"))) return value;

  try {
    return JSON.parse(clean);
  } catch {
    return value;
  }
}

function getRowRecords(value: unknown): Array<Record<string, unknown>> {
  const parsed = parseJson(value);
  const direct = Array.isArray(parsed)
    ? parsed
    : (() => {
        const source = record(parsed);
        if (!source) return [];
        for (const key of ["rows", "items", "entries", "data"]) {
          if (Array.isArray(source[key])) return source[key] as unknown[];
        }
        return [];
      })();

  if (!direct.length) return [];
  if (!direct.some((item) => record(item))) return [];

  return direct.map(record).filter((item): item is Record<string, unknown> => Boolean(item));
}

function readConfig(source: unknown): StructuredTableConfig {
  const root = record(source);
  if (!root) return {};
  const nested =
    record(root.reportTable) ||
    record(root.table) ||
    record(root.tableConfig) ||
    record(root.defaultJson)?.reportTable ||
    record(root.defaultJson)?.table ||
    record(root.defaultJson)?.tableConfig ||
    record(root.settings)?.reportTable ||
    record(root.settings)?.table;
  const config = record(nested) || root;

  return {
    tableTitle: text(config.tableTitle || config.title),
    tableColumns: config.tableColumns,
    columns: config.columns,
    hiddenColumns: config.hiddenColumns,
    repeatHeader:
      typeof config.repeatHeader === "boolean" ? config.repeatHeader : undefined,
    compact: typeof config.compact === "boolean" ? config.compact : undefined,
    stripedRows:
      typeof config.stripedRows === "boolean" ? config.stripedRows : undefined,
    highlightFirstColumn:
      typeof config.highlightFirstColumn === "boolean"
        ? config.highlightFirstColumn
        : undefined,
  };
}

function mergeConfigs(...sources: unknown[]): StructuredTableConfig {
  return sources.reduce<StructuredTableConfig>(
    (result, source) => ({ ...result, ...readConfig(source) }),
    {},
  );
}

function humanizeColumnKey(key: string) {
  const normalized = normalizeKey(key);
  if (ARABIC_COLUMN_LABELS[normalized]) return ARABIC_COLUMN_LABELS[normalized];

  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isHelperKey(key: string, availableKeys: Set<string>) {
  const normalized = normalizeKey(key);
  if (TECHNICAL_KEYS.has(normalized)) return true;

  const helperMatch = key.match(/^(.*?)(Label|Other)$/i);
  if (!helperMatch) return false;

  const base = helperMatch[1];
  return availableKeys.has(base) || availableKeys.has(normalizeKey(base));
}

function getConfiguredColumns(config: StructuredTableConfig): SmartReportTableColumn[] {
  const source = Array.isArray(config.tableColumns)
    ? config.tableColumns
    : Array.isArray(config.columns)
      ? config.columns
      : [];
  const hidden = new Set(
    Array.isArray(config.hiddenColumns)
      ? config.hiddenColumns.map(normalizeKey).filter(Boolean)
      : [],
  );

  return source
    .map((item): SmartReportTableColumn | null => {
      if (typeof item === "string") {
        const key = normalizeKey(item);
        return key && !hidden.has(key) ? { key, label: humanizeColumnKey(item) } : null;
      }

      const sourceColumn = record(item);
      const key = normalizeKey(sourceColumn?.key || sourceColumn?.id || sourceColumn?.value);
      if (!key || hidden.has(key) || sourceColumn?.hidden === true) return null;
      const width = Number(sourceColumn?.width);

      return {
        key,
        label: text(sourceColumn?.label || sourceColumn?.title) || humanizeColumnKey(key),
        ...(Number.isFinite(width) && width > 0 ? { width } : {}),
      };
    })
    .filter((item): item is SmartReportTableColumn => Boolean(item));
}

function inferColumns(
  rows: Array<Record<string, unknown>>,
  config: StructuredTableConfig,
): SmartReportTableColumn[] {
  const configured = getConfiguredColumns(config);
  if (configured.length) return configured;

  const firstSeen: string[] = [];
  const availableKeys = new Set<string>();
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => {
      availableKeys.add(key);
      availableKeys.add(normalizeKey(key));
    });
  });

  rows.forEach((row) => {
    Object.keys(row).forEach((key) => {
      const normalized = normalizeKey(key);
      if (!normalized || firstSeen.includes(normalized) || isHelperKey(key, availableKeys)) return;
      firstSeen.push(normalized);
    });
  });

  return firstSeen.map((key) => ({ key, label: humanizeColumnKey(key) }));
}

function optionLabel(option: StructuredTableOptionLike) {
  return text(option.label || option.name || option.value || option.key || option.id);
}

function buildOptionResolvers(fields: StructuredTableFieldLike[]) {
  const byField = new Map<string, Map<string, string>>();
  const globalCandidates = new Map<string, Set<string>>();

  fields.forEach((field) => {
    const fieldKeys = [normalizeKey(field.key), normalizeKey(field.label)].filter(Boolean);
    const labels = new Map<string, string>();
    (field.options || []).forEach((option) => {
      const label = optionLabel(option);
      if (!label) return;
      [option.value, option.key, option.id, option.label, option.name].forEach((candidate) => {
        const key = text(candidate);
        if (!key) return;
        labels.set(key, label);
        const global = globalCandidates.get(key) || new Set<string>();
        global.add(label);
        globalCandidates.set(key, global);
      });
    });
    fieldKeys.forEach((key) => byField.set(key, labels));
  });

  return { byField, globalCandidates };
}

function findRawValue(row: Record<string, unknown>, key: string) {
  if (key in row) return row[key];
  const sourceKey = Object.keys(row).find((candidate) => normalizeKey(candidate) === key);
  return sourceKey ? row[sourceKey] : undefined;
}

function getCompanionValue(row: Record<string, unknown>, key: string, suffix: string) {
  const target = `${normalizeKey(key)}_${suffix.toLowerCase()}`;
  const sourceKey = Object.keys(row).find((candidate) => {
    const normalized = normalizeKey(candidate);
    return normalized === target || normalized === `${normalizeKey(key)}${suffix.toLowerCase()}`;
  });
  return sourceKey ? text(row[sourceKey]) : "";
}

function resolveCell(
  row: Record<string, unknown>,
  columnKey: string,
  resolvers: ReturnType<typeof buildOptionResolvers>,
) {
  const other = getCompanionValue(row, columnKey, "Other");
  if (other) return other;

  const explicitLabel = getCompanionValue(row, columnKey, "Label");
  if (explicitLabel && explicitLabel !== "أخرى") return explicitLabel;

  const raw = findRawValue(row, columnKey);
  if (Array.isArray(raw)) {
    return raw.map((item) => text(item)).filter(Boolean).join("، ");
  }
  if (record(raw)) {
    const rawRecord = record(raw)!;
    return text(rawRecord.label || rawRecord.name || rawRecord.title || rawRecord.value);
  }

  const value = text(raw);
  if (!value || value === "OTHER" || value === "other" || value === "أخرى") return "";

  const matchingField = Array.from(resolvers.byField.entries()).find(([fieldKey]) =>
    fieldKey === columnKey || fieldKey.includes(columnKey) || columnKey.includes(fieldKey),
  );
  const scopedLabel = matchingField?.[1].get(value);
  if (scopedLabel) return scopedLabel;

  const globalLabels = resolvers.globalCandidates.get(value);
  if (globalLabels?.size === 1) return Array.from(globalLabels)[0];
  return value;
}

export function extractSmartReportTable({
  value,
  fields = [],
  snapshotField,
}: {
  value: StructuredTableValueLike;
  fields?: StructuredTableFieldLike[];
  snapshotField?: unknown;
}): SmartReportTable | null {
  const sourceFieldKey = normalizeKey(value.field?.key || value.fieldKey);
  if (!sourceFieldKey) return null;

  const rows = getRowRecords(value.jsonValue ?? value.value);
  if (!rows.length) return null;

  const config = mergeConfigs(
    snapshotField,
    value.field?.defaultJson,
    value.field?.settings,
    value.field?.metadata,
  );
  const columns = inferColumns(rows, config);
  if (!columns.length) return null;

  const resolvers = buildOptionResolvers(fields);
  const normalizedRows: SmartReportTableRow[] = rows
    .map((row, index) => {
      const cells = Object.fromEntries(
        columns.map((column) => [column.key, resolveCell(row, column.key, resolvers)]),
      );
      return {
        id: text(row.id) || `${sourceFieldKey}-row-${index + 1}`,
        cells,
      };
    })
    .filter((row) => Object.values(row.cells).some((cell) => text(cell)));

  if (!normalizedRows.length) return null;

  return {
    id: `table:${sourceFieldKey}`,
    sourceFieldKey,
    title:
      config.tableTitle ||
      TABLE_TITLE_FALLBACKS[sourceFieldKey] ||
      text(value.field?.label) ||
      humanizeColumnKey(sourceFieldKey),
    columns,
    rows: normalizedRows,
    settings: {
      repeatHeader: config.repeatHeader ?? true,
      compact: config.compact ?? false,
      stripedRows: config.stripedRows ?? true,
      highlightFirstColumn: config.highlightFirstColumn ?? false,
    },
  };
}

export function extractSmartReportTables({
  values,
  fields = [],
  snapshotFields = new Map<string, unknown>(),
}: {
  values: StructuredTableValueLike[];
  fields?: StructuredTableFieldLike[];
  snapshotFields?: Map<string, unknown>;
}) {
  return values
    .map((value) =>
      extractSmartReportTable({
        value,
        fields,
        snapshotField: snapshotFields.get(normalizeKey(value.field?.key || value.fieldKey)),
      }),
    )
    .filter((table): table is SmartReportTable => Boolean(table));
}

function estimateRowUnits(row: SmartReportTableRow, columns: SmartReportTableColumn[]) {
  const longestLines = columns.reduce((max, column) => {
    const cell = text(row.cells[column.key]);
    const widthShare = column.width && column.width > 0 ? column.width / 100 : 1 / columns.length;
    const charsPerLine = Math.max(9, Math.floor(62 * widthShare));
    const lines = cell
      .split(/\n+/)
      .reduce((count, line) => count + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);
    return Math.max(max, lines);
  }, 1);
  return Math.max(8, 5 + longestLines * 4.5);
}

export function paginateSmartReportTable(
  table: SmartReportTable,
  options: { maxPageUnits?: number } = {},
) {
  const maxPageUnits = Math.max(36, options.maxPageUnits || 130);
  const chunks: SmartReportTable[] = [];
  let rows: SmartReportTableRow[] = [];
  let units = 14;

  const push = () => {
    if (!rows.length) return;
    const index = chunks.length;
    chunks.push({
      ...table,
      id: index === 0 ? table.id : `${table.id}:continuation:${index + 1}`,
      title: index === 0 ? table.title : `${table.title} - تكملة`,
      rows,
    });
    rows = [];
    units = 14;
  };

  table.rows.forEach((row) => {
    const rowUnits = estimateRowUnits(row, table.columns);
    if (rows.length && units + rowUnits > maxPageUnits) push();
    rows.push(row);
    units += Math.min(rowUnits, maxPageUnits - 14);
  });
  push();

  return chunks;
}

export function getSmartReportTableCell(
  table: SmartReportTable | null | undefined,
  rowIndex: number,
  columnKey: string,
) {
  return text(table?.rows[rowIndex]?.cells[normalizeKey(columnKey)]);
}
