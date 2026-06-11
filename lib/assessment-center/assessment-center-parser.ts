import * as XLSX from "xlsx";
import type { AssessmentResultRow } from "./assessment-center-types";

type SheetRow = unknown[];

type StudentSheetMeta = {
  studentName: string;
  nationalId?: string | null;
  grade?: string | null;
  classroom?: string | null;
  semester?: string | null;
  academicYear?: string | null;
};

const tabularHeaderAliases = {
  studentName: [
    "اسم الطالب",
    "اسم الطالبة",
    "الطالب",
    "الطالبة",
    "الاسم",
    "اسم الطالب/الطالبة",
    "studentName",
    "student",
    "name",
  ],
  nationalId: [
    "رقم الهوية",
    "الهوية",
    "السجل المدني",
    "رقم السجل",
    "رقم هوية الطالب",
    "رقم هوية الطالبة",
    "nationalId",
    "idNumber",
  ],
  grade: ["الصف", "الصف الدراسي", "المرحلة", "grade", "classLevel"],
  classroom: ["الفصل", "الشعبة", "القسم", "classroom", "section"],
  subject: ["المادة", "اسم المادة", "المواد الدراسية", "subject", "course"],
  score: ["الدرجة", "درجة الطالب", "درجة الطالبة", "المجموع", "score", "mark"],
  maxScore: [
    "الدرجة الكلية",
    "النهاية العظمى",
    "الدرجة العظمى",
    "الحد الأعلى",
    "maxScore",
    "total",
    "outOf",
  ],
  percentage: [
    "النسبة",
    "النسبة المئوية",
    "المجموع",
    "الدرجة النهائية",
    "percentage",
    "percent",
  ],
  semester: ["الفصل الدراسي", "الترم", "semester", "term"],
  academicYear: ["العام الدراسي", "السنة الدراسية", "year"],
};

const studentReportHeaderAliases = {
  subject: ["المواد الدراسية", "المادة", "اسم المادة", "المقرر"],
  score: ["المجموع", "الدرجة", "درجة الطالب", "درجة الطالبة"],
  percentage: ["المجموع", "النسبة", "النسبة المئوية", "الدرجة النهائية"],
  weightedScore: ["الدرجة الموزونة", "الموزونة"],
  finalExam: ["اختبار نهاية الفصل", "الاختبار النهائي"],
  gradeLabel: ["التقدير"],
};

const excludedAcademicSubjects = [
  "السلوك",
  "المواظبة",
  "المواطبة",
  "الغياب",
  "الحضور",
];

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

