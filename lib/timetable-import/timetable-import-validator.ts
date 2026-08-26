import type {
  ImportedTimetableEntry,
  TimetableImportIssue,
  TimetableImportResult,
} from "./timetable-import-types";

export function validateTimetableEntries(entries: ImportedTimetableEntry[]) {
  const issues: TimetableImportIssue[] = [];

  entries.forEach((entry, index) => {
    const row = index + 1;
    if (!entry.teacherName) {
      issues.push({ severity: "ERROR", message: "اسم المعلم مفقود.", row });
    }
    if (!entry.day) {
      issues.push({ severity: "ERROR", message: "اليوم مفقود.", row });
    }
    if (!Number.isInteger(entry.period) || entry.period < 1 || entry.period > 7) {
      issues.push({ severity: "ERROR", message: "رقم الحصة غير صالح.", row });
    }
    if (!entry.subjectName && !entry.classroomName && !entry.gradeName) {
      issues.push({
        severity: "WARNING",
        message: "لا توجد مادة أو بيانات صفية كافية لهذه الخانة.",
        row,
      });
    }
  });

  if (entries.length === 0) {
    issues.push({ severity: "ERROR", message: "لم يتم التعرف على أي حصص صالحة." });
  }

  return issues;
}

export function validateTimetableImport(result: TimetableImportResult) {
  const geometryIssues: TimetableImportIssue[] = [];
  if (result.geometry) {
    if (result.geometry.weekdayCount < 1) {
      geometryIssues.push({ severity: "ERROR", message: "لم يتم اكتشاف أي يوم دراسي." });
    }
    if (result.geometry.periodColumnCount < 1) {
      geometryIssues.push({ severity: "ERROR", message: "لم يتم اكتشاف أعمدة الحصص." });
    }
    if (result.geometry.teacherRowCount < 1) {
      geometryIssues.push({ severity: "ERROR", message: "لم يتم اكتشاف صفوف المعلمين." });
    }
    if (result.geometry.cellCount < 1) {
      geometryIssues.push({ severity: "ERROR", message: "لم يتم إسناد أي كتلة OCR إلى خلية جدول." });
    }
  }

  return {
    ...result,
    issues: [...result.issues, ...geometryIssues, ...validateTimetableEntries(result.entries)],
  };
}
