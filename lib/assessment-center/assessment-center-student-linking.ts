import type { AssessmentResultRow } from "./assessment-center-types";

export type AssessmentStudentCandidate = {
  id: string;
  fullName: string;
  nationalId?: string | null;
  grade?: string | null;
  classroom?: string | null;
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
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeNationalId(value?: string | null) {
  return normalizeArabicDigits(String(value || ""))
    .replace(/[^\d]/g, "")
    .trim();
}

function sameValue(a?: string | null, b?: string | null) {
  const left = normalizeText(a);
  const right = normalizeText(b);

  if (!left || !right) return false;

  return left === right;
}

function buildNationalIdMap(students: AssessmentStudentCandidate[]) {
  const map = new Map<string, AssessmentStudentCandidate>();

  for (const student of students) {
    const nationalId = normalizeNationalId(student.nationalId);

    if (nationalId) {
      map.set(nationalId, student);
    }
  }

  return map;
}

function buildNameMap(students: AssessmentStudentCandidate[]) {
  const map = new Map<string, AssessmentStudentCandidate[]>();

  for (const student of students) {
    const name = normalizeText(student.fullName);

    if (!name) continue;

    map.set(name, [...(map.get(name) || []), student]);
  }

  return map;
}

export function linkAssessmentRowsToStudents({
  rows,
  students,
}: {
  rows: AssessmentResultRow[];
  students: AssessmentStudentCandidate[];
}): AssessmentResultRow[] {
  const nationalIdMap = buildNationalIdMap(students);
  const nameMap = buildNameMap(students);

  return rows.map((row) => {
    const nationalId = normalizeNationalId(row.nationalId);

    if (nationalId) {
      const matched = nationalIdMap.get(nationalId);

      if (matched) {
        return {
          ...row,
          studentId: matched.id,
          matchedStudentName: matched.fullName,
          linkStatus: "LINKED",
          linkReason: "تم الربط برقم الهوية.",
        };
      }
    }

    const name = normalizeText(row.studentName);
    const nameMatches = name ? nameMap.get(name) || [] : [];

    if (nameMatches.length === 0) {
      return {
        ...row,
        studentId: null,
        matchedStudentName: null,
        linkStatus: "UNMATCHED",
        linkReason: "لم يتم العثور على طالب مطابق في مركز البيانات.",
      };
    }

    const gradeAndClassroomMatches = nameMatches.filter((student) => {
      const gradeMatches = row.grade ? sameValue(student.grade, row.grade) : true;
      const classroomMatches = row.classroom
        ? sameValue(student.classroom, row.classroom)
        : true;

      return gradeMatches && classroomMatches;
    });

    if (gradeAndClassroomMatches.length === 1) {
      const matched = gradeAndClassroomMatches[0];

      return {
        ...row,
        studentId: matched.id,
        matchedStudentName: matched.fullName,
        linkStatus: "LINKED",
        linkReason: "تم الربط بالاسم والصف والفصل.",
      };
    }

    if (nameMatches.length === 1) {
      const matched = nameMatches[0];

      return {
        ...row,
        studentId: matched.id,
        matchedStudentName: matched.fullName,
        linkStatus: "LINKED",
        linkReason: "تم الربط بالاسم لأنه فريد في مركز البيانات.",
      };
    }

    return {
      ...row,
      studentId: null,
      matchedStudentName: null,
      linkStatus: "AMBIGUOUS",
      linkReason:
        "يوجد أكثر من طالب بنفس الاسم، ويحتاج الربط إلى مراجعة الصف أو الفصل أو رقم الهوية.",
    };
  });
}