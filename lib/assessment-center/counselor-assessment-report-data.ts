import { buildAssessmentAnalysisSummary } from "@/lib/assessment-center/assessment-analysis-summary";
import type {
  AssessmentAnalysisSummary,
  AssessmentResultRow,
  AssessmentRiskStudent,
  AssessmentStudentPerformanceSummary,
  AssessmentSubjectSummary,
} from "@/lib/assessment-center/assessment-center-types";
import {
  normalizeCounselorAssessmentReportOptions,
  type CounselorAssessmentReportVisibilityOptions,
} from "@/lib/assessment-center/assessment-report-options";

type Identity = {
  schoolName?: string | null;
  logoUrl?: string | null;
  principalName?: string | null;
  principalSignatureUrl?: string | null;
  educationDepartment?: string | null;
  educationOffice?: string | null;
  academicYear?: string | null;
  currentSemester?: string | null;
};

type AnalysisInput = {
  title: string;
  totalStudents: number;
  totalRows: number;
  totalSubjects: number;
  averagePercentage?: number | null;
  createdAt: Date;
  summaryJson?: unknown;
  rowsJson?: unknown;
  reportVisibilityOptions?: unknown;
};

export type CounselorReportStudent = {
  studentName: string;
  grade?: string | null;
  classroom?: string | null;
  averagePercentage: number;
  weakSubjects?: string[];
};

export type CounselorReportSubject = {
  subject: string;
  averagePercentage: number;
  totalRows?: number;
  riskCount?: number;
};

export type CounselorReportComparison = {
  label: string;
  averagePercentage: number;
  totalRows?: number;
  riskCount?: number;
};

export type CounselorAssessmentReportData = {
  reportTitle: string;
  analysisTitle: string;
  generatedAt: Date;
  school: {
    name?: string | null;
    educationDepartment?: string | null;
    educationOffice?: string | null;
    counselorName?: string | null;
    counselorSignatureUrl?: string | null;
    principalName?: string | null;
    principalSignatureUrl?: string | null;
    logoUrl?: string | null;
    academicYear?: string | null;
    currentSemester?: string | null;
  };
  overview: {
    totalStudents: number;
    totalSubjects: number;
    averagePercentage?: number | null;
  };
  topTenStudents: CounselorReportStudent[];
  bottomTenStudents: CounselorReportStudent[];
  bestSubject?: CounselorReportSubject;
  weakestSubject?: CounselorReportSubject;
  riskStudents: CounselorReportStudent[];
  subjectComparison: CounselorReportComparison[];
  classroomComparison: CounselorReportComparison[];
};

function asRows(value: unknown): AssessmentResultRow[] {
  return Array.isArray(value) ? (value as AssessmentResultRow[]) : [];
}

function asSummary(value: unknown, rows: AssessmentResultRow[]): AssessmentAnalysisSummary {
  return value && typeof value === "object"
    ? (value as AssessmentAnalysisSummary)
    : buildAssessmentAnalysisSummary(rows);
}

function toStudent(item: AssessmentStudentPerformanceSummary | AssessmentRiskStudent): CounselorReportStudent {
  return {
    studentName: item.studentName,
    grade: item.grade,
    classroom: item.classroom,
    averagePercentage: item.averagePercentage,
    weakSubjects: item.weakSubjects,
  };
}

function deriveRankedStudents(rows: AssessmentResultRow[]): CounselorReportStudent[] {
  const students = new Map<string, CounselorReportStudent & { values: number[] }>();
  for (const row of rows) {
    const percentage = Number(row.percentage);
    if (!Number.isFinite(percentage)) continue;
    const key = String(row.nationalId || `${row.studentName}|${row.grade || ""}|${row.classroom || ""}`);
    const current = students.get(key) || {
      studentName: row.matchedStudentName || row.studentName || "طالب/طالبة",
      grade: row.grade,
      classroom: row.classroom,
      averagePercentage: 0,
      values: [],
    };
    current.values.push(percentage);
    students.set(key, current);
  }
  return [...students.values()].map(({ values, ...student }) => ({
    ...student,
    averagePercentage: values.reduce((total, value) => total + value, 0) / values.length,
  }));
}