function normalizeText(value: unknown) {
  return normalizeArabicDigits(String(value ?? ""))
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/[ىي]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKey(value: unknown) {
  return normalizeText(value)
    .replace(/[^\p{L}\p{N}]/gu, "")
    .toLowerCase();
}

function toText(value: unknown) {
  return normalizeText(value);
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const text = normalizeArabicDigits(String(value))
    .replace(/٪/g, "")
    .replace(/%/g, "")
    .replace(/,/g, ".")
    .replace(/[^\d.-]/g, "")
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
    return percentage <= 1
      ? Math.round(percentage * 100)
      : Math.round(percentage);
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

function cellMatchesAlias(cell: unknown, aliases: string[]) {
  const normalizedCell = normalizeKey(cell);

  if (!normalizedCell) return false;

  return aliases.some((alias) => {
    const normalizedAlias = normalizeKey(alias);

    return (
      normalizedCell === normalizedAlias ||
      normalizedCell.includes(normalizedAlias) ||
      normalizedAlias.includes(normalizedCell)
    );
  });
}

function getValue(row: Record<string, unknown>, keys: string[]) {
  const normalized = Object.entries(row).map(([key, value]) => ({
    normalizedKey: normalizeKey(key),
    value,
  }));

  for (const wanted of keys) {
    const wantedKey = normalizeKey(wanted);
    const found = normalized.find((item) => item.normalizedKey === wantedKey);

    if (found) return found.value;
  }

  for (const wanted of keys) {
    const wantedKey = normalizeKey(wanted);
    const found = normalized.find(
      (item) =>
        item.normalizedKey.includes(wantedKey) ||
        wantedKey.includes(item.normalizedKey)
    );

    if (found) return found.value;
  }

  return "";
}

function extractInlineLabelValue(value: unknown, labels: string[]) {
  const text = toText(value);

  if (!text) return "";

  for (const label of labels) {
    const normalizedText = normalizeText(text);
    const normalizedLabel = normalizeText(label);
    const index = normalizedText.indexOf(normalizedLabel);

    if (index === -1) continue;

    const result = text
      .slice(index + normalizedLabel.length)
      .replace(/^[\s:：\/\\|-]+/, "")
      .trim();

    if (result && !cellMatchesAlias(result, labels)) {
      return result;
    }
  }

  return "";
}

function isUsefulValue(value: unknown, labels: string[]) {
  const text = toText(value);

  if (!text) return false;
  if (cellMatchesAlias(text, labels)) return false;

  const key = normalizeKey(text);

  if (
    [
      "بيان",
      "الصف",
      "الفصل",
      "الماده",
      "المواد",
      "المجموع",
      "التقدير",
      "اسم",
      "الطالب",
      "الطالبه",
    ].includes(key)
  ) {
    return false;
  }

  return true;
}

function findLabeledValue(rows: SheetRow[], labels: string[]) {
  for (const row of rows.slice(0, 55)) {
    for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
      const cell = row[columnIndex];

      if (!cellMatchesAlias(cell, labels)) continue;

      const inlineValue = extractInlineLabelValue(cell, labels);
      if (inlineValue) return inlineValue;

      const offsets = [
        1, -1, 2, -2, 3, -3, 4, -4, 5, -5,
        6, -6, 7, -7, 8, -8, 9, -9, 10, -10,
        11, -11, 12, -12,
      ];

      for (const offset of offsets) {
        const candidate = row[columnIndex + offset];

        if (isUsefulValue(candidate, labels)) {
          return toText(candidate);
        }
      }
    }
  }

  return "";
}

function normalizeRow(row: SheetRow) {
  return row.map((cell) => toText(cell));
}

function findHeaderIndex(headers: string[], aliases: string[]) {
  const exactIndex = headers.findIndex((header) =>
    aliases.some((alias) => normalizeKey(header) === normalizeKey(alias))
  );

  if (exactIndex !== -1) return exactIndex;

  return headers.findIndex((header) =>
    aliases.some((alias) => normalizeKey(header).includes(normalizeKey(alias)))
  );
}

function findStudentReportHeaderRow(rows: SheetRow[]) {
  let bestIndex = -1;
  let bestScore = 0;

  rows.slice(0, 80).forEach((row, index) => {
    const normalizedRow = normalizeRow(row);
    let score = 0;

    if (
      normalizedRow.some((cell) =>
        cellMatchesAlias(cell, studentReportHeaderAliases.subject)
      )
    ) {
      score += 4;
    }

    if (
      normalizedRow.some((cell) =>
        cellMatchesAlias(cell, studentReportHeaderAliases.percentage)
      )
    ) {
      score += 3;
    }

    if (
      normalizedRow.some((cell) =>
        cellMatchesAlias(cell, studentReportHeaderAliases.gradeLabel)
      )
    ) {
      score += 1;
    }

    if (
      normalizedRow.some((cell) =>
        cellMatchesAlias(cell, studentReportHeaderAliases.weightedScore)
      )
    ) {
      score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestScore >= 5 ? bestIndex : -1;
}

function isExcludedSubject(subject: string) {
  const normalizedSubject = normalizeKey(subject);

  return excludedAcademicSubjects.some((excluded) =>
    normalizedSubject.includes(normalizeKey(excluded))
  );
}

function isStopSubjectRow(subject: string) {
  const normalizedSubject = normalizeKey(subject);

  return [
    "المعدل",
    "المعدلالعام",
    "المجموعالكلي",
    "النسبهالعامه",
    "مجموعالدرجات",
    "الملاحظات",
    "النتيجه",
  ].some((item) => normalizedSubject.includes(normalizeKey(item)));
}

function extractStudentSheetMeta(
  rows: SheetRow[],
  sheetName: string
): StudentSheetMeta {
  const studentName =
    findLabeledValue(rows, [
      "اسم الطالب",
      "اسم الطالبة",
      "الطالب",
      "الطالبة",
      "الاسم",
    ]) || toText(sheetName);

  const nationalId =
    findLabeledValue(rows, [
      "رقم الهوية",
      "هوية الطالب",
      "هوية الطالبة",
      "السجل المدني",
      "رقم السجل المدني",
    ]) || null;

  const grade =
    findLabeledValue(rows, ["الصف", "الصف الدراسي", "المرحلة"]) || null;

  const classroom =
    findLabeledValue(rows, ["الفصل", "الشعبة", "القسم"]) || null;

  const semester =
    findLabeledValue(rows, ["الفصل الدراسي", "الترم"]) || null;

  const academicYear =
    findLabeledValue(rows, ["العام الدراسي", "السنة الدراسية"]) || null;

  return {
    studentName,
    nationalId,
    grade,
    classroom,
    semester,
    academicYear,
  };
}

function parseStudentReportSheet({
  rows,
  sheetName,
}: {
  rows: SheetRow[];
  sheetName: string;
}): AssessmentResultRow[] {
  const headerRowIndex = findStudentReportHeaderRow(rows);

  if (headerRowIndex === -1) return [];

  const headers = normalizeRow(rows[headerRowIndex]);
  const subjectIndex = findHeaderIndex(
    headers,
    studentReportHeaderAliases.subject
  );

  if (subjectIndex === -1) return [];

  const percentageIndex = findHeaderIndex(
    headers,
    studentReportHeaderAliases.percentage
  );

  const scoreIndex = findHeaderIndex(headers, studentReportHeaderAliases.score);
  const meta = extractStudentSheetMeta(rows, sheetName);

  if (!meta.studentName || meta.studentName.length < 3) return [];

  const parsedRows: AssessmentResultRow[] = [];
  let blankSubjectRows = 0;

  for (const row of rows.slice(headerRowIndex + 1)) {
    const subject = toText(row[subjectIndex]);

    if (!subject) {
      blankSubjectRows += 1;
      if (blankSubjectRows >= 8) break;
      continue;
    }

    blankSubjectRows = 0;

    if (isStopSubjectRow(subject)) break;
    if (isExcludedSubject(subject)) continue;

    const directPercentage =
      percentageIndex !== -1 ? toNumber(row[percentageIndex]) : null;

    const directScore =
      scoreIndex !== -1 ? toNumber(row[scoreIndex]) : directPercentage;

    const percentage = normalizePercentage({
      score: directScore,
      maxScore: 100,
      percentage: directPercentage ?? directScore,
    });

    if (percentage === null && directScore === null) continue;

    parsedRows.push({
      id: crypto.randomUUID(),
      studentName: meta.studentName,
      nationalId: meta.nationalId,
      grade: meta.grade,
      classroom: meta.classroom,
      subject,
      score: directScore ?? percentage,
      maxScore: 100,
      percentage,
      semester: meta.semester,
      academicYear: meta.academicYear,
      sourceSheet: sheetName,
    });
  }

  return parsedRows;
}

function parseStudentReportWorkbook(workbook: XLSX.WorkBook) {
  const parsedRows: AssessmentResultRow[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json<SheetRow>(sheet, {
      header: 1,
      defval: "",
      raw: false,
    });

    parsedRows.push(
      ...parseStudentReportSheet({
        rows,
        sheetName,
      })
    );
  }

  return parsedRows;
}

function parseTabularWorkbook(workbook: XLSX.WorkBook) {
  const parsedRows: AssessmentResultRow[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
    });

    for (const row of rows) {
      const studentName = toText(getValue(row, tabularHeaderAliases.studentName));
      const subject = toText(getValue(row, tabularHeaderAliases.subject));

      if (!studentName || !subject) continue;
      if (isExcludedSubject(subject)) continue;

      const score = toNumber(getValue(row, tabularHeaderAliases.score));
      const maxScore =
        toNumber(getValue(row, tabularHeaderAliases.maxScore)) ?? 100;

      const directPercentage = toNumber(
        getValue(row, tabularHeaderAliases.percentage)
      );

      const percentage = normalizePercentage({
        score,
        maxScore,
        percentage: directPercentage,
      });

      parsedRows.push({
        id: crypto.randomUUID(),
        studentName,
        nationalId: toText(getValue(row, tabularHeaderAliases.nationalId)) || null,
        grade: toText(getValue(row, tabularHeaderAliases.grade)) || null,
        classroom: toText(getValue(row, tabularHeaderAliases.classroom)) || null,
        subject,
        score,
        maxScore,
        percentage,
        semester: toText(getValue(row, tabularHeaderAliases.semester)) || null,
        academicYear:
          toText(getValue(row, tabularHeaderAliases.academicYear)) || null,
        sourceSheet: sheetName,
      });
    }
  }

  return parsedRows;
}

export async function parseAssessmentExcel(
  buffer: ArrayBuffer
): Promise<AssessmentResultRow[]> {
  const workbook = XLSX.read(buffer, { type: "array" });

  const studentReportRows = parseStudentReportWorkbook(workbook);

  if (studentReportRows.length > 0) {
    return studentReportRows;
  }

  return parseTabularWorkbook(workbook);
}