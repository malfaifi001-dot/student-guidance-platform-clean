import { notFound } from "next/navigation";
import { AssessmentAnalysisPrintController } from "@/components/assessment-center/assessment-analysis-print-controller";
import { AssessmentAnalysisPrintReport } from "@/components/assessment-center/assessment-analysis-print-report";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import { prisma } from "@/lib/prisma";
import { assessmentAnalysisOwnershipWhere } from "@/lib/assessments-center/assessment-ownership";

type PageProps = {
  params: Promise<{
    analysisId: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AssessmentAnalysisPrintPage({
  params,
  searchParams,
}: PageProps) {
  const { analysisId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const printMode = firstParam(resolvedSearchParams.print) === "1";
  const context = await requireDashboardPageContext();

  const analysis = await prisma.assessmentAnalysis.findFirst({
    where: context.isAdmin
      ? { id: analysisId }
      : {
          id: analysisId,
          ...assessmentAnalysisOwnershipWhere(context.schoolAccountId, context.user.id, { historicalPersonalRead: true }),
        },
  });

  if (!analysis) {
    notFound();
  }

  const targetSchoolAccountId = context.isAdmin
    ? analysis.schoolAccountId
    : context.schoolAccountId;

  const schoolProfile = targetSchoolAccountId
    ? await prisma.schoolProfile
        .findFirst({
          where: {
            schoolAccountId: targetSchoolAccountId,
          },
        })
        .catch(() => null)
    : null;

  return (
    <main className="assessment-print-shell" dir="rtl">
      <style>{`
        @page {
          size: A4 landscape;
          margin: 0;
        }

        :root,
        html,
        body {
          color-scheme: light !important;
          background: #ffffff !important;
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          min-height: 100% !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .assessment-print-shell {
          position: fixed;
          inset: 0;
          z-index: 9999;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background: #ffffff;
        }

        @media print {
          html,
          body {
            width: 297mm !important;
            height: 210mm !important;
            min-width: 297mm !important;
            min-height: 210mm !important;
            overflow: hidden !important;
          }

          .assessment-print-shell {
            position: fixed !important;
            inset: 0 !important;
            width: 297mm !important;
            height: 210mm !important;
            min-width: 297mm !important;
            min-height: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: #ffffff !important;
          }
        }
      `}</style>

      {printMode ? <AssessmentAnalysisPrintController /> : null}

      <AssessmentAnalysisPrintReport
        analysis={analysis as unknown as Record<string, unknown>}
        schoolProfile={schoolProfile as unknown as Record<string, unknown> | null}
      />
    </main>
  );
}