function subjectFromSummary(item: AssessmentSubjectSummary | undefined): CounselorReportSubject | undefined {
  return item
    ? {
        subject: item.subject,
        averagePercentage: item.averagePercentage,
        totalRows: item.totalRows,
        riskCount: item.riskCount,
      }
    : undefined;
}

export function buildCounselorAssessmentReportData(input: {
  analysis: AnalysisInput;
  schoolProfile?: Identity | null;
  counselorName?: string | null;
  counselorSignatureUrl?: string | null;
}): {
  data: CounselorAssessmentReportData;
  visibilityOptions: CounselorAssessmentReportVisibilityOptions;
} {
  const rows = asRows(input.analysis.rowsJson);
  const summary = asSummary(input.analysis.summaryJson, rows);
  const derivedStudents = deriveRankedStudents(rows);
  const rankedDescending = [...derivedStudents].sort((a, b) => b.averagePercentage - a.averagePercentage);
  const rankedAscending = [...derivedStudents].sort((a, b) => a.averagePercentage - b.averagePercentage);
  const topTenStudents = (summary.topTenStudents?.length
    ? summary.topTenStudents.map(toStudent)
    : rankedDescending.slice(0, 10)
  ).slice(0, 10);
  const bottomTenStudents = (summary.weakStudents?.length
    ? [...summary.weakStudents].sort((a, b) => a.averagePercentage - b.averagePercentage).map(toStudent)
    : rankedAscending
  ).slice(0, 10);
  const subjectComparison = (summary.subjectAverages || []).map((item) => ({
    label: item.subject,
    averagePercentage: item.averagePercentage,
    totalRows: item.totalRows,
    riskCount: item.riskCount,
  }));
  const rankedSubjects = [...(summary.subjectAverages || [])].sort(
    (a, b) => b.averagePercentage - a.averagePercentage,
  );

  return {
    visibilityOptions: normalizeCounselorAssessmentReportOptions(
      input.analysis.reportVisibilityOptions,
    ),
    data: {
      reportTitle: "تقرير تحليل النتائج",
      analysisTitle: input.analysis.title || "تحليل النتائج",
      generatedAt: input.analysis.createdAt,
      school: {
        name: input.schoolProfile?.schoolName,
        educationDepartment: input.schoolProfile?.educationDepartment,
        educationOffice: input.schoolProfile?.educationOffice,
        counselorName: input.counselorName,
        counselorSignatureUrl: input.counselorSignatureUrl,
        principalName: input.schoolProfile?.principalName,
        principalSignatureUrl: input.schoolProfile?.principalSignatureUrl,
        logoUrl: input.schoolProfile?.logoUrl,
        academicYear: input.schoolProfile?.academicYear,
        currentSemester: input.schoolProfile?.currentSemester,
      },
      overview: {
        totalStudents: summary.totalStudents || input.analysis.totalStudents || derivedStudents.length,
        totalSubjects: summary.totalSubjects || input.analysis.totalSubjects || subjectComparison.length,
        averagePercentage: Number.isFinite(summary.averagePercentage)
          ? summary.averagePercentage
          : input.analysis.averagePercentage,
      },
      topTenStudents,
      bottomTenStudents,
      bestSubject: subjectFromSummary(summary.strongestSubjects?.[0] || rankedSubjects[0]),
      weakestSubject: subjectFromSummary(
        summary.weakestSubjects?.[0] || rankedSubjects.at(-1),
      ),
      riskStudents: (summary.riskStudents || []).map(toStudent),
      subjectComparison,
      classroomComparison: (summary.classroomAverages || []).map((item) => ({
        label: item.label,
        averagePercentage: item.averagePercentage,
        totalRows: item.totalRows,
        riskCount: item.riskCount,
      })),
    },
  };
}
