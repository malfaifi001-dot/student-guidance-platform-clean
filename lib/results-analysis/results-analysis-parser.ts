import * as XLSX from "xlsx";
import type { StudentResultRow } from "./results-analysis-types";

function normalizeKey(value: string) {
  return value.replace(/\s+/g, "").trim().toLowerCase();
}

function getValue(row: Record<string, unknown>, keys: string[]) {
  const normalized = Object.entries(row).map(([key, value]) => ({
    key,
    normalizedKey: normalizeKey(key),
    value,
  }));

  for (const wanted of keys) {
    const found = normalized.find((item) => item.normalizedKey === normalizeKey(wanted));
    if (found) return found.value;
  }

  return "";
}

export async function parseResultsExcel(buffer: ArrayBuffer): Promise<StudentResultRow[]> {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });
return rows
  .map((row) => ({
    id: crypto.randomUUID(),
    studentName: String(getValue(row, ["اسم الطالب", "الطالب", "الاسم", "name", "studentName"])).trim(),
      subject: String(getValue(row, ["المادة", "اسم المادة", "subject"])).trim(),
      score: Number(getValue(row, ["الدرجة", "درجة الطالب", "score"]) || 0),
      maxScore: Number(getValue(row, ["النهاية العظمى", "الدرجة العظمى", "maxScore"]) || 100),
      grade: String(getValue(row, ["الصف", "grade"]) || "").trim() || null,
      classroom: String(getValue(row, ["الفصل", "الشعبة", "classroom", "section"]) || "").trim() || null,
      semester: String(getValue(row, ["الفصل الدراسي", "الترم", "semester", "term"]) || "").trim() || null,
    }))
    .filter((row) => row.studentName && row.subject);
}