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
    serviceSlugs: string[];
    range: StatisticsDateRange;
  },
): Promise<StatisticsPrepareResult> {
  const services = await prisma.service.findMany({
    where: {
      slug: { in: input.serviceSlugs },
      status: "ACTIVE",
    },
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
    },
  });

  if (services.length !== input.serviceSlugs.length) {
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
        serviceSlugs: input.serviceSlugs,
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

  const workflowSteps = (await Promise.all(services.map(async (service) => {
    const serviceCaseIds = Array.from(new Set(issuedSources
      .filter((source) => source.serviceSlug === service.slug)
      .map((source) => source.caseEntryId)));
    const resolved = await loadResolvedStatisticsCases({
      caseIds: serviceCaseIds,
      serviceId: service.id,
      serviceSlug: service.slug,
    });
    return buildPreparedWorkflowSteps(resolved, { serviceSlug: service.slug, serviceName: service.name });
  }))).flat();

  if (!issuedSources.length) {
    throw new StatisticsPrepareError({
      message: "لا توجد بيانات إحصائية متاحة للخدمات والفترة المحددة.",
      code: "NO_STATISTICS_SOURCE_DATA",
      status: 422,
    });
  }

  const orderedServices = input.serviceSlugs.map((slug) => services.find((service) => service.slug === slug)!);
  const primaryService = orderedServices[0];

  return {
    service: {
      id: primaryService.id,
      slug: primaryService.slug,
      name: primaryService.name,
    },
    services: orderedServices.map((service) => ({
      id: service.id,
      slug: service.slug,
      name: service.name,
      hasSourceData: issuedSources.some((source) => source.serviceSlug === service.slug),
    })),

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
