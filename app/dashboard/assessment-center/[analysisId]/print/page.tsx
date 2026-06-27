import { notFound } from "next/navigation";
import { AssessmentAnalysisDetail } from "@/components/assessment-center/assessment-analysis-detail";
import { AssessmentAnalysisPrintController } from "@/components/assessment-center/assessment-analysis-print-controller";
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

  return (
    <main className="min-h-screen bg-white px-6 py-8" dir="rtl">
      <style>{`
        @page {
          size: A4;
          margin: 12mm;
        }

        :root,
        html,
        body {
          color-scheme: light !important;
          background: #ffffff !important;
        }

        @media print {
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          main {
            padding: 0 !important;
          }
        }
      `}</style>

      {printMode ? <AssessmentAnalysisPrintController /> : null}

      <div className="mx-auto max-w-7xl">
        <AssessmentAnalysisDetail analysis={analysis} printMode />
      </div>
    </main>
  );
}
