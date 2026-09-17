import { CounselorAssessmentReport } from "@/components/assessment-center/report/counselor-assessment-report";
import { buildCounselorAssessmentReportData } from "@/lib/assessment-center/counselor-assessment-report-data";

export function CounselorAssessmentReportDocument({
  analysis,
  schoolProfile,
  counselor,
}: {
  analysis: {
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
  schoolProfile?: {
    schoolName?: string | null;
    logoUrl?: string | null;
    principalName?: string | null;
    principalSignatureUrl?: string | null;
    educationDepartment?: string | null;
    educationOffice?: string | null;
    academicYear?: string | null;
    currentSemester?: string | null;
  } | null;
  counselor: { name?: string | null; signatureUrl?: string | null; gender?: string | null };
}) {
  const payload = buildCounselorAssessmentReportData({
    analysis,
    schoolProfile,
    counselorName: counselor.name,
    counselorSignatureUrl: counselor.signatureUrl,
  });

  return (
    <CounselorAssessmentReport
      data={payload.data}
      visibilityOptions={payload.visibilityOptions}
    />
  );
}
