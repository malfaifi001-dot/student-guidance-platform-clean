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

export const dynamic =
  "force-dynamic";

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

  if (
    context.user.role !== "ADMIN" &&
    context.user.role !== "COUNSELOR"
  ) {
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