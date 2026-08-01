import type { SmartReportTable } from "@/lib/report-engine/smart-report-types";
import {
  getStructuredValueTableMetadata,
  isStudentIdentityField,
  isStudentDataTable,
} from "@/lib/workflow-values/structured-value-metadata";

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

export function hasMeaningfulStructuredTableValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") {
    const normalized = value.trim();
    return Boolean(normalized && normalized !== "-" && normalized !== "—");
  }
  if (Array.isArray(value)) {
    return value.some(hasMeaningfulStructuredTableValue);
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(
      hasMeaningfulStructuredTableValue,
    );
  }
  return true;
}

export function getStudentDataTableTitle(
  rowCount: number,
  genders: Array<unknown>,
) {
  const normalizedGenders = genders.map((gender) =>
    clean(gender).toUpperCase(),
  );
  const allFemale =
    rowCount > 0 &&
    normalizedGenders.length === rowCount &&
    normalizedGenders.every((gender) => gender === "FEMALE");

  if (rowCount === 1) return allFemale ? "بيانات الطالبة" : "بيانات الطالب";
  return allFemale ? "بيانات الطالبات" : "بيانات الطلاب";
}

export function normalizeSmartReportTablePresentation(table: SmartReportTable) {
  const columns = table.columns.filter((column) =>
    table.rows.some((row) =>
      hasMeaningfulStructuredTableValue(row.cells[column.key]),
    ),
  );
  const studentTable = isStudentDataTable(table);

  return {
    ...table,
    ...(studentTable
      ? {
          title: getStudentDataTableTitle(
            table.rows.length,
            table.rows.map((row) => row.metadata?.gender),
          ),
        }
      : {}),
    columns,
  } satisfies SmartReportTable;
}

export function normalizeStructuredTableBlockPresentation<T extends Record<string, unknown>>(
  block: T,
) {
  if (block.kind !== "structured-table") return block;
  const columns = Array.isArray(block.columns) ? block.columns : [];
  const rows = Array.isArray(block.rows) ? block.rows : [];
  const columnWidths = Array.isArray(block.columnWidths) ? block.columnWidths : [];
  const retainedIndexes = columns
    .map((_, index) => index)
    .filter((index) =>
      rows.some((row) =>
        hasMeaningfulStructuredTableValue(
          Array.isArray(row) ? row[index] : undefined,
        ),
      ),
    );
  const studentTable = isStudentDataTable(block);
  const rowMetadata = Array.isArray(block.rowMetadata) ? block.rowMetadata : [];
  const calculatedStudentTitle = getStudentDataTableTitle(
    rows.length,
    rowMetadata.map((metadata) =>
      metadata && typeof metadata === "object"
        ? (metadata as { gender?: unknown }).gender
        : null,
    ),
  );
  const studentTitle =
    block.reportTwoVirtualBlock === true
      ? `${clean(block.studentTableTitle) || calculatedStudentTitle} - تكملة`
      : calculatedStudentTitle;

  return {
    ...block,
    ...(studentTable
      ? {
          title: studentTitle,
          studentTableTitle:
            clean(block.studentTableTitle) || calculatedStudentTitle,
          showTitle: true,
        }
      : {}),
    columns: retainedIndexes.map((index) => columns[index]),
    rows: rows.map((row) =>
      retainedIndexes.map((index) => (Array.isArray(row) ? row[index] : "")),
    ),
    columnWidths: retainedIndexes.map((index) => columnWidths[index] ?? 0),
  };
}

export function resolveStructuredTableDisplayMetadata(table: SmartReportTable) {
  const metadata = getStructuredValueTableMetadata(table.sourceFieldKey);
  if (!metadata) return normalizeSmartReportTablePresentation(table);

  const configuredColumns = new Map(
    metadata.tableColumns.map((column) => [normalizeKey(column.key), column]),
  );
  const title =
    !clean(table.title) ||
    normalizedTechnicalTitle(table.title) === normalizedTechnicalTitle(table.sourceFieldKey)
      ? metadata.tableTitle
      : table.title;

  return normalizeSmartReportTablePresentation({
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
  } satisfies SmartReportTable);
}

