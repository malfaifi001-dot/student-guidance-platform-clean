import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import { buildResultsAnalysisAccessWhere, buildResultsAnalysisListWhere } from "@/lib/results-analysis/results-analysis-access";
import { ResultsAnalysisList } from "@/components/results-analysis/results-analysis-list";

export default async function ResultsAnalysisPage() {
  const context = await requireDashboardPageContext();
  const analyses = await prisma.resultsAnalysis.findMany({ where: buildResultsAnalysisListWhere({ schoolAccountId: context.schoolAccountId, isAdmin: context.isAdmin }), orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="space-y-8">
      <section className="rounded-[2rem] bg-gradient-to-br from-indigo-600 to-blue-500 p-10 text-white shadow-2xl">
        <p className="text-sm font-bold text-blue-100">
          Academic Results Analytics
        </p>

        <h1 className="mt-4 text-5xl font-black">ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ù†ØªØ§Ø¦Ø¬</h1>

        <p className="mt-5 max-w-3xl text-lg leading-8 text-blue-50">
          Ø±ÙØ¹ ÙˆØªØ­Ù„ÙŠÙ„ Ù†ØªØ§Ø¦Ø¬ Ø§Ù„Ø·Ù„Ø§Ø¨ Ù…Ù† Ù…Ù„ÙØ§Øª Excel Ù…Ø¹ Ù…Ø¤Ø´Ø±Ø§Øª Ø£Ø¯Ø§Ø¡ ÙˆØ±Ø³ÙˆÙ… ÙˆØªØ­Ù„ÙŠÙ„Ø§Øª Ù…Ø­ÙÙˆØ¸Ø©.
        </p>

        <div className="mt-8">
          <Link
            href="/dashboard/results-analysis/new"
            className="rounded-2xl bg-white px-6 py-3 text-sm font-black text-blue-700 transition hover:bg-blue-50"
          >
            ØªØ­Ù„ÙŠÙ„ Ø¬Ø¯ÙŠØ¯
          </Link>
        </div>
      </section>

      <ResultsAnalysisList analyses={analyses} />
    </main>
  );
}

