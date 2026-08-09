import { paginateSmartReportTable } from "@/lib/report-engine/report-structured-table-extractor";
import type { SmartReportTable } from "@/lib/report-engine/smart-report-types";

const COMMITTEE_ITEMS_SOURCE_FIELD_KEY = "committee_items";

export type LogicalReportBlock = {
  id?: string;
  kind?: string;
  title?: string;
  sourceBlockId?: string;
  sourceTableId?: string;
  sourceFieldKey?: string;
  visible?: boolean;
  placement?: string;
  settings?: Record<string, unknown>;
  signatures?: unknown[];
  evidenceStartIndex?: number;
  columns?: unknown[];
  columnWidths?: unknown[];
  rows?: unknown[];
  rowMetadata?: Array<{ gender?: string | null }>;
  tableSettings?: Record<string, unknown>;
  [key: string]: unknown;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function isCommitteeItemsTable(block: LogicalReportBlock) {
  return (
    text(block.sourceFieldKey).toLowerCase() ===
    COMMITTEE_ITEMS_SOURCE_FIELD_KEY
  );
}

/**
 * The estimated paginator keeps large tables row-safe. When two estimated
 * committee chunks are candidates for the same measured A4, combine them so
 * the real DOM measurement decides whether they fit as one continuous table.
 */
export function mergeAdjacentCommitteeItemsTableBlocks(
  blocks: LogicalReportBlock[],
): LogicalReportBlock[] {
  return blocks.reduce<LogicalReportBlock[]>((merged, block) => {
    const previous = merged[merged.length - 1];
    const sameCommitteeTable =
      previous &&
      isCommitteeItemsTable(previous) &&
      isCommitteeItemsTable(block) &&
      text(previous.sourceBlockId) !== "" &&
      text(previous.sourceBlockId) === text(block.sourceBlockId);

    if (!sameCommitteeTable) {
      merged.push(block);
      return merged;
    }

    merged[merged.length - 1] = {
      ...previous,
      rows: [
        ...(Array.isArray(previous.rows) ? previous.rows : []),
        ...(Array.isArray(block.rows) ? block.rows : []),
      ],
      rowMetadata: [
        ...(Array.isArray(previous.rowMetadata) ? previous.rowMetadata : []),
        ...(Array.isArray(block.rowMetadata) ? block.rowMetadata : []),
      ],
    };

    return merged;
  }, []);
}

/**
 * Splits only table rows into generic continuation blocks. It never creates
 * logical or physical pages; SmartPhysicalReportComposer still performs the
 * real DOM-driven A4 packing for every resulting block.
 */
export function paginateStructuredTableBlock(
  block: LogicalReportBlock,
): LogicalReportBlock[] {
  if (block.kind !== "structured-table") {
    return [block];
  }

  const columns = Array.isArray(block.columns)
    ? block.columns.map((column) => text(column))
    : [];
  const rows = Array.isArray(block.rows) ? block.rows : [];

  if (!columns.length || !rows.length) {
    return [block];
  }

  const sourceBlockId = text(block.sourceBlockId) || text(block.id) || "structured-table";
  const settings = block.tableSettings || {};
  const committeeItemsTable = isCommitteeItemsTable(block);
  const table: SmartReportTable = {
    id: text(block.sourceTableId) || sourceBlockId,
    sourceFieldKey: text(block.sourceFieldKey),
    title: text(block.title),
    columns: columns.map((label, index) => ({
      key: `column_${index}`,
      label,
      ...(Number(block.columnWidths?.[index]) > 0
        ? { width: Number(block.columnWidths?.[index]) }
        : {}),
    })),
    rows: rows.map((rawRow, rowIndex) => {
      const row = Array.isArray(rawRow) ? rawRow : [];

      return {
        id: `${sourceBlockId}-row-${rowIndex + 1}`,
        cells: Object.fromEntries(
          columns.map((_, columnIndex) => [
            `column_${columnIndex}`,
            text(row[columnIndex]),
          ]),
        ),
        metadata: {
          gender: block.rowMetadata?.[rowIndex]?.gender || null,
        },
      };
    }),
    settings: {
      repeatHeader: settings.repeatHeader !== false,
      compact: Boolean(settings.compact),
      stripedRows: settings.stripedRows !== false,
      highlightFirstColumn: Boolean(settings.highlightFirstColumn),
    },
  };

  const chunks = paginateSmartReportTable(table);

  return chunks.map((chunk, index) => ({
    ...block,
    id: index === 0 ? block.id : `${sourceBlockId}-table-part-${index + 1}`,
    // A true committee continuation repeats the column header, not the
    // report-section title or a visible "- تكملة" heading.
    title: committeeItemsTable ? table.title : chunk.title,
    showTitle:
      committeeItemsTable && index > 0
        ? false
        : block.showTitle,
    sourceBlockId,
    rows: chunk.rows.map((row) =>
      chunk.columns.map((column) => row.cells[column.key] || ""),
    ),
    rowMetadata: chunk.rows.map((row) => ({
      gender: row.metadata?.gender || null,
    })),
  }));
}
