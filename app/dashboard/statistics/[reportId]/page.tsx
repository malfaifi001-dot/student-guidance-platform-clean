import type { Metadata } from "next";
import {
  notFound,
  redirect,
} from "next/navigation";

import {
  StatisticsReportView,
} from "@/components/statistics/statistics-report-view";

import {
  requireDashboardPageContext,
} from "@/lib/auth/dashboard-context";

import {
  getStatisticsReportView,
} from "@/lib/statistics/statistics-report-query";
import { canAccessStatistics } from "@/lib/statistics/statistics-access";

export const dynamic =
  "force-dynamic";
export const metadata: Metadata = {
  title: {
    absolute: "التقرير الإحصائي",
  },
};

type Props = {
  params: Promise<{
    reportId: string;
  }>;

  searchParams: Promise<
    Record<
      string,
      string | string[] | undefined
    >
  >;
};

function firstValue(
  value:
    | string
    | string[]
    | undefined,
) {
  return Array.isArray(value)
    ? value[0] || ""
    : value || "";
}

export default async function StatisticsReportPage({
  params,
  searchParams,
}: Props) {
  const context =
    await requireDashboardPageContext();

  if (!canAccessStatistics(context)) {
    redirect("/dashboard");
  }

  const resolvedParams =
    await params;

  const reportId =
    resolvedParams.reportId.trim();

  if (!reportId) {
    notFound();
  }

  const data =
    await getStatisticsReportView(
      context,
      reportId,
    );

  if (!data) {
    notFound();
  }

  const query =
    await searchParams;

  const autoPrint =
    firstValue(query.print) === "1";

  return (
    <StatisticsReportView
      data={data}
      autoPrint={autoPrint}
    />
  );
}
