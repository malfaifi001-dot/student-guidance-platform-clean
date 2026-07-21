import "server-only";

import type { DashboardContext } from "@/lib/auth/dashboard-context";
import { prisma } from "@/lib/prisma";

import {
  listIssuedReportSources,
} from "./statistics-issued-report-source";

import type {
  StatisticsDateRange,
  StatisticsPrepareResult,
} from "./statistics-types";

import {
  loadResolvedStatisticsCases,
} from "./statistics-workflow-resolver";

import {
  buildPreparedWorkflowSteps,
} from "./statistics-value-counter";

export class StatisticsPrepareError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(input: {
    message: string;
    code: string;
    status: number;
  }) {
    super(input.message);
    this.name = "StatisticsPrepareError";
    this.code = input.code;
    this.status = input.status;
  }
}

export async function prepareDeterministicStatistics(
  input: {
    context: DashboardContext;
    serviceSlug: string;
    range: StatisticsDateRange;
  },
): Promise<StatisticsPrepareResult> {
  const service = await prisma.service.findUnique({
    where: {
      slug: input.serviceSlug,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
    },
  });

  if (!service || service.status !== "ACTIVE") {
    throw new StatisticsPrepareError({
      message: "الخدمة غير موجودة أو غير نشطة.",
      code: "STATISTICS_SERVICE_NOT_FOUND",
      status: 404,
    });
  }

  const issuedSources =
    await listIssuedReportSources(
      input.context,
      {
        serviceSlug: service.slug,
        from: input.range.from,
        to: input.range.to,
      },
    );

  const sourceReportIds = new Set(
    issuedSources.map(
      (source) => source.normalizedId,
    ),
  );

  const sourceCaseIds = Array.from(
    new Set(
      issuedSources.map(
        (source) => source.caseEntryId,
      ),
    ),
  );

  const resolved =
    await loadResolvedStatisticsCases({
      caseIds: sourceCaseIds,
      serviceId: service.id,
    });

  const workflowSteps =
    buildPreparedWorkflowSteps(resolved);

  return {
    service: {
      id: service.id,
      slug: service.slug,
      name: service.name,
    },

    dateRange: {
      preset: input.range.preset,
      from: input.range.from.toISOString(),
      to: input.range.to.toISOString(),
      label: input.range.label,
    },

    sourceCaseCount: sourceCaseIds.length,
    sourceReportCount: sourceReportIds.size,

    workflowSteps,

    analysisMode: "DETERMINISTIC",
    executiveDescription: null,
  };
}