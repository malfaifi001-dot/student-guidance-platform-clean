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
    <main className="assessment-print-route" dir="rtl">
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
          width: 100%;
          min-height: 100%;
        }

        .assessment-print-route {
          position: fixed;
          inset: 0;
          z-index: 2147483647;
          overflow: auto;
          background: #ffffff;
          padding: 16px;
        }

        .assessment-print-canvas {
          width: 1600px;
          margin: 0 auto;
        }

        @media print {
          body * {
            visibility: hidden;
          }

          .assessment-print-route,
          .assessment-print-route * {
            visibility: visible;
          }

          html,
          body {
            width: 297mm;
            min-height: 210mm;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          .no-print {
            display: none !important;
          }

          .assessment-print-route {
            position: absolute !important;
            inset: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: #ffffff !important;
          }

          .assessment-print-canvas {
            width: 1600px !important;
            margin: 0 !important;
          }

          .assessment-print-page {
            width: 297mm !important;
            min-height: 210mm !important;
            height: 210mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            overflow: hidden !important;
          }

          .assessment-print-page .sheet {
            transform: scale(0.7016) !important;
            transform-origin: top right !important;
          }
        }
      `}</style>

      {printMode ? <AssessmentAnalysisPrintController /> : null}

      <div className="assessment-print-canvas">
        <AssessmentAnalysisPrintReport
          analysis={analysis as unknown as Record<string, unknown>}
          schoolProfile={schoolProfile as unknown as Record<string, unknown> | null}
        />
      </div>
    </main>
  );
}
