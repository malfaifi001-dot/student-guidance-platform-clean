export type StudentResultStatus = "PASS" | "FAIL" | "NEEDS_SUPPORT" | "UNKNOWN";

export type StudentResultRow = {
  id: string;
  studentId?: string | null;
  studentName: string;
  nationalId?: string | null;
  grade?: string | null;
  classroom?: string | null;
  semester?: string | null;
  subject?: string | null;
  score?: number | null;
  maxScore?: number | null;
  percentage?: number | null;
  status?: StudentResultStatus;
};

export type ResultsAnalysisSummary = {
  totalStudents: number;
  passedStudents: number;
  failedStudents: number;
  needsSupportStudents: number;
  unknownStudents: number;
  averagePercentage: number;
  highestPercentage: number;
  lowestPercentage: number;
};

export type ResultsAnalysisOutput = {
  summary: ResultsAnalysisSummary;
  rows: StudentResultRow[];
};