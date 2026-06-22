import type {
  AssessmentAnalysisSummary,
  AssessmentGradeBand,
  AssessmentGradeBandSummary,
  AssessmentGroupSummary,
  AssessmentResultRow,
  AssessmentRiskStudent,
  AssessmentStudentPerformanceSummary,
  AssessmentSubjectGradeDistribution,
  AssessmentSubjectSummary,
} from "./assessment-center-types";

type StudentAggregate = {
  key: string;
  studentName: string;
  nationalId?: string | null;
  grade?: string | null;
  classroom?: string | null;
  percentages: number[];
  subjectsMap: Map<string, number[]>;
  linkedStudentIds: Set<string>;
  hasRiskRow: boolean;
  hasNeedsSupportRow: boolean;
};

type SubjectDistributionBands = AssessmentSubjectGradeDistribution["bands"];

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
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );
}

function createSubjectBands(): SubjectDistributionBands {
  return {
    EXCELLENT: 0,
    VERY_GOOD: 0,
    GOOD: 0,
    ACCEPTABLE: 0,
    WEAK: 0,
    UNKNOWN: 0,
  };
}

export function getGradeBand(percentage?: number | null): AssessmentGradeBand {
  if (typeof percentage !== "number" || !Number.isFinite(percentage)) {
    return "UNKNOWN";
  }

  if (percentage >= 90) return "EXCELLENT";
  if (percentage >= 80) return "VERY_GOOD";
  if (percentage >= 70) return "GOOD";
  if (percentage >= 60) return "ACCEPTABLE";
  if (percentage < 60) return "WEAK";
  return "UNKNOWN";
}

export function getGradeBandLabel(band: AssessmentGradeBand) {
  if (band === "EXCELLENT") return "ممتاز";
  if (band === "VERY_GOOD") return "جيد جدًا";
  if (band === "GOOD") return "جيد";
  if (band === "ACCEPTABLE") return "مقبول";
  if (band === "WEAK") return "ضعيف";
  return "غير محدد";
}

export function getAssessmentStudentKey(
  value:
    | Pick<
        AssessmentResultRow,
        "nationalId" | "studentName" | "grade" | "classroom"
      >
    | Pick<
        AssessmentStudentPerformanceSummary,
        "nationalId" | "studentName" | "grade" | "classroom"
      >,
) {
  const nationalId = normalizeArabicDigits(String(value.nationalId || ""))
    .replace(/[^\d]/g, "")
    .trim();

  if (nationalId) return `nid:${nationalId}`;

  return [
    normalizeText(value.studentName),
    normalizeText(value.grade),
    normalizeText(value.classroom),
  ].join("|");
}

export function buildStudentPerformanceSummaries(
  rows: AssessmentResultRow[],
) {
  const students = new Map<string, StudentAggregate>();

  for (const row of rows) {
    const key = getAssessmentStudentKey(row);
    const subject = String(row.subject || "").trim();
    const percentage =
      typeof row.percentage === "number" && Number.isFinite(row.percentage)
        ? row.percentage
        : null;

    const current = students.get(key) || {
      key,
      studentName: row.matchedStudentName || row.studentName,
      nationalId: row.nationalId || null,
      grade: row.grade || null,
      classroom: row.classroom || null,
      percentages: [],
      subjectsMap: new Map<string, number[]>(),
      linkedStudentIds: new Set<string>(),
      hasRiskRow: false,
      hasNeedsSupportRow: false,
    };

    if (row.studentId) current.linkedStudentIds.add(row.studentId);
    if (row.status === "RISK") current.hasRiskRow = true;
    if (row.status === "NEEDS_SUPPORT") current.hasNeedsSupportRow = true;

    if (percentage !== null) {
      current.percentages.push(percentage);

      if (subject) {
        const subjectPercentages = current.subjectsMap.get(subject) || [];
        subjectPercentages.push(percentage);
        current.subjectsMap.set(subject, subjectPercentages);
      }
    }

    students.set(key, current);
  }

  const performance = Array.from(students.values()).map(
    (student): AssessmentStudentPerformanceSummary & {
      band: AssessmentGradeBand;
      linkedStudentIds: Set<string>;
      hasRiskRow: boolean;
      hasNeedsSupportRow: boolean;
    } => {
      const subjectEntries = Array.from(student.subjectsMap.entries()).map(
        ([subject, percentages]) => ({
          subject,
          averagePercentage: average(percentages),
        }),
      );

      const weakSubjects = subjectEntries
        .filter((item) => item.averagePercentage < 60)
        .sort((a, b) => a.averagePercentage - b.averagePercentage)
        .map((item) => item.subject);

      const strongestSubjects = subjectEntries
        .sort((a, b) => b.averagePercentage - a.averagePercentage)
        .slice(0, 3)
        .map((item) => item.subject);

      const averagePercentage = average(student.percentages);

      return {
        studentName: student.studentName,
        nationalId: student.nationalId,
        grade: student.grade,
        classroom: student.classroom,
        averagePercentage,
        subjectsCount: uniqueStrings(Array.from(student.subjectsMap.keys())).length,
        weakSubjects,
        strongestSubjects,
        band: getGradeBand(averagePercentage),
        linkedStudentIds: student.linkedStudentIds,
        hasRiskRow: student.hasRiskRow,
        hasNeedsSupportRow: student.hasNeedsSupportRow,
      };
    },
  );

  return performance.sort((a, b) => {
    if (b.averagePercentage !== a.averagePercentage) {
      return b.averagePercentage - a.averagePercentage;
    }

    return a.studentName.localeCompare(b.studentName, "ar");
  });
}

