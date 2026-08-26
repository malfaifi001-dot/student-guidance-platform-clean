import type { OcrBlock, OcrPage, ImportedTimetableEntry, TimetableImportResult, TimetableImportSourceType } from "./timetable-import-types";
import { blockBounds, detectTimetableGrid, type DetectedPeriodColumn, type DetectedTeacherRow } from "./timetable-grid-detector";

function confidenceOf(block: OcrBlock) {
  return typeof block.confidence === "number" && Number.isFinite(block.confidence) ? Math.max(0, Math.min(1, block.confidence)) : 0.5;
}

function distanceConfidence(distance: number, scale: number) {
  return Math.max(0, Math.min(1, 1 - distance / Math.max(scale, 1)));
}

function nearestRow(y: number, rows: DetectedTeacherRow[]) {
  return rows.reduce<{ row: DetectedTeacherRow | null; distance: number }>((best, row) => {
    const distance = Math.abs(row.centerY - y);
    return distance < best.distance ? { row, distance } : best;
  }, { row: null, distance: Infinity });
}

function nearestPeriod(x: number, periods: DetectedPeriodColumn[]) {
  return periods.reduce<{ column: DetectedPeriodColumn | null; distance: number }>((best, column) => {
    const distance = Math.abs(column.centerX - x);
    return distance < best.distance ? { column, distance } : best;
  }, { column: null, distance: Infinity });
}

function blockText(block: OcrBlock) {
  return String(block.text || "").replace(/\s+/g, " ").trim();
}

export type GeometryNormalization = {
  entries: ImportedTimetableEntry[];
  warnings: string[];
  geometry: {
    weekdayCount: number;
    periodColumnCount: number;
    teacherRowCount: number;
    cellCount: number;
  };
};

export function normalizeGeometryTimetablePage(blocks: OcrBlock[]): GeometryNormalization {
  const grid = detectTimetableGrid(blocks);
  const measured = blocks.map((block) => ({ block, bounds: blockBounds(block) })).filter((item): item is typeof item & { bounds: NonNullable<ReturnType<typeof blockBounds>> } => Boolean(item.bounds && blockText(item.block)));
  const excluded = new Set(grid.teacherRows.map((row) => row.teacherName));
  const cells = new Map<string, { parts: Array<{ text: string; x: number; confidence: number }>; confidence: number; day: string; period: number; teacher: string }>();
  const warnings = [...grid.warnings];

  measured.forEach(({ block, bounds }) => {
    const text = blockText(block);
    if (!text || excluded.has(text) || grid.days.some((day) => day.label === text) || /^(?:[0-7]|[٠-٧])$/.test(text)) return;
    const match = nearestPeriod(bounds.centerX, grid.periods);
    const rowMatch = nearestRow(bounds.centerY, grid.teacherRows);
    if (!match.column || !rowMatch.row) return;
    const rowScale = Math.max(20, Math.abs(grid.teacherRows[1]?.centerY - grid.teacherRows[0]?.centerY || 40) / 2);
    const periodScale = Math.max(20, Math.abs(grid.periods[1]?.centerX - grid.periods[0]?.centerX || 40) / 2);
    const geometryConfidence = average([match.column.confidence, rowMatch.row.confidence, distanceConfidence(match.distance, periodScale), distanceConfidence(rowMatch.distance, rowScale)]);
    const confidence = average([confidenceOf(block), geometryConfidence]);
    const key = `${rowMatch.row.teacherName}::${match.column.day}::${match.column.period}`;
    const current = cells.get(key) || { parts: [], confidence: 0, day: match.column.day, period: match.column.period, teacher: rowMatch.row.teacherName };
    current.parts.push({ text, x: bounds.centerX, confidence });
    current.confidence = current.parts.reduce((sum, part) => sum + part.confidence, 0) / current.parts.length;
    cells.set(key, current);
  });

  const entries = [...cells.values()].map((cell) => ({
    teacherName: cell.teacher,
    day: cell.day,
    period: cell.period,
    subjectName: null,
    gradeName: null,
    classroomName: null,
    rawCell: cell.parts.sort((a, b) => a.x - b.x).map((part) => part.text).join(" | "),
    confidence: cell.confidence,
  }));

  cells.forEach((cell) => {
    if (cell.confidence < 0.55) warnings.push(`خلية منخفضة الثقة: ${cell.teacher} - ${cell.day} - ${cell.period}.`);
  });
  if (!entries.length) warnings.push("لم يتم إسناد كتل OCR إلى خلايا الجدول.");
  return { entries, warnings, geometry: { weekdayCount: grid.days.length, periodColumnCount: grid.periods.length, teacherRowCount: grid.teacherRows.length, cellCount: entries.length } };
}

export function normalizeGeometryTimetable(
  pages: OcrPage[],
  sourceType: TimetableImportSourceType,
  confidence?: number | null,
): TimetableImportResult {
  const pageResults = pages.map((page) => normalizeGeometryTimetablePage((page.blocks || []).map((block) => ({ ...block, page: page.page }))));
  const entries = pageResults.flatMap((page) => page.entries);
  const warnings = pageResults.flatMap((page) => page.warnings);
  const geometry = pageResults.reduce((summary, page) => ({
    weekdayCount: Math.max(summary.weekdayCount, page.geometry.weekdayCount),
    periodColumnCount: Math.max(summary.periodColumnCount, page.geometry.periodColumnCount),
    teacherRowCount: summary.teacherRowCount + page.geometry.teacherRowCount,
    cellCount: summary.cellCount + page.geometry.cellCount,
  }), { weekdayCount: 0, periodColumnCount: 0, teacherRowCount: 0, cellCount: 0 });
  return { sourceType, entries, warnings, issues: [], confidence: confidence ?? null, geometry };
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}
