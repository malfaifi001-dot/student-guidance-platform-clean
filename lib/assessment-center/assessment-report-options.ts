export type CounselorAssessmentReportVisibilityOptions = {
  version: 1;
  topTenStudents: boolean;
  bottomTenStudents: boolean;
  bestSubject: boolean;
  weakestSubject: boolean;
  riskStudents: boolean;
  subjectComparison: boolean;
  classroomComparison: boolean;
};

export const DEFAULT_COUNSELOR_ASSESSMENT_REPORT_OPTIONS: CounselorAssessmentReportVisibilityOptions = {
  version: 1,
  topTenStudents: true,
  bottomTenStudents: true,
  bestSubject: true,
  weakestSubject: true,
  riskStudents: true,
  subjectComparison: true,
  classroomComparison: true,
};

const optionKeys = [
  "topTenStudents",
  "bottomTenStudents",
  "bestSubject",
  "weakestSubject",
  "riskStudents",
  "subjectComparison",
  "classroomComparison",
] as const;

export function normalizeCounselorAssessmentReportOptions(value: unknown): CounselorAssessmentReportVisibilityOptions {
  const record = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const result = { ...DEFAULT_COUNSELOR_ASSESSMENT_REPORT_OPTIONS };
  for (const key of optionKeys) {
    if (typeof record[key] === "boolean") result[key] = record[key];
  }
  return result;
}