function buildSubjectAverages(rows: AssessmentResultRow[]) {
  const subjects = new Map<string, number[]>();
  const riskCounts = new Map<string, number>();

  for (const row of rows) {
    const subject = String(row.subject || "").trim();
    if (!subject) continue;

    const percentage =
      typeof row.percentage === "number" && Number.isFinite(row.percentage)
        ? row.percentage
        : null;

    if (percentage !== null) {
      const current = subjects.get(subject) || [];
      current.push(percentage);
      subjects.set(subject, current);
    }

    if (
      row.status === "RISK" ||
      row.status === "NEEDS_SUPPORT" ||
      (percentage !== null && percentage < 70)
    ) {
      riskCounts.set(subject, (riskCounts.get(subject) || 0) + 1);
    }
  }

  const result: AssessmentSubjectSummary[] = Array.from(subjects.entries()).map(
    ([subject, percentages]) => ({
      subject,
      averagePercentage: average(percentages),
      totalRows: percentages.length,
      riskCount: riskCounts.get(subject) || 0,
    }),
  );

  return result.sort((a, b) => a.averagePercentage - b.averagePercentage);
}

function buildGroupedAverages(
  rows: AssessmentResultRow[],
  keyGetter: (row: AssessmentResultRow) => string | null,
) {
  const groups = new Map<string, number[]>();
  const riskCounts = new Map<string, number>();

  for (const row of rows) {
    const key = keyGetter(row);
    if (!key) continue;

    const percentage =
      typeof row.percentage === "number" && Number.isFinite(row.percentage)
        ? row.percentage
        : null;

    if (percentage !== null) {
      const current = groups.get(key) || [];
      current.push(percentage);
      groups.set(key, current);
    }

    if (
      row.status === "RISK" ||
      row.status === "NEEDS_SUPPORT" ||
      (percentage !== null && percentage < 70)
    ) {
      riskCounts.set(key, (riskCounts.get(key) || 0) + 1);
    }
  }

  const result: AssessmentGroupSummary[] = Array.from(groups.entries()).map(
    ([label, percentages]) => ({
      label,
      averagePercentage: average(percentages),
      totalRows: percentages.length,
      riskCount: riskCounts.get(label) || 0,
    }),
  );

  return result.sort((a, b) => a.averagePercentage - b.averagePercentage);
}

function buildSubjectGradeDistribution(rows: AssessmentResultRow[]) {
  const subjects = new Map<
    string,
    {
      percentages: number[];
      totalRows: number;
      bands: SubjectDistributionBands;
    }
  >();

  for (const row of rows) {
    const subject = String(row.subject || "").trim();
    if (!subject) continue;

    const current = subjects.get(subject) || {
      percentages: [],
      totalRows: 0,
      bands: createSubjectBands(),
    };

    current.totalRows += 1;

    const percentage =
      typeof row.percentage === "number" && Number.isFinite(row.percentage)
        ? row.percentage
        : null;

    if (percentage !== null) {
      current.percentages.push(percentage);
    }

    const band = getGradeBand(percentage);
    current.bands[band] += 1;

    subjects.set(subject, current);
  }

  return Array.from(subjects.entries())
    .map(
      ([subject, value]): AssessmentSubjectGradeDistribution => ({
        subject,
        averagePercentage: average(value.percentages),
        totalRows: value.totalRows,
        bands: value.bands,
      }),
    )
    .sort((a, b) => a.averagePercentage - b.averagePercentage);
}

