import { redirect } from "next/navigation";

import {
  StatisticsPrepareShell,
} from "@/components/statistics/statistics-prepare-shell";

import {
  requireDashboardPageContext,
} from "@/lib/auth/dashboard-context";
import { normalizeStatisticsServiceSelection } from "@/lib/statistics/statistics-service-selection";

type SearchValue =
  | string
  | string[]
  | undefined;

type Props = {
  searchParams: Promise<
    Record<string, SearchValue>
  >;
};

function firstValue(
  value: SearchValue,
) {
  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return value || "";
}

export default async function StatisticsPreparePage({
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

  const params = await searchParams;

  let serviceSlugs: string[];
  try {
    serviceSlugs = normalizeStatisticsServiceSelection({ serviceSlug: params.serviceSlug });
  } catch {
    redirect("/dashboard/statistics");
  }

  const preset =
    firstValue(params.preset)
      .trim()
      .toUpperCase() ||
    "LAST_30_DAYS";

  const from =
    firstValue(params.from).trim();

  const to =
    firstValue(params.to).trim();

  return (
    <StatisticsPrepareShell
      serviceSlugs={serviceSlugs}
      preset={preset}
      from={from || undefined}
      to={to || undefined}
    />
  );
}
