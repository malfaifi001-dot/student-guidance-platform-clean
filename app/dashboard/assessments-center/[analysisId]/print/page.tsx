import { prisma } from "@/lib/prisma";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import { AssessmentAnalyticalReport } from "@/components/assessments-center/report/assessment-analytical-report";
import { buildAssessmentAnalyticalReportData } from "@/lib/assessments-center/assessment-report-payload";
import { A4PreviewFit } from "@/components/print-export/a4-preview-fit";

export default async function AssessmentPrintPage({ params, searchParams }: { params: Promise<{ analysisId: string }>; searchParams: Promise<{ print?: string | string[] }> }) {
  const context = await requireDashboardPageContext();
  const analysis = await prisma.assessmentAnalysis.findFirst({ where: { id: (await params).analysisId, ...(context.isAdmin ? {} : { schoolAccountId: context.schoolAccountId }), uploadMode: { in: ["NAFS", "NAFS_PRE_POST", "MAHIROON", "SUBJECT_PERIODIC"] } }, select: { summaryJson: true } });
  if (!analysis?.summaryJson) return <main className="p-10" dir="rtl">التحليل غير موجود.</main>;
  const [profile, currentUser] = context.schoolAccountId ? await Promise.all([
    prisma.schoolProfile.findUnique({ where: { schoolAccountId: context.schoolAccountId }, select: { schoolName: true, logoUrl: true, principalName: true, principalSignatureUrl: true, educationDepartment: true, educationOffice: true, academicYear: true, currentSemester: true } }),
    prisma.user.findUnique({ where: { id: context.user.id }, select: { signatureUrl: true } }),
  ]) : [null, null];
  const data = buildAssessmentAnalyticalReportData(analysis.summaryJson, profile || undefined, context.user.name, currentUser?.signatureUrl);
  const query = await searchParams;
  const isPrint = Array.isArray(query.print) ? query.print[0] === "1" : query.print === "1";
  const report = <AssessmentAnalyticalReport data={data} />;
  if (isPrint) return report;
  return <main dir="rtl" className="w-full min-w-0 max-w-full overflow-hidden"><div className="mx-auto w-full min-w-0 max-w-[900px]"><A4PreviewFit pageSelector=".report-page">{report}</A4PreviewFit></div></main>;
}
