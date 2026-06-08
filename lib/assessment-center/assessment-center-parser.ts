import * as XLSX from "xlsx";
import type { AssessmentResultRow } from "./assessment-center-types";

function normalizeArabicDigits(value: string) {
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";

  return value.replace(/[٠-٩۰-۹]/g, (digit) => {
    const arabicIndex = arabicDigits.indexOf(digit);
    if (arabicIndex >= 0) return String(arabicIndex);

    const persianIndex = persianDigits.indexOf(digit);
    if (persianIndex >= 0) return String(persianIndex);

    return digit;
  });
}

function normalizeKey(value: string) {
  return normalizeArabicDigits(value)
    .replace(/\s+/g, "")
    .replace(/[ـ_\-:\/\\|.،,]/g, "")
    .trim()
    .toLowerCase();
}

function getValue(row: Record<string, unknown>, keys: string[]) {
  const normalized = Object.entries(row).map(([key, value]) => ({
    key,
    normalizedKey: normalizeKey(key),
    value,
  }));

  for (const wanted of keys) {
    const found = normalized.find(
      (item) => item.normalizedKey === normalizeKey(wanted)
    );

    if (found) return found.value;
  }

  return "";
}

function toText(value: unknown) {
  return String(value ?? "").trim();
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  const text = normalizeArabicDigits(String(value))
    .replace("%", "")
    .replace(",", ".")
    .trim();

  if (!text) return null;

  const numeric = Number(text);

  return Number.isFinite(numeric) ? numeric : null;
}

function normalizePercentage({
  score,
  maxScore,
  percentage,
}: {
  score?: number | null;
  maxScore?: number | null;
  percentage?: number | null;
}) {
  if (typeof percentage === "number" && Number.isFinite(percentage)) {
    return percentage <= 1 ? Math.round(percentage * 100) : Math.round(percentage);
  }

  if (
    typeof score === "number" &&
    typeof maxScore === "number" &&
    maxScore > 0
  ) {
    return Math.round((score / maxScore) * 100);
  }

  return null;
}

export async function parseAssessmentExcel(
  buffer: ArrayBuffer
): Promise<AssessmentResultRow[]> {
  const workbook = XLSX.read(buffer, { type: "array" });
  const parsedRows: AssessmentResultRow[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
    });

    for (const row of rows) {
      const studentName = toText(
        getValue(row, [
          "اسم الطالب",
          "الطالب",
          "الاسم",
          "studentName",
          "student",
          "name",
        ])
      );

      const subject = toText(
        getValue(row, ["المادة", "اسم المادة", "subject", "course"])
      );

      const score = toNumber(
        getValue(row, ["الدرجة", "درجة الطالب", "score", "mark"])
      );

      const maxScore =
        toNumber(
          getValue(row, [
            "الدرجة الكلية",
            "النهاية العظمى",
            "الدرجة العظمى",
            "maxScore",
            "total",
            "outOf",
          ])
        ) ?? 100;

      const directPercentage = toNumber(
        getValue(row, ["النسبة", "النسبة المئوية", "percentage", "percent"])
      );

      const percentage = normalizePercentage({
        score,
        maxScore,
        percentage: directPercentage,
      });

      if (!studentName || !subject) {
        continue;
      }

      parsedRows.push({
        id: crypto.randomUUID(),
        studentName,
        nationalId:
          toText(
            getValue(row, [
              "رقم الهوية",
              "الهوية",
              "السجل المدني",
              "رقم السجل",
              "nationalId",
              "idNumber",
            ])
          ) || null,
        grade:
          toText(getValue(row, ["الصف", "grade", "classLevel"])) || null,
        classroom:
          toText(
            getValue(row, ["الفصل", "الشعبة", "classroom", "section"])
          ) || null,
        subject,
        score,
        maxScore,
        percentage,
        semester:
          toText(
            getValue(row, ["الفصل الدراسي", "الترم", "semester", "term"])
          ) || null,
        academicYear:
          toText(getValue(row, ["العام الدراسي", "السنة الدراسية", "year"])) ||
          null,
        sourceSheet: sheetName,
      });
    }
  }

  return parsedRows;
}