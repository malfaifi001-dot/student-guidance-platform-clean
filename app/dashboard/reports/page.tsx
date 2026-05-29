import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ReportList } from "@/components/reports/report-list";

export default async function ReportsPage() {
  const reports = await prisma.guidanceReport.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      caseEntry: {
        include: {
          service: true,
          student: true,
        },
      },
    },
  });

  return (
    <main className="space-y-8">
      <section className="rounded-[2rem] bg-gradient-to-br from-slate-900 to-sky-700 p-10 text-white shadow-2xl">
        <p className="text-sm font-bold text-sky-200">Reports Studio</p>

        <h1 className="mt-4 text-5xl font-black">التقارير الإرشادية</h1>

        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-200">
          إنشاء ومعاينة واعتماد التقارير الإرشادية مع دعم التذكير والتأنيث والشواهد.
        </p>

        <div className="mt-8">
          <Link
            href="/dashboard/reports/new"
            className="rounded-2xl bg-white px-6 py-3 text-sm font-black text-sky-700 hover:bg-sky-50"
          >
            إنشاء تقرير تجريبي
          </Link>
        </div>
      </section>

      <ReportList reports={reports} />
    </main>
  );
}