function buildGradeBandSummary(
  students: AssessmentStudentPerformanceSummary[],
): AssessmentGradeBandSummary[] {
  const total = students.length || 1;
  const counts = new Map<AssessmentGradeBand, number>([
    ["EXCELLENT", 0],
    ["VERY_GOOD", 0],
    ["GOOD", 0],
    ["ACCEPTABLE", 0],
    ["WEAK", 0],
    ["UNKNOWN", 0],
  ]);

  for (const student of students) {
    const band = getGradeBand(student.averagePercentage);
    counts.set(band, (counts.get(band) || 0) + 1);
  }

  return Array.from(counts.entries()).map(([band, count]) => ({
    band,
    label: getGradeBandLabel(band),
    count,
    percentage: Math.round((count / total) * 100),
  }));
}

function buildRiskStudents(
  students: AssessmentStudentPerformanceSummary[],
): AssessmentRiskStudent[] {
  return students
    .filter(
      (student) =>
        student.averagePercentage < 60 || student.weakSubjects.length > 0,
    )
    .map((student) => ({
      studentName: student.studentName,
      nationalId: student.nationalId,
      grade: student.grade,
      classroom: student.classroom,
      averagePercentage: student.averagePercentage,
      weakSubjects: student.weakSubjects,
    }))
    .sort((a, b) => a.averagePercentage - b.averagePercentage);
}

export function buildAssessmentAnalysisSummary(
  rows: AssessmentResultRow[],
): AssessmentAnalysisSummary {
  const percentages = rows
    .map((row) => row.percentage)
    .filter((value): value is number => typeof value === "number");

  const students = buildStudentPerformanceSummaries(rows);
  const subjectAverages = buildSubjectAverages(rows);
  const classroomAverages = buildGroupedAverages(
    rows,
    (row) =>
      row.grade || row.classroom
        ? `${row.grade || "غير محدد"} - ${row.classroom || "غير محدد"}`
        : null,
  );
  const gradeAverages = buildGroupedAverages(rows, (row) => row.grade || null);
  const gradeBandSummary = buildGradeBandSummary(students);
  const subjectGradeDistribution = buildSubjectGradeDistribution(rows);

  const excellentStudentsList = students.filter(
    (student) => getGradeBand(student.averagePercentage) === "EXCELLENT",
  );
  const veryGoodStudents = students.filter(
    (student) => getGradeBand(student.averagePercentage) === "VERY_GOOD",
  );
  const goodStudents = students.filter(
    (student) => getGradeBand(student.averagePercentage) === "GOOD",
  );
  const acceptableStudents = students.filter(
    (student) => getGradeBand(student.averagePercentage) === "ACCEPTABLE",
  );
  const weakStudents = students.filter(
    (student) =>
      getGradeBand(student.averagePercentage) === "WEAK" ||
      student.weakSubjects.length > 0,
  );
  const multiSubjectWeakStudents = weakStudents.filter(
    (student) => student.weakSubjects.length >= 2,
  );

  const linkedStudentKeys = new Set(
    rows
      .filter((row) => row.studentId)
      .map((row) => getAssessmentStudentKey(row)),
  );

  return {
    totalRows: rows.length,
    totalStudents: students.length,
    totalSubjects: subjectAverages.length,
    averagePercentage: average(percentages),
    excellentStudents: excellentStudentsList.length,
    riskStudentsCount: weakStudents.length,
    needsSupportStudentsCount: acceptableStudents.length,
    linkedStudentsCount: linkedStudentKeys.size,
    unmatchedRowsCount: rows.filter(
      (row) => !row.studentId && row.linkStatus !== "AMBIGUOUS",
    ).length,
    ambiguousRowsCount: rows.filter((row) => row.linkStatus === "AMBIGUOUS")
      .length,
    subjectAverages,
    classroomAverages,
    gradeAverages,
    riskStudents: buildRiskStudents(students),
    topFiveStudents: students.slice(0, 5),
    topTenStudents: students.slice(0, 10),
    excellentStudentsList,
    veryGoodStudents,
    goodStudents,
    acceptableStudents,
    weakStudents,
    multiSubjectWeakStudents,
    gradeBandSummary,
    subjectGradeDistribution,
    strongestSubjects: [...subjectAverages]
      .sort((a, b) => b.averagePercentage - a.averagePercentage)
      .slice(0, 5),
    weakestSubjects: [...subjectAverages]
      .sort((a, b) => a.averagePercentage - b.averagePercentage)
      .slice(0, 5),
  };
}
