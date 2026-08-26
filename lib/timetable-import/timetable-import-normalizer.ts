import type {
  ImportedTimetableEntry,
  TimetableImportResult,
  TimetableImportSourceType,
} from "./timetable-import-types";
import { normalizeGeometryTimetable } from "./timetable-geometry-normalizer";

type Row = Record<string, unknown> | unknown[];

const aliases = {
  teacher: ["teacher", "teachername", "المعلم", "اسم المعلم", "اسم المدرس"],
  day: ["day", "weekday", "اليوم", "يوم"],
  period: ["period", "lesson", "الحصة", "رقم الحصة", "الفترة"],
  subject: ["subject", "subjectname", "المادة", "اسم المادة"],
  grade: ["grade", "gradename", "الصف", "المرحلة"],
  classroom: ["class", "classroom", "section", "الفصل", "الشعبة", "الصف/الفصل"],
} as const;

function clean(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function key(value: unknown) {
  return clean(value).toLowerCase().replace(/[\s_\-:/]+/g, "");
}

function findColumn(headers: string[], names: readonly string[]) {
  const normalized = headers.map(key);
  return normalized.findIndex((header) =>
    names.some((name) => header.includes(key(name)) || key(name).includes(header)),
  );
}

function periodNumber(value: unknown) {
  const match = clean(value).match(/\d+/);
  return match ? Number(match[0]) : NaN;
}

function asRows(value: unknown): Row[] {
  if (!Array.isArray(value)) return [];
  if (value.every((item) => Array.isArray(item) || (item && typeof item === "object"))) {
    return value as Row[];
  }
  return [];
}

function rowsFromExtraction(tables: unknown, text?: string) {
  const tableRows = asRows(tables);
  if (tableRows.length) return tableRows;

  return (text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\t|\||,/).map((cell) => cell.trim()));
}

export function normalizeTimetableRows(
  rows: Row[],
  sourceType: TimetableImportSourceType,
  confidence?: number | null,
): TimetableImportResult {
  if (!rows.length) {
    return {
      sourceType,
      entries: [],
      warnings: ["لم يتم العثور على صفوف قابلة للقراءة."],
      issues: [],
      confidence: confidence ?? null,
    };
  }

  const first = rows[0];
  const headers = Array.isArray(first)
    ? first.map(clean)
    : Object.keys(first).map(clean);
  const indexes = {
    teacher: findColumn(headers, aliases.teacher),
    day: findColumn(headers, aliases.day),
    period: findColumn(headers, aliases.period),
    subject: findColumn(headers, aliases.subject),
    grade: findColumn(headers, aliases.grade),
    classroom: findColumn(headers, aliases.classroom),
  };
  const hasHeader = indexes.teacher >= 0 && indexes.day >= 0 && indexes.period >= 0;
  const dataRows = hasHeader ? rows.slice(1) : rows;

  const entries: ImportedTimetableEntry[] = [];
  const warnings: string[] = [];

  dataRows.forEach((row) => {
    const values = Array.isArray(row) ? row : null;
    const object = !values && row && typeof row === "object" ? row : null;
    const get = (index: number, names: readonly string[]) => {
      if (values) return index >= 0 ? values[index] : "";
      const found = Object.entries(object || {}).find(([name]) =>
        names.some((alias) => key(name).includes(key(alias))),
      );
      return found?.[1] ?? "";
    };

    const entry: ImportedTimetableEntry = {
      teacherName: clean(get(indexes.teacher, aliases.teacher)),
      day: clean(get(indexes.day, aliases.day)),
      period: periodNumber(get(indexes.period, aliases.period)),
      subjectName: clean(get(indexes.subject, aliases.subject)) || null,
      gradeName: clean(get(indexes.grade, aliases.grade)) || null,
      classroomName: clean(get(indexes.classroom, aliases.classroom)) || null,
      rawCell: values ? values.map(clean).filter(Boolean).join(" | ") : JSON.stringify(row),
    };

    if (entry.teacherName || entry.day || Number.isFinite(entry.period)) {
      entries.push(entry);
    }
  });

  if (!hasHeader) {
    warnings.push("لم يتم التعرف على صف العناوين؛ راجع ترتيب الحقول قبل التأكيد.");
  }

  return { sourceType, entries, warnings, issues: [], confidence: confidence ?? null };
}

export function normalizeOcrExtraction(
  extraction: { tables?: unknown; text?: string; confidence?: number | null; pages?: import("./timetable-import-types").OcrPage[]; blocks?: import("./timetable-import-types").OcrBlock[] },
  sourceType: TimetableImportSourceType,
) {
  const pages = extraction.pages?.length
    ? extraction.pages
    : extraction.blocks?.length
      ? [{ page: 1, blocks: extraction.blocks }]
      : [];

  if (pages.some((page) => (page.blocks || []).length > 0)) {
    return normalizeGeometryTimetable(pages, sourceType, extraction.confidence);
  }

  return normalizeTimetableRows(
    rowsFromExtraction(extraction.tables, extraction.text),
    sourceType,
    extraction.confidence,
  );
}
