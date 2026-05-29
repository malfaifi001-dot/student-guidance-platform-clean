import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function CompareResultsAnalysisPage() {
  const analyses = await prisma.resultsAnalysis.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
  });

  return (
    <main className="space-y-8">
      <section className="rounded-[2rem] bg-gradient-to-br from-slate-900 to-indigo-700 p-10 text-white shadow-2xl">
        <p className="text-sm font-bold text-indigo-100">Compare Reports</p>
        <h1 className="mt-4 text-5xl font-black">مقارنة التحليلات</h1>
        <p className="mt-4 max-w-3xl text-indigo-50">
          اختر تحليلين من القائمة وقارن المتوسطات وعدد الطلاب والمواد.
        </p>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        {analyses.map((analysis) => (
          <div key={analysis.id} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-900">{analysis.title}</h2>

            <div className="mt-5 grid gap-3 text-sm text-slate-600">
              <p>الطلاب: <b>{analysis.totalStudents}</b></p>
              <p>المواد: <b>{analysis.totalSubjects}</b></p>
              <p>المتوسط: <b>{analysis.averageScore ?? 0}%</b></p>
              <p>التاريخ: {new Date(analysis.createdAt).toLocaleDateString("ar-SA")}</p>
            </div>

            <Link
              href={`/dashboard/results-analysis/${analysis.id}`}
              className="mt-6 inline-flex rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              فتح التحليل
            </Link>
          </div>
        ))}
      </section>
    </main>
  );
}