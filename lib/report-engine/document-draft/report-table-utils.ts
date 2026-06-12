import type {
  ReportTableBlock,
  ReportTableCell,
  ReportTableColumn,
  ReportTableRow,
} from "@/lib/report-engine/document-draft/report-document-types";
import { createReportDocumentId } from "@/lib/report-engine/document-draft/report-document-utils";

export function createReportTableCell(value = ""): ReportTableCell {
  return {
    id: createReportDocumentId("cell"),
    value,
  };
}

export function createReportTableColumn(title: string): ReportTableColumn {
  return {
    id: createReportDocumentId("column"),
    title,
  };
}

export function createReportTableRow(columns: ReportTableColumn[]): ReportTableRow {
  return {
    id: createReportDocumentId("row"),
    cells: columns.map(() => createReportTableCell()),
  };
}

export function createDefaultReportTableBlock(order: number): ReportTableBlock {
  const columns = [
    createReportTableColumn("المجال"),
    createReportTableColumn("الإجراء"),
    createReportTableColumn("ملاحظات"),
  ];

  return {
    id: createReportDocumentId("table"),
    type: "TABLE",
    title: "جدول",
    order,
    source: "USER",
    locked: false,
    settings: {
      highlightHeaderRow: true,
      highlightFirstColumn: true,
      repeatHeaderOnPageBreak: true,
      rounded: true,
      compact: false,
    },
    columns,
    rows: [
      createReportTableRow(columns),
      createReportTableRow(columns),
      createReportTableRow(columns),
    ],
  };
}

export function normalizeTableRows(table: ReportTableBlock): ReportTableBlock {
  return {
    ...table,
    rows: table.rows.map((row) => ({
      ...row,
      cells: table.columns.map((_, index) => {
        return row.cells[index] || createReportTableCell();
      }),
    })),
  };
}

export function addReportTableRow(table: ReportTableBlock): ReportTableBlock {
  return normalizeTableRows({
    ...table,
    rows: [...table.rows, createReportTableRow(table.columns)],
  });
}

export function removeReportTableRow(
  table: ReportTableBlock,
  rowId: string,
): ReportTableBlock {
  if (table.rows.length <= 1) return table;

  return normalizeTableRows({
    ...table,
    rows: table.rows.filter((row) => row.id !== rowId),
  });
}

export function addReportTableColumn(table: ReportTableBlock): ReportTableBlock {
  const nextColumn = createReportTableColumn(`عمود ${table.columns.length + 1}`);

  return normalizeTableRows({
    ...table,
    columns: [...table.columns, nextColumn],
    rows: table.rows.map((row) => ({
      ...row,
      cells: [...row.cells, createReportTableCell()],
    })),
  });
}

export function removeReportTableColumn(
  table: ReportTableBlock,
  columnId: string,
): ReportTableBlock {
  if (table.columns.length <= 1) return table;

  const columnIndex = table.columns.findIndex((column) => column.id === columnId);

  if (columnIndex < 0) return table;

  return normalizeTableRows({
    ...table,
    columns: table.columns.filter((column) => column.id !== columnId),
    rows: table.rows.map((row) => ({
      ...row,
      cells: row.cells.filter((_, index) => index !== columnIndex),
    })),
  });
}

export function updateReportTableColumn(
  table: ReportTableBlock,
  columnId: string,
  title: string,
): ReportTableBlock {
  return {
    ...table,
    columns: table.columns.map((column) =>
      column.id === columnId ? { ...column, title } : column,
    ),
  };
}

export function updateReportTableCell(
  table: ReportTableBlock,
  rowId: string,
  columnId: string,
  value: string,
): ReportTableBlock {
  const columnIndex = table.columns.findIndex((column) => column.id === columnId);

  if (columnIndex < 0) return table;

  return normalizeTableRows({
    ...table,
    rows: table.rows.map((row) => {
      if (row.id !== rowId) return row;

      return {
        ...row,
        cells: row.cells.map((cell, index) =>
          index === columnIndex ? { ...cell, value } : cell,
        ),
      };
    }),
  });
}

export function countFilledTableCells(table: ReportTableBlock) {
  return table.rows.reduce((total, row) => {
    return (
      total +
      row.cells.filter((cell) => String(cell.value || "").trim().length > 0)
        .length
    );
  }, 0);
}