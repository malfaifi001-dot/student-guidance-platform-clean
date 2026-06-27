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
          display: flex;
          align-items: center;
          justify-content: center;
          background: #e5e7eb;
          padding: 12px;
        }

        .assessment-print-frame {
          width: 297mm;
          height: 210mm;
          overflow: hidden;
          background: #ffffff;
          box-shadow: 0 18px 48px rgba(15, 23, 42, 0.18);
          flex: 0 0 auto;
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

          .assessment-print-frame {
            width: 297mm !important;
            height: 210mm !important;
            margin: 0 !important;
            box-shadow: none !important;
          }

          .assessment-print-page {
            width: 297mm !important;
            height: 210mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            transform-origin: top center !important;
          }
        }
      `}</style>

      {printMode ? <AssessmentAnalysisPrintController /> : null}

      <div className="assessment-print-frame">
        <AssessmentAnalysisPrintReport
          analysis={analysis as unknown as Record<string, unknown>}
          schoolProfile={schoolProfile as unknown as Record<string, unknown> | null}
        />
      </div>
    </main>
  );
}
