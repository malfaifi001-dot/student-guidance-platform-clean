import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ResultsAnalysisList } from "@/components/results-analysis/results-analysis-list";

export default async function ResultsAnalysisPage() {
  const analyses = await prisma.resultsAnalysis.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="space-y-8">
      <section className="rounded-[2rem] bg-gradient-to-br from-indigo-600 to-blue-500 p-10 text-white shadow-2xl">
        <p className="text-sm font-bold text-blue-100">
          Academic Results Analytics
        </p>

        <h1 className="mt-4 text-5xl font-black">تحليل النتائج</h1>

        <p className="mt-5 max-w-3xl text-lg leading-8 text-blue-50">
          رفع وتحليل نتائج الطلاب من ملفات Excel مع مؤشرات أداء ورسوم وتحليلات محفوظة.
        </p>

        <div className="mt-8">
          <Link
            href="/dashboard/results-analysis/new"
            className="rounded-2xl bg-white px-6 py-3 text-sm font-black text-blue-700 transition hover:bg-blue-50"
          >
            تحليل جديد
          </Link>
        </div>
      </section>

      <ResultsAnalysisList analyses={analyses} />
    </main>
  );
}