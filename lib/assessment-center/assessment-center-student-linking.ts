import type { AssessmentResultRow } from "./assessment-center-types";

export type AssessmentStudentCandidate = {
  id: string;
  fullName: string;
  nationalId?: string | null;
  grade?: string | null;
  classroom?: string | null;
};

type ScoredCandidate = {
  student: AssessmentStudentCandidate;
  score: number;
  reason: string;
};

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

function normalizeText(value?: string | null) {
  return normalizeArabicDigits(String(value || ""))
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/[ىي]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\b(بن|ابن|بنت)\b/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function compactText(value?: string | null) {
  return normalizeText(value).replace(/\s+/g, "");
}

function normalizeNationalId(value?: string | null) {
  return normalizeArabicDigits(String(value || ""))
    .replace(/[^\d]/g, "")
    .trim();
}

function tokenize(value?: string | null) {
  return normalizeText(value)
    .split(" ")
    .map((item) => item.trim())
    .filter(Boolean);
}

function tokenSimilarity(a?: string | null, b?: string | null) {
  const left = new Set(tokenize(a));
  const right = new Set(tokenize(b));

  if (!left.size || !right.size) return 0;

  let shared = 0;

  for (const token of left) {
    if (right.has(token)) shared += 1;
  }

  return shared / Math.max(left.size, right.size);
}

function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i += 1) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      matrix[i][j] =
        b.charAt(i - 1) === a.charAt(j - 1)
          ? matrix[i - 1][j - 1]
          : Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
    }
  }

  return matrix[b.length][a.length];
}

function stringSimilarity(a?: string | null, b?: string | null) {
  const left = normalizeText(a);
  const right = normalizeText(b);

  if (!left || !right) return 0;
  if (left === right) return 1;

  const distance = levenshtein(left, right);
  return 1 - distance / Math.max(left.length, right.length);
}

function sameValue(a?: string | null, b?: string | null) {
  const left = normalizeText(a);
  const right = normalizeText(b);

  return Boolean(left && right && left === right);
}

function scoreCandidate(
  row: AssessmentResultRow,
  student: AssessmentStudentCandidate
): ScoredCandidate {
  const rowNationalId = normalizeNationalId(row.nationalId);
  const studentNationalId = normalizeNationalId(student.nationalId);

  if (rowNationalId && studentNationalId && rowNationalId === studentNationalId) {
    return {
      student,
      score: 100,
      reason: "تم الربط تلقائيًا برقم الهوية بنسبة ثقة 100%.",
    };
  }

  let score = 0;
  const reasons: string[] = [];

  const rowName = normalizeText(row.studentName);
  const studentName = normalizeText(student.fullName);

  if (rowName && studentName && rowName === studentName) {
    score += 78;
    reasons.push("تطابق الاسم");
  } else if (compactText(row.studentName) === compactText(student.fullName)) {
    score += 76;
    reasons.push("تطابق الاسم بعد إزالة المسافات");
  } else {
    const tokenScore = tokenSimilarity(row.studentName, student.fullName);
    const similarityScore = stringSimilarity(row.studentName, student.fullName);
    const nameScore = Math.round(Math.max(tokenScore, similarityScore) * 72);

    score += nameScore;

    if (nameScore >= 60) {
      reasons.push("تشابه عال في الاسم");
    } else if (nameScore >= 48) {
      reasons.push("تشابه متوسط في الاسم");
    }
  }

  if (row.grade && sameValue(row.grade, student.grade)) {
    score += 10;
    reasons.push("تطابق الصف");
  }

  if (row.classroom && sameValue(row.classroom, student.classroom)) {
    score += 10;
    reasons.push("تطابق الفصل");
  }

  return {
    student,
    score: Math.min(score, 99),
    reason: reasons.length
      ? `تم الترشيح بسبب: ${reasons.join("، ")}. درجة الثقة ${Math.min(score, 99)}%.`
      : "لم توجد مؤشرات كافية للربط.",
  };
}

function getSortedCandidates(
  row: AssessmentResultRow,
  students: AssessmentStudentCandidate[]
) {
  return students
    .map((student) => scoreCandidate(row, student))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function linkAssessmentRowsToStudents({
  rows,
  students,
}: {
  rows: AssessmentResultRow[];
  students: AssessmentStudentCandidate[];
}): AssessmentResultRow[] {
  return rows.map((row) => {
    const candidates = getSortedCandidates(row, students);
    const top = candidates[0];
    const second = candidates[1];

    if (!top) {
      return {
        ...row,
        studentId: null,
        matchedStudentName: null,
        linkStatus: "UNMATCHED",
        linkReason: "لم يتم العثور على طالب مطابق في مركز البيانات.",
        linkConfidence: 0,
      };
    }

    if (top.score >= 50) {
      return {
        ...row,
        studentId: top.student.id,
        matchedStudentName: top.student.fullName,
        nationalId: row.nationalId || top.student.nationalId || null,
        linkStatus: "LINKED",
        linkReason: `${top.reason} تم اعتماد الربط تلقائيًا لأن درجة الثقة ${top.score}% وهي 50% أو أكثر.`,
        linkConfidence: top.score,
      };
    }

    return {
      ...row,
      studentId: null,
      matchedStudentName: null,
      linkStatus: "UNMATCHED",
      linkReason: "لا توجد درجة ثقة كافية للربط التلقائي. الحد الأدنى المعتمد 50%.",
      linkConfidence: top.score,
    };
  });
}