import { prisma } from "@/lib/prisma";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import { AssessmentAnalysisComparison } from "@/components/assessment-center/assessment-analysis-comparison";

type PageProps = {
  searchParams?: Promise<{
    first?: string;
    second?: string;
  }>;
};

export default async function AssessmentCenterComparePage({
  searchParams,
}: PageProps) {
  const context = await requireDashboardPageContext();
  const params = searchParams ? await searchParams : {};

  const analyses = await prisma.assessmentAnalysis.findMany({
    where: context.isAdmin
      ? {}
      : {
          schoolAccountId: context.schoolAccountId,
        },
    orderBy: {
      createdAt: "desc",
    },
    take: 30,
  });

  return (
    <main className="space-y-8">
      <section className="rounded-[2rem] border border-cyan-100 bg-gradient-to-br from-cyan-600 via-sky-600 to-blue-700 p-8 text-white shadow-2xl">
        <h1 className="text-4xl font-black leading-tight md:text-5xl">
          مقارنة التحليلات
        </h1>

        <p className="mt-4 max-w-3xl text-base font-bold leading-8 text-cyan-50/90">
          اختر تحليلين لمعرفة التحسن أو الانخفاض.
        </p>
      </section>

      <AssessmentAnalysisComparison
        analyses={analyses}
        initialFirstId={params.first}
        initialSecondId={params.second}
      />
    </main>
  );
}
