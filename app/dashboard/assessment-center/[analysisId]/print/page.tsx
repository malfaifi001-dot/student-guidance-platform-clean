import { notFound } from "next/navigation";
import { AssessmentAnalysisPrintController } from "@/components/assessment-center/assessment-analysis-print-controller";
import { AssessmentAnalysisPrintReport } from "@/components/assessment-center/assessment-analysis-print-report";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import { prisma } from "@/lib/prisma";

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
    where: {
      id: analysisId,
      ...(context.isAdmin
        ? {}
        : {
            schoolAccountId: context.schoolAccountId,
          }),
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
          margin: 0;
          padding: 0;
          width: 100%;
          min-height: 100%;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .assessment-print-shell {
          min-height: 100vh;
        }

        @media print {
          body * {
            visibility: hidden;
          }

          .assessment-print-shell,
          .assessment-print-shell * {
            visibility: visible;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            width: 297mm !important;
            height: 210mm !important;
            margin: 0 !important;
            background: #ffffff !important;
            overflow: hidden !important;
          }

          .no-print {
            display: none !important;
          }

          .assessment-print-shell {
            margin: 0 !important;
            padding: 0 !important;
            width: 297mm !important;
            height: 210mm !important;
            min-height: 210mm !important;
            overflow: hidden !important;
            background: #ffffff !important;
            display: block !important;
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
