export type AssessmentResultStatus =
  | "EXCELLENT"
  | "GOOD"
  | "NEEDS_SUPPORT"
  | "RISK"
  | "UNKNOWN";

export type AssessmentStudentLinkStatus =
  | "LINKED"
  | "UNMATCHED"
  | "AMBIGUOUS";

export type AssessmentResultRow = {
  id: string;
  studentId?: string | null;
  matchedStudentName?: string | null;
  linkStatus?: AssessmentStudentLinkStatus;
  linkReason?: string | null;
  linkConfidence?: number | null;

  studentName: string;
  nationalId?: string | null;
  grade?: string | null;
  classroom?: string | null;
  subject: string;
  score?: number | null;
  maxScore?: number | null;
  percentage?: number | null;
  status?: AssessmentResultStatus;
  semester?: string | null;
  academicYear?: string | null;
  sourceSheet?: string | null;
};

export type AssessmentSubjectSummary = {
  subject: string;
  averagePercentage: number;
  totalRows: number;
  riskCount: number;
};

export type AssessmentGroupSummary = {
  label: string;
  averagePercentage: number;
  totalRows: number;
  riskCount: number;
};

export type AssessmentRiskStudent = {
  studentName: string;
  nationalId?: string | null;
  grade?: string | null;
  classroom?: string | null;
  averagePercentage: number;
  weakSubjects: string[];
};

export type AssessmentAnalysisSummary = {
  totalRows: number;
  totalStudents: number;
  totalSubjects: number;
  averagePercentage: number;
  excellentStudents: number;
  riskStudentsCount: number;
  needsSupportStudentsCount: number;

  linkedStudentsCount: number;
  unmatchedRowsCount: number;
  ambiguousRowsCount: number;

  subjectAverages: AssessmentSubjectSummary[];
  classroomAverages: AssessmentGroupSummary[];
  gradeAverages: AssessmentGroupSummary[];
  riskStudents: AssessmentRiskStudent[];
};