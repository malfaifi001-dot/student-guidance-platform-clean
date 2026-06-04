import * as XLSX from "xlsx";

export type NoorParsedStudentRow = {
  sourceSheet: string;
  sourceRowNumber: number;
  rowIndex: number;
  status: "VALID" | "INVALID";
  fullName: string;
  nationalId: string | null;
  gender: "UNKNOWN";
  stage: string | null;
  grade: string | null;
  classroom: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  guardianSource: "INFERRED_FROM_STUDENT_NAME" | "MISSING";
  guardianNeedsReview: boolean;
  errors: string[];
  warnings: string[];
  raw: Record<string, unknown>;
};

export type NoorParsedWorkbook = {
  fileName: string;
  detectedFormat: "NOOR_STUDENT_DATA_LIST";
  sheetsCount: number;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  warningsCount: number;
  schoolName: string | null;
  grades: string[];
  classrooms: string[];
  rows: NoorParsedStudentRow[];
};

type SheetMetadata = {
  schoolName: string | null;
  stage: string | null;
  grade: string | null;
  classroom: string | null;
};

const ARABIC_LETTERS = /[\u0600-\u06FF]/;

const HEADER_KEYWORDS = [
  "اسم الطالب",
  "student",
  "الجنسية",
  "الهوية",
  "السجل",
  "الحالة",
  "رقمها",
  "نوعها",
  "تاريخ الميلاد",
  "كشف بيانات",
  "الادارة العامة",
  "الإدارة العامة",
  "وزارة التعليم",
  "مكتب التعليم",
  "المدرسة",
  "الصف",
  "الفصل",
  "المرحلة",
  "المملكة العربية السعودية",
  "السعودية",
  "رقم الهوية",
  "مستمر",
  "مستجد",
  "ابتدائية",
  "متوسطة",
  "ثانوية",
];

const COMPOUND_FIRST_NAMES = new Set([
  "عبد الرحمن",
  "عبدالرحمن",
  "عبد العزيز",
  "عبدالعزيز",
  "عبد الله",
  "عبدالله",
  "عبد الإله",
  "عبدالإله",
  "عبد الهادي",
  "عبدالهادي",
  "عبد المجيد",
  "عبدالمجيد",
  "عبد الملك",
  "عبدالملك",
  "عبد الكريم",
  "عبدالكريم",
  "عبد المحسن",
  "عبدالمحسن",
  "عبد اللطيف",
  "عبداللطيف",
  "عبد السلام",
  "عبدالسلام",
  "عبد الوهاب",
  "عبدالوهاب",
]);

