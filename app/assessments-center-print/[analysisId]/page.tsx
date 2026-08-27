import { prisma } from "@/lib/prisma";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import { requireServiceAccessForCurrentUser } from "@/lib/subscription/subscription-guard";
import { AssessmentAnalyticalReport } from "@/components/assessments-center/report/assessment-analytical-report";
import { buildAssessmentAnalyticalReportData } from "@/lib/assessments-center/assessment-report-payload";
import { resolveEffectivePrincipalSignature } from "@/lib/report-signatures/effective-principal-signature";

export const dynamic = "force-dynamic";

export default async function AssessmentCleanPrintPage({
  params,
}: {
  params: Promise<{ analysisId: string }>;
}) {
  await requireServiceAccessForCurrentUser("assessment-center");
  const context = await requireDashboardPageContext();
  const { analysisId } = await params;

  const analysis = await prisma.assessmentAnalysis.findFirst({
    where: {
      id: analysisId,
      ...(context.isAdmin ? {} : { schoolAccountId: context.schoolAccountId }),
      uploadMode: {
        in: ["NAFS", "NAFS_PRE_POST", "MAHIROON", "SUBJECT_PERIODIC"],
      },
    },
    select: { summaryJson: true },
  });

  if (!analysis?.summaryJson) {
    return <main dir="rtl">التحليل غير موجود.</main>;
  }

  const [profile, currentUser] = context.schoolAccountId
    ? await Promise.all([
        prisma.schoolProfile.findUnique({
          where: { schoolAccountId: context.schoolAccountId },
          select: {
            schoolName: true,
            logoUrl: true,
            principalName: true,
            principalSignatureUrl: true,
            educationDepartment: true,
            educationOffice: true,
            academicYear: true,
            currentSemester: true,
          },
        }),
        prisma.user.findUnique({
          where: { id: context.user.id },
            select: { signatureUrl: true, gender: true },
        }),
      ])
    : [null, null];

  const data = buildAssessmentAnalyticalReportData(
    analysis.summaryJson,
    profile
      ? {
          ...profile,
          principalSignatureUrl: (await resolveEffectivePrincipalSignature({
            schoolAccountId: context.schoolAccountId!,
            owner: { id: context.user.id, role: context.user.role, schoolAccountId: context.schoolAccountId },
          })).signatureUrl,
        }
      : undefined,
    context.user.name,
    currentUser?.signatureUrl,
    currentUser?.gender,
  );

  return <AssessmentAnalyticalReport data={data} />;
}
