import type {
  AssessmentAnalysisSummary,
  AssessmentGroupSummary,
  AssessmentResultRow,
  AssessmentResultStatus,
  AssessmentRiskStudent,
  AssessmentSubjectSummary,
} from "@/lib/assessment-center/assessment-center-types";

function detectStatus(percentage: number | null | undefined): AssessmentResultStatus {
  if (typeof percentage !== "number") return "UNKNOWN";
  if (percentage >= 90) return "EXCELLENT";
  if (percentage >= 70) return "GOOD";
  if (percentage >= 50) return "NEEDS_SUPPORT";
  return "RISK";
}

function average(values: number[]) {
  if (!values.length) return 0;

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function buildStudentKey(row: AssessmentResultRow) {
  return row.nationalId || `${row.studentName}-${row.grade || ""}-${row.classroom || ""}`;
}

function buildSubjectAverages(rows: AssessmentResultRow[]): AssessmentSubjectSummary[] {
  const grouped = new Map<string, AssessmentResultRow[]>();

  for (const row of rows) {
    const key = row.subject || "غير محدد";
    grouped.set(key, [...(grouped.get(key) || []), row]);
  }

  return Array.from(grouped.entries())
    .map(([subject, subjectRows]) => {
      const percentages = subjectRows
        .map((row) => row.percentage)
        .filter((value): value is number => typeof value === "number");

      return {
        subject,
        averagePercentage: average(percentages),
        totalRows: subjectRows.length,
        riskCount: subjectRows.filter((row) => row.status === "RISK").length,
      };
    })
    .sort((a, b) => a.averagePercentage - b.averagePercentage);
}

function buildGroupAverages(
  rows: AssessmentResultRow[],
  key: "grade" | "classroom"
): AssessmentGroupSummary[] {
  const grouped = new Map<string, AssessmentResultRow[]>();

  for (const row of rows) {
    const label = row[key] || "غير محدد";
    grouped.set(label, [...(grouped.get(label) || []), row]);
  }

  return Array.from(grouped.entries())
    .map(([label, groupRows]) => {
      const percentages = groupRows
        .map((row) => row.percentage)
        .filter((value): value is number => typeof value === "number");

      return {
        label,
        averagePercentage: average(percentages),
        totalRows: groupRows.length,
        riskCount: groupRows.filter((row) => row.status === "RISK").length,
      };
    })
    .sort((a, b) => a.averagePercentage - b.averagePercentage);
}

function buildRiskStudents(rows: AssessmentResultRow[]): AssessmentRiskStudent[] {
  const grouped = new Map<string, AssessmentResultRow[]>();

  for (const row of rows) {
    const key = buildStudentKey(row);
    grouped.set(key, [...(grouped.get(key) || []), row]);
  }

  return Array.from(grouped.values())
    .map((studentRows) => {
      const first = studentRows[0];

      const percentages = studentRows
        .map((row) => row.percentage)
        .filter((value): value is number => typeof value === "number");

      const averagePercentage = average(percentages);

      const weakSubjects = studentRows
        .filter(
          (row) =>
            row.status === "RISK" ||
            row.status === "NEEDS_SUPPORT" ||
            (typeof row.percentage === "number" && row.percentage < 70)
        )
        .map((row) => row.subject);

      return {
        studentName: first.studentName,
        nationalId: first.nationalId,
        grade: first.grade,
        classroom: first.classroom,
        averagePercentage,
        weakSubjects: Array.from(new Set(weakSubjects)),
      };
    })
    .filter(
      (student) => student.averagePercentage < 70 || student.weakSubjects.length > 0
    )
    .sort((a, b) => a.averagePercentage - b.averagePercentage)
    .slice(0, 50);
}

export function analyzeAssessmentRows(rows: AssessmentResultRow[]) {
  const normalizedRows = rows.map((row) => {
    const percentage =
      typeof row.percentage === "number"
        ? row.percentage
        : typeof row.score === "number" &&
            typeof row.maxScore === "number" &&
            row.maxScore > 0
          ? Math.round((row.score / row.maxScore) * 100)
          : null;

    return {
      ...row,
      percentage,
      status: row.status || detectStatus(percentage),
    };
  });

  const percentages = normalizedRows
    .map((row) => row.percentage)
    .filter((value): value is number => typeof value === "number");

  const uniqueStudents = new Set(normalizedRows.map(buildStudentKey));
  const uniqueSubjects = new Set(
    normalizedRows.map((row) => row.subject).filter(Boolean)
  );

  const riskStudents = buildRiskStudents(normalizedRows);

  const summary: AssessmentAnalysisSummary = {
    totalRows: normalizedRows.length,
    totalStudents: uniqueStudents.size,
    totalSubjects: uniqueSubjects.size,
    averagePercentage: average(percentages),
    excellentStudents: Array.from(uniqueStudents).filter((studentKey) => {
      const studentRows = normalizedRows.filter(
        (row) => buildStudentKey(row) === studentKey
      );
      const studentAverage = average(
        studentRows
          .map((row) => row.percentage)
          .filter((value): value is number => typeof value === "number")
      );

      return studentAverage >= 90;
    }).length,
    riskStudentsCount: riskStudents.length,
    needsSupportStudentsCount: normalizedRows.filter(
      (row) => row.status === "NEEDS_SUPPORT"
    ).length,
    subjectAverages: buildSubjectAverages(normalizedRows),
    classroomAverages: buildGroupAverages(normalizedRows, "classroom"),
    gradeAverages: buildGroupAverages(normalizedRows, "grade"),
    riskStudents,
  };

  return {
    summary,
    rows: normalizedRows,
  };
}