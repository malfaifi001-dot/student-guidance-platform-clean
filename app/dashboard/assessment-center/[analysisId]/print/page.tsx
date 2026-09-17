import { notFound } from "next/navigation";
import { A4PreviewFit } from "@/components/print-export/a4-preview-fit";
import { CounselorAssessmentReportDocument } from "@/components/assessment-center/counselor-assessment-report-document";
import { AssessmentAnalysisPrintController } from "@/components/assessment-center/assessment-analysis-print-controller";
import { AssessmentAnalysisPrintReport } from "@/components/assessment-center/assessment-analysis-print-report";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import { assessmentAnalysisOwnershipWhere } from "@/lib/assessments-center/assessment-ownership";
import { prisma } from "@/lib/prisma";
import { resolveEffectivePrincipalSignature } from "@/lib/report-signatures/effective-principal-signature";
import { requireServiceAccessForCurrentUser } from "@/lib/subscription/subscription-guard";
import { AssessmentReportPreviewActions } from "@/components/assessment-center/assessment-report-preview-actions";

type PageProps = {
  params: Promise<{ analysisId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AssessmentAnalysisPrintPage({
  params,
  searchParams,
}: PageProps) {
  await requireServiceAccessForCurrentUser("assessment-center");
  const { analysisId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const printMode = firstParam(resolvedSearchParams.print) === "1";
  const legacyMode = firstParam(resolvedSearchParams.legacy) === "1";
  const context = await requireDashboardPageContext();

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

  const schoolProfile = targetSchoolAccountId
    ? await prisma.schoolProfile
        .findFirst({ where: { schoolAccountId: targetSchoolAccountId } })
        .catch(() => null)
    : null;

  // The legacy renderer remains available while existing report links transition.
  if (legacyMode) {
    return (
      <main className="assessment-print-shell" dir="rtl">
        <style>{`
          @page { size: A4 landscape; margin: 0; }
          :root, html, body { color-scheme: light !important; background: #ffffff !important; margin: 0 !important; padding: 0 !important; width: 100% !important; min-height: 100% !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .assessment-print-shell { position: fixed; inset: 0; z-index: 9999; width: 100vw; height: 100vh; overflow: hidden; background: #ffffff; }
          @media print { html, body { width: 297mm !important; height: 210mm !important; min-width: 297mm !important; min-height: 210mm !important; overflow: hidden !important; } .assessment-print-shell { position: fixed !important; inset: 0 !important; width: 297mm !important; height: 210mm !important; min-width: 297mm !important; min-height: 210mm !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; background: #ffffff !important; } }
        `}</style>
        {printMode ? <AssessmentAnalysisPrintController /> : null}
        <AssessmentAnalysisPrintReport
          analysis={analysis as unknown as Record<string, unknown>}
          schoolProfile={schoolProfile as unknown as Record<string, unknown> | null}
        />
      </main>
    );
  }

  const [currentUser, principalSignature] = await Promise.all([
    prisma.user.findUnique({
      where: { id: context.user.id },
      select: { signatureUrl: true, gender: true },
    }),
    targetSchoolAccountId && schoolProfile
      ? resolveEffectivePrincipalSignature({
          schoolAccountId: targetSchoolAccountId,
          owner: {
            id: context.user.id,
            role: context.user.role,
            schoolAccountId: targetSchoolAccountId,
          },
        })
      : Promise.resolve(null),
  ]);

  const report = (
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

  if (printMode) return report;

  return (
    <main dir="rtl" className="mx-auto w-full min-w-0 max-w-6xl px-3 py-3 sm:px-4">
      <AssessmentReportPreviewActions analysisId={analysis.id} analysisTitle={analysis.title} />
      <div className="mx-auto w-full min-w-0 max-w-[900px]">
        <A4PreviewFit pageSelector=".report-page">{report}</A4PreviewFit>
      </div>
    </main>
  );
}
