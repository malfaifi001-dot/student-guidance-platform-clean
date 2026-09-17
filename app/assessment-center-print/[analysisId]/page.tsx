import { notFound } from "next/navigation";
import { CounselorAssessmentReportDocument } from "@/components/assessment-center/counselor-assessment-report-document";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import { assessmentAnalysisOwnershipWhere } from "@/lib/assessments-center/assessment-ownership";
import { prisma } from "@/lib/prisma";
import { resolveEffectivePrincipalSignature } from "@/lib/report-signatures/effective-principal-signature";
import { requireServiceAccessForCurrentUser } from "@/lib/subscription/subscription-guard";

export const dynamic = "force-dynamic";

export default async function CounselorAssessmentCleanPrintPage({
  params,
}: {
  params: Promise<{ analysisId: string }>;
}) {
  await requireServiceAccessForCurrentUser("assessment-center");
  const context = await requireDashboardPageContext();
  const { analysisId } = await params;

  const analysis = await prisma.assessmentAnalysis.findFirst({
    where: context.isAdmin
      ? { id: analysisId }
      : {
          id: analysisId,
          ...assessmentAnalysisOwnershipWhere(context.schoolAccountId, context.user.id, {
            historicalPersonalRead: true,
          }),
        },
  });

  if (!analysis) notFound();

  const targetSchoolAccountId = context.isAdmin
    ? analysis.schoolAccountId
    : context.schoolAccountId;
  const [schoolProfile, currentUser] = targetSchoolAccountId
    ? await Promise.all([
        prisma.schoolProfile
          .findFirst({ where: { schoolAccountId: targetSchoolAccountId } })
          .catch(() => null),
        prisma.user.findUnique({
          where: { id: context.user.id },
          select: { signatureUrl: true, gender: true },
        }),
      ])
    : [null, null];
  const principalSignature = schoolProfile && targetSchoolAccountId
    ? await resolveEffectivePrincipalSignature({
        schoolAccountId: targetSchoolAccountId,
        owner: {
          id: context.user.id,
          role: context.user.role,
          schoolAccountId: targetSchoolAccountId,
        },
      })
    : null;

  return (
    <CounselorAssessmentReportDocument
      analysis={analysis}
      schoolProfile={
        schoolProfile
          ? {
              ...schoolProfile,
              principalSignatureUrl:
                principalSignature?.signatureUrl || schoolProfile.principalSignatureUrl,
            }
          : null
      }
      counselor={{
        name: context.user.name,
        signatureUrl: currentUser?.signatureUrl,
        gender: currentUser?.gender,
      }}
    />
  );
}
