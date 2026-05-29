import type {
  ResultsAnalysisOutput,
  ResultsAnalysisSummary,
  StudentResultRow,
  StudentResultStatus,
} from "@/lib/results-analysis/results-analysis-types";

function normalizePercentage(row: StudentResultRow): number | null {
  if (typeof row.percentage === "number") return row.percentage;

  if (
    typeof row.score === "number" &&
    typeof row.maxScore === "number" &&
    row.maxScore > 0
  ) {
    return Math.round((row.score / row.maxScore) * 100);
  }

  return null;
}

function detectStatus(percentage: number | null): StudentResultStatus {
  if (percentage === null) return "UNKNOWN";
  if (percentage >= 50) return "PASS";
  if (percentage >= 35) return "NEEDS_SUPPORT";
  return "FAIL";
}

export function analyzeStudentResults(
  rows: StudentResultRow[],
): ResultsAnalysisOutput {
  const normalizedRows = rows.map((row) => {
    const percentage = normalizePercentage(row);
    const status = row.status ?? detectStatus(percentage);

    return {
      ...row,
      percentage,
      status,
    };
  });

  const percentages = normalizedRows
    .map((row) => row.percentage)
    .filter((value): value is number => typeof value === "number");

  const summary: ResultsAnalysisSummary = {
    totalStudents: normalizedRows.length,
    passedStudents: normalizedRows.filter((row) => row.status === "PASS").length,
    failedStudents: normalizedRows.filter((row) => row.status === "FAIL").length,
    needsSupportStudents: normalizedRows.filter(
      (row) => row.status === "NEEDS_SUPPORT",
    ).length,
    unknownStudents: normalizedRows.filter((row) => row.status === "UNKNOWN")
      .length,
    averagePercentage:
      percentages.length > 0
        ? Math.round(
            percentages.reduce((sum, value) => sum + value, 0) /
              percentages.length,
          )
        : 0,
    highestPercentage: percentages.length > 0 ? Math.max(...percentages) : 0,
    lowestPercentage: percentages.length > 0 ? Math.min(...percentages) : 0,
  };

  return {
    summary,
    rows: normalizedRows,
  };
}