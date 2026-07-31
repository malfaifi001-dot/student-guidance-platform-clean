import type { SmartReportTable } from "@/lib/report-engine/smart-report-types";
import { getStructuredValueTableMetadata } from "@/lib/workflow-values/structured-value-metadata";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeKey(value: unknown) {
  return clean(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function normalizedTechnicalTitle(value: unknown) {
  return normalizeKey(value)
    .replace(/^selected_/, "")
    .replace(/_(?:json|values?)$/, "");
}

function isUnresolvedLabel(label: unknown, key: unknown) {
  const normalizedLabel = normalizeKey(label);
  const normalizedKey = normalizeKey(key);
  return !normalizedLabel || normalizedLabel === normalizedKey;
}

export function resolveStructuredTableDisplayMetadata(table: SmartReportTable) {
  const metadata = getStructuredValueTableMetadata(table.sourceFieldKey);
  if (!metadata) return table;

  const configuredColumns = new Map(
    metadata.tableColumns.map((column) => [normalizeKey(column.key), column]),
  );
  const title =
    !clean(table.title) ||
    normalizedTechnicalTitle(table.title) === normalizedTechnicalTitle(table.sourceFieldKey)
      ? metadata.tableTitle
      : table.title;

  return {
    ...table,
    title,
    columns: table.columns.map((column) => {
      const configured = configuredColumns.get(normalizeKey(column.key));
      if (!configured) return column;
      return {
        ...column,
        label: isUnresolvedLabel(column.label, column.key)
          ? configured.label
          : column.label,
        ...(column.width ? {} : configured.width ? { width: configured.width } : {}),
        optionLabels: column.optionLabels || configured.optionLabels,
      };
    }),
  } satisfies SmartReportTable;
}

export function applyStructuredTableDisplayMetadataToTemplate(
  template: unknown,
  sourcePayload: unknown,
) {
  if (!template || typeof template !== "object") return template;
  if (!sourcePayload || typeof sourcePayload !== "object") return template;

  const payloadTables = (sourcePayload as { tables?: unknown }).tables;
  if (!Array.isArray(payloadTables) || !payloadTables.length) return template;

  const tables = payloadTables
    .filter((table): table is SmartReportTable => Boolean(table && typeof table === "object"))
    .map(resolveStructuredTableDisplayMetadata);
  const byId = new Map(tables.map((table) => [clean(table.id), table]));
  const source = template as { pages?: unknown };
  if (!Array.isArray(source.pages)) return template;

  return {
    ...source,
    pages: source.pages.map((page) => {
      if (!page || typeof page !== "object") return page;
      const pageRecord = page as { blocks?: unknown };
      if (!Array.isArray(pageRecord.blocks)) return page;

      return {
        ...pageRecord,
        blocks: pageRecord.blocks.map((block) => {
          if (!block || typeof block !== "object") return block;
          const blockRecord = block as Record<string, unknown>;
          if (blockRecord.kind !== "structured-table") return block;

          const table =
            byId.get(clean(blockRecord.sourceTableId)) ||
            tables.find(
              (candidate) =>
                normalizeKey(candidate.sourceFieldKey) === normalizeKey(blockRecord.sourceFieldKey),
            );
          if (!table) return block;

          const savedTitle = clean(blockRecord.title);
          const title =
            !savedTitle ||
            normalizedTechnicalTitle(savedTitle) ===
              normalizedTechnicalTitle(table.sourceFieldKey)
              ? table.title
              : savedTitle;

          return {
            ...blockRecord,
            title,
            columns: table.columns.map((column) => column.label),
          };
        }),
      };
    }),
  };
}
