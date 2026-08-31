import Link from "next/link";
import { ArrowRight, ArrowUpLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import { AssessmentAnalysesList } from "@/components/assessment-center/assessment-analyses-list";
import { assessmentAnalysisOwnershipWhere } from "@/lib/assessments-center/assessment-ownership";

export default async function AssessmentAnalysesPage() {
  const context = await requireDashboardPageContext();

  const analyses = await prisma.assessmentAnalysis.findMany({
    where: context.isAdmin
      ? {}
      : assessmentAnalysisOwnershipWhere(
          context.schoolAccountId,
          context.user.id,
          { historicalPersonalRead: true },
        ),
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-cyan-100 bg-gradient-to-br from-cyan-600 via-sky-600 to-blue-700 p-8 text-white shadow-2xl">
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 right-10 h-72 w-72 rounded-full bg-teal-300/20 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/dashboard/assessment-center"
              className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-black text-cyan-50"
            >
              <ArrowRight className="h-4 w-4" />
              العودة للمركز
            </Link>

            <h1 className="mt-5 text-4xl font-black leading-tight md:text-5xl">
              التحليلات السابقة
            </h1>

            <p className="mt-4 max-w-3xl text-base font-bold leading-8 text-cyan-50/90">
              افتح تحليلًا أو حمّل تقريره.
            </p>
          </div>

          <Link
            href="/dashboard/assessment-center/new"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-black text-cyan-700 transition hover:bg-cyan-50"
          >
            رفع تحليل جديد
            <ArrowUpLeft className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <AssessmentAnalysesList analyses={analyses} />
    </main>
  );
}
