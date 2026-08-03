import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { StatisticsReportView } from "@/components/statistics/statistics-report-view";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import { getStatisticsReportView } from "@/lib/statistics/statistics-report-query";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: {
    absolute: "التقرير الإحصائي",
  },
};

type PageProps = {
  params: Promise<{ reportId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export default async function StatisticsStandalonePrintPage({
  params,
  searchParams,
}: PageProps) {
  const [{ reportId }, query, context] = await Promise.all([
    params,
    searchParams ??
      Promise.resolve({} as Record<string, string | string[] | undefined>),
    requireDashboardPageContext(),
  ]);

  if (context.user.role !== "ADMIN" && context.user.role !== "COUNSELOR") {
    redirect("/dashboard");
  }

  const cleanReportId = reportId.trim();
  if (!cleanReportId) notFound();

  const data = await getStatisticsReportView(context, cleanReportId);
  if (!data) notFound();

  return (
    <StatisticsReportView
      data={data}
      autoPrint={firstValue(query.print) === "1"}
      showControls={false}
    />
  );
}
