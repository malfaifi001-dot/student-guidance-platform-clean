import { prisma } from "@/lib/prisma";
import { assessmentAnalysisOwnershipWhere } from "@/lib/assessments-center/assessment-ownership";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import { requireServiceAccessForCurrentUser } from "@/lib/subscription/subscription-guard";
import { AssessmentAnalyticalReport } from "@/components/assessments-center/report/assessment-analytical-report";
import { SubjectPeriodicReport } from "@/components/assessments-center/report/subject-periodic-report";
import { buildAssessmentAnalyticalReportData } from "@/lib/assessments-center/assessment-report-payload";
import { resolveEffectivePrincipalSignature } from "@/lib/report-signatures/effective-principal-signature";
import { LearningStyleReport } from "@/components/assessments-center/report/learning-style-report";

export const dynamic = "force-dynamic";

export default async function AssessmentCleanPrintPage({
  params,
}: {
  params: Promise<{ analysisId: string }>;
}) {
  await requireServiceAccessForCurrentUser("assessment-center");
  const context = await requireDashboardPageContext({ allowPrincipal: true });
  const { analysisId } = await params;

  const analysis = await prisma.assessmentAnalysis.findFirst({
    where: {
      id: analysisId,
      ...(context.isAdmin
        ? {}
        : assessmentAnalysisOwnershipWhere(context.schoolAccountId, context.user.id, {
            historicalPersonalRead: true,
          })),
      uploadMode: {
        in: ["NAFS", "NAFS_PRE_POST", "MAHIROON", "SUBJECT_PERIODIC", "LEARNING_STYLE"],
      },
    },
    select: { summaryJson: true, uploadMode: true },
  });

  if (!analysis?.summaryJson) {
    return <main dir="rtl">التحليل غير موجود.</main>;
  }
  if (analysis.uploadMode === "LEARNING_STYLE") { const [profile, teacher] = context.schoolAccountId ? await Promise.all([prisma.schoolProfile.findUnique({ where: { schoolAccountId: context.schoolAccountId }, select: { schoolName: true, principalName: true, logoUrl: true, educationDepartment: true, educationOffice: true, principalSignatureUrl: true } }), prisma.user.findUnique({ where: { id: context.user.id }, select: { signatureUrl: true } })]) : [null, null]; const principalSignature = profile && context.schoolAccountId ? await resolveEffectivePrincipalSignature({ schoolAccountId: context.schoolAccountId, owner: { id: context.user.id, role: context.user.role, schoolAccountId: context.schoolAccountId } }) : null; return <LearningStyleReport snapshot={analysis.summaryJson} profile={profile ? { ...profile, teacherSignatureUrl: teacher?.signatureUrl || null, principalSignatureUrl: principalSignature?.signatureUrl || profile.principalSignatureUrl } : null} teacherName={context.user.name} />; }

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

  return data.analysisType === "SUBJECT_PERIODIC"
    ? <SubjectPeriodicReport data={data} snapshot={analysis.summaryJson} />
    : <AssessmentAnalyticalReport data={data} />;
}