export function applyStructuredTableDisplayMetadataToTemplate(
  template: unknown,
  sourcePayload: unknown,
) {
  if (!template || typeof template !== "object") return template;
  if (!sourcePayload || typeof sourcePayload !== "object") {
    return normalizeStudentDataTableBlockOrder(template);
  }

  const payloadTables = (sourcePayload as { tables?: unknown }).tables;
  if (!Array.isArray(payloadTables) || !payloadTables.length) {
    return normalizeStudentDataTableBlockOrder(template);
  }

  const tables = payloadTables
    .filter((table): table is SmartReportTable => Boolean(table && typeof table === "object"))
    .map(resolveStructuredTableDisplayMetadata);
  const byId = new Map(tables.map((table) => [clean(table.id), table]));
  const source = template as { pages?: unknown };
  if (!Array.isArray(source.pages)) return template;

  return normalizeStudentDataTableBlockOrder({
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
          if (!table) return normalizeStructuredTableBlockPresentation(blockRecord);

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
            ...(isStudentDataTable({
              sourceFieldKey: table.sourceFieldKey,
              sourceTableId: table.id,
              columns: table.columns,
            })
              ? { showTitle: true }
              : {}),
            columns: table.columns.map((column) => column.label),
            rows: table.rows.map((row) =>
              table.columns.map((column) => row.cells[column.key] || ""),
            ),
            columnWidths: table.columns.map((column) => column.width || 0),
            rowMetadata: table.rows.map((row) => ({
              gender: row.metadata?.gender || null,
            })),
          };
        }),
      };
    }),
  });
}

export function normalizeStudentDataTableBlockOrder(template: unknown) {
  if (!template || typeof template !== "object") return template;
  const source = template as { pages?: unknown };
  if (!Array.isArray(source.pages)) return template;

  const studentBlocks: Record<string, unknown>[] = [];
  const signatureBlocks: Record<string, unknown>[] = [];
  const hasStudentTable = source.pages.some((page) =>
    Boolean(
      page &&
        typeof page === "object" &&
        Array.isArray((page as { blocks?: unknown }).blocks) &&
        ((page as { blocks: unknown[] }).blocks.some(
          (block) =>
            Boolean(block && typeof block === "object") &&
            (block as Record<string, unknown>).kind === "structured-table" &&
            isStudentDataTable(block as Record<string, unknown>),
        )),
    ),
  );
  const pages = source.pages.map((page) => {
    if (!page || typeof page !== "object") return page;
    const pageRecord = page as Record<string, unknown>;
    if (!Array.isArray(pageRecord.blocks)) return page;

    const blocks = pageRecord.blocks.flatMap((block) => {
      if (!block || typeof block !== "object") return [block];
      const candidate = normalizeStructuredTableBlockPresentation(
        block as Record<string, unknown>,
      );
      const studentTable =
        candidate.kind === "structured-table" && isStudentDataTable(candidate);
      const signatureBlock =
        candidate.kind === "signature-grid" ||
        candidate.kind === "signatures" ||
        candidate.kind === "approval-signatures" ||
        Array.isArray(candidate.signatures);
      if (signatureBlock) {
        signatureBlocks.push({ ...candidate, placement: "flow" });
        return [];
      }

      if (!studentTable) {
        if (
          hasStudentTable &&
          candidate.kind === "dynamic-fields" &&
          Array.isArray(candidate.dynamicFields)
        ) {
          const dynamicFields = candidate.dynamicFields.filter(
            (field) =>
              !field ||
              typeof field !== "object" ||
              !isStudentIdentityField(field as Record<string, unknown>),
          );
          return [
            {
              ...candidate,
              dynamicFields,
              ...(dynamicFields.length ? {} : { visible: false }),
            },
          ];
        }
        return [candidate];
      }

      const normalizedStudentBlock = normalizeStructuredTableBlockPresentation({
        ...candidate,
        showTitle: true,
      });
      const id = clean(candidate.id);
      const sourceBlockId = clean(candidate.sourceBlockId);
      const continuation =
        candidate.reportTwoVirtualBlock === true ||
        /-auto-table-\d+$/i.test(id) ||
        Boolean(sourceBlockId && sourceBlockId !== id);
      if (continuation) return [normalizedStudentBlock];

      studentBlocks.push(normalizedStudentBlock);
      return [];
    });
    return { ...pageRecord, blocks };
  });

  if (!studentBlocks.length && !signatureBlocks.length) return template;
  const targetPageIndex = pages.findIndex((page) => {
    if (!page || typeof page !== "object") return false;
    const candidate = page as Record<string, unknown>;
    return candidate.kind !== "evidence" && Array.isArray(candidate.blocks);
  });
  if (targetPageIndex < 0) return template;

  const lastPageIndex = pages.length - 1;

  return {
    ...(source as Record<string, unknown>),
    pages: pages.map((page, index) => {
      if (!page || typeof page !== "object") return page;
      const pageRecord = page as Record<string, unknown>;
      const existingBlocks = (pageRecord.blocks as unknown[]) || [];
      return {
        ...pageRecord,
        blocks: [
          ...(index === targetPageIndex ? studentBlocks : []),
          ...existingBlocks,
          ...(index === lastPageIndex ? signatureBlocks : []),
        ],
      };
    }),
  };
}