function text(value: unknown): string {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[ـ]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeArabicName(value: string): string {
  return text(value)
    .replace(/[^\u0600-\u06FF\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function rowValues(row: unknown[]): string[] {
  return row.map(text).filter(Boolean);
}

function rowText(row: unknown[]): string {
  return rowValues(row).join(" ");
}

function includesHeaderKeyword(value: string): boolean {
  const normalized = value.toLowerCase();

  return HEADER_KEYWORDS.some((keyword) =>
    normalized.includes(keyword.toLowerCase()),
  );
}

function looksLikeArabicStudentName(value: string): boolean {
  const cleaned = normalizeArabicName(value);

  if (!cleaned || !ARABIC_LETTERS.test(cleaned)) {
    return false;
  }

  if (includesHeaderKeyword(cleaned)) {
    return false;
  }

  if (/\d/.test(cleaned)) {
    return false;
  }

  const parts = cleaned.split(" ").filter(Boolean);

  return parts.length >= 3 && cleaned.length <= 90;
}

function extractStudentName(row: unknown[]): string | null {
  const candidates = rowValues(row)
    .map(normalizeArabicName)
    .filter(looksLikeArabicStudentName)
    .sort((a, b) => {
      const aWords = a.split(" ").length;
      const bWords = b.split(" ").length;

      if (aWords !== bWords) {
        return bWords - aWords;
      }

      return b.length - a.length;
    });

  return candidates[0] ?? null;
}

function extractNationalId(row: unknown[]): string | null {
  const joined = rowText(row).replace(/[^\d]/g, " ");
  const match = joined.match(/\b\d{10}\b/);

  return match?.[0] ?? null;
}

function valueAroundLabel(
  rows: unknown[][],
  labels: string[],
  maxRows = 30,
): string | null {
  const upper = Math.min(rows.length, maxRows);

  for (let r = 0; r < upper; r += 1) {
    const values = rows[r].map(text);

    for (let c = 0; c < values.length; c += 1) {
      const current = values[c];

      if (!current) {
        continue;
      }

      for (const label of labels) {
        if (!current.includes(label)) {
          continue;
        }

        const sameCell = current
          .replace(label, "")
          .replace(/[:：]/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        if (sameCell && sameCell !== label && !includesHeaderKeyword(sameCell)) {
          return sameCell;
        }

        const rightCandidate = values[c + 1];
        const leftCandidate = values[c - 1];

        if (rightCandidate && rightCandidate !== ":" && !labels.some((item) => rightCandidate.includes(item))) {
          return rightCandidate;
        }

        if (leftCandidate && leftCandidate !== ":" && !labels.some((item) => leftCandidate.includes(item))) {
          return leftCandidate;
        }

        const farLeftCandidate = values[c - 2];

        if (farLeftCandidate && farLeftCandidate !== ":" && !labels.some((item) => farLeftCandidate.includes(item))) {
          return farLeftCandidate;
        }
      }
    }
  }

  return null;
}

function detectGrade(rows: unknown[][], headerText: string): string | null {
  const direct = valueAroundLabel(rows, ["الصف"], 30);

  if (direct && direct.length <= 40 && !direct.includes("الكل")) {
    return direct;
  }

  const gradeMatch = headerText.match(
    /(الأول|الثاني|الثالث|الرابع|الخامس|السادس)\s+(الابتدائي|المتوسط|الثانوي)/,
  );

  if (gradeMatch) {
    return `${gradeMatch[1]} ${gradeMatch[2]}`;
  }

  const gradeOnly = headerText.match(
    /الصف\s*[:：]?\s*(الأول|الثاني|الثالث|الرابع|الخامس|السادس)/,
  );

  return gradeOnly?.[1] ?? null;
}

function detectStage(value: string | null): string | null {
  if (!value) {
    return null;
  }

  if (value.includes("ابتدائي")) {
    return "المرحلة الابتدائية";
  }

  if (value.includes("متوسط")) {
    return "المرحلة المتوسطة";
  }

  if (value.includes("ثانوي")) {
    return "المرحلة الثانوية";
  }

  return null;
}

function detectClassroom(rows: unknown[][], headerText: string): string | null {
  const direct = valueAroundLabel(rows, ["الفصل", "الشعبة"], 30);

  if (direct) {
    const cleaned = text(direct).replace(/^فصل\s*/i, "");

    if (cleaned && cleaned.length <= 30 && !includesHeaderKeyword(cleaned)) {
      return cleaned;
    }
  }

  const beforeLabel = headerText.match(/([0-9أ-يA-Za-z\-]+)\s*[:：]?\s*(?:الفصل|الشعبة)/);

  if (beforeLabel?.[1]) {
    return beforeLabel[1];
  }

  const afterLabel = headerText.match(/(?:الفصل|الشعبة)\s*[:：]?\s*([0-9أ-يA-Za-z\-]+)/);

  return afterLabel?.[1] ?? null;
}

function detectSchoolName(rows: unknown[][]): string | null {
  const direct = valueAroundLabel(rows, ["المدرسة", "اسم المدرسة"], 30);

  if (direct && direct.length <= 80) {
    return direct;
  }

  for (const row of rows.slice(0, 25)) {
    const values = rowValues(row);

    for (const value of values) {
      if (
        value.includes("ابتدائية") ||
        value.includes("متوسطة") ||
        value.includes("ثانوية")
      ) {
        return value;
      }
    }
  }

  return null;
}

function inferSheetMetadata(rows: unknown[][]): SheetMetadata {
  const headerRows = rows.slice(0, 30);
  const headerText = headerRows.map(rowText).join(" ");

  const grade = detectGrade(rows, headerText);
  const stage = detectStage(grade) || valueAroundLabel(rows, ["المرحلة"], 30);
  const classroom = detectClassroom(rows, headerText);
  const schoolName = detectSchoolName(rows);

  return {
    schoolName: schoolName ? text(schoolName) : null,
    stage: stage ? text(stage) : null,
    grade: grade ? text(grade) : null,
    classroom: classroom ? text(classroom) : null,
  };
}

function findStudentTableHeaderIndex(rows: unknown[][]): number | null {
  for (let i = 0; i < rows.length; i += 1) {
    const current = rowText(rows[i]);
    const next = rowText(rows[i + 1] ?? []);

    const combined = `${current} ${next}`;

    const hasArabicStudentNameHeader = combined.includes("اسم الطالب");
    const hasEnglishStudentNameHeader = combined.includes("Student's Name");
    const hasIdentityHeader =
      combined.includes("بيانات الهوية") ||
      combined.includes("رقمها") ||
      combined.includes("نوعها") ||
      combined.includes("رقم الهوية");

    if ((hasArabicStudentNameHeader || hasEnglishStudentNameHeader) && hasIdentityHeader) {
      return i;
    }
  }

  return null;
}

export function inferGuardianNameFromStudentName(fullName: string): {
  guardianName: string | null;
  needsReview: boolean;
} {
  const normalized = normalizeArabicName(fullName);
  const parts = normalized.split(" ").filter(Boolean);

  if (parts.length < 2) {
    return {
      guardianName: null,
      needsReview: true,
    };
  }

  let firstNameWords = 1;

  const twoWords = parts.slice(0, 2).join(" ");
  const oneWord = parts[0];

  if (COMPOUND_FIRST_NAMES.has(twoWords)) {
    firstNameWords = 2;
  } else if (COMPOUND_FIRST_NAMES.has(oneWord)) {
    firstNameWords = 1;
  }

  if ((parts[0] === "عبد" || parts[0] === "أبو" || parts[0] === "ابو") && parts.length >= 3) {
    firstNameWords = 2;
  }

  const guardianParts = parts.slice(firstNameWords);
  const guardianName = guardianParts.join(" ").trim();

  if (!guardianName) {
    return {
      guardianName: null,
      needsReview: true,
    };
  }

  return {
    guardianName,
    needsReview: guardianParts.length < 2,
  };
}

function buildParsedRow(args: {
  row: unknown[];
  sheetName: string;
  sourceRowNumber: number;
  rowIndex: number;
  metadata: SheetMetadata;
  seenNationalIds: Set<string>;
}): NoorParsedStudentRow | null {
  const nationalId = extractNationalId(args.row);

  if (!nationalId) {
    return null;
  }

  const fullName = extractStudentName(args.row);

  if (!fullName) {
    return null;
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  if (args.seenNationalIds.has(nationalId)) {
    warnings.push("رقم الهوية مكرر داخل نفس الملف.");
  }

  args.seenNationalIds.add(nationalId);

  const inferredGuardian = inferGuardianNameFromStudentName(fullName);

  if (!inferredGuardian.guardianName) {
    warnings.push("تعذر استنتاج اسم ولي الأمر من اسم الطالب/الطالبة.");
  } else if (inferredGuardian.needsReview) {
    warnings.push("اسم ولي الأمر المستنتج قصير ويحتاج مراجعة لاحقًا.");
  }

  if (!args.metadata.grade) {
    warnings.push("لم يتم اكتشاف الصف من ترويسة الشيت.");
  }

  if (!args.metadata.classroom) {
    warnings.push("لم يتم اكتشاف الفصل من ترويسة الشيت.");
  }

  return {
    sourceSheet: args.sheetName,
    sourceRowNumber: args.sourceRowNumber,
    rowIndex: args.rowIndex,
    status: errors.length ? "INVALID" : "VALID",
    fullName,
    nationalId,
    gender: "UNKNOWN",
    stage: args.metadata.stage,
    grade: args.metadata.grade,
    classroom: args.metadata.classroom,
    guardianName: inferredGuardian.guardianName,
    guardianPhone: null,
    guardianSource: inferredGuardian.guardianName
      ? "INFERRED_FROM_STUDENT_NAME"
      : "MISSING",
    guardianNeedsReview: inferredGuardian.needsReview,
    errors,
    warnings,
    raw: {
      sourceSheet: args.sheetName,
      sourceRowNumber: args.sourceRowNumber,
      originalRow: rowValues(args.row),
      guardianSource: inferredGuardian.guardianName
        ? "INFERRED_FROM_STUDENT_NAME"
        : "MISSING",
      guardianNeedsReview: inferredGuardian.needsReview,
    },
  };
}

export function parseNoorStudentWorkbook(
  buffer: Buffer,
  fileName: string,
): NoorParsedWorkbook {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: false,
    raw: false,
  });

  const parsedRows: NoorParsedStudentRow[] = [];
  const seenNationalIds = new Set<string>();
  const detectedSchoolNames = new Set<string>();
  let rowIndex = 1;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      continue;
    }

    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      blankrows: false,
      raw: false,
    });

    const metadata = inferSheetMetadata(rows);

    if (metadata.schoolName) {
      detectedSchoolNames.add(metadata.schoolName);
    }

    const tableHeaderIndex = findStudentTableHeaderIndex(rows);
    const startIndex = tableHeaderIndex === null ? 0 : tableHeaderIndex + 1;

    for (let i = startIndex; i < rows.length; i += 1) {
      const parsed = buildParsedRow({
        row: rows[i],
        sheetName,
        sourceRowNumber: i + 1,
        rowIndex,
        metadata,
        seenNationalIds,
      });

      if (parsed) {
        parsedRows.push(parsed);
        rowIndex += 1;
      }
    }
  }

  const grades = Array.from(
    new Set(parsedRows.map((row) => row.grade).filter(Boolean)),
  ) as string[];

  const classrooms = Array.from(
    new Set(parsedRows.map((row) => row.classroom).filter(Boolean)),
  ) as string[];

  return {
    fileName,
    detectedFormat: "NOOR_STUDENT_DATA_LIST",
    sheetsCount: workbook.SheetNames.length,
    totalRows: parsedRows.length,
    validRows: parsedRows.filter((row) => row.status === "VALID").length,
    invalidRows: parsedRows.filter((row) => row.status === "INVALID").length,
    warningsCount: parsedRows.reduce((total, row) => total + row.warnings.length, 0),
    schoolName: Array.from(detectedSchoolNames)[0] ?? null,
    grades,
    classrooms,
    rows: parsedRows,
  };
}
