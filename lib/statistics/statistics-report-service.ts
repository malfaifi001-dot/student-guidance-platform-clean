import "server-only";

import type { Prisma } from "@prisma/client";
import { z } from "zod";

import type { DashboardContext } from "@/lib/auth/dashboard-context";
import { prisma } from "@/lib/prisma";

import {
  listIssuedReportSources,
} from "./statistics-issued-report-source";

import {
  prepareDeterministicStatistics,
} from "./statistics-prepare-service";

import {
  selectPreparedStatisticsMetrics,
} from "./statistics-selection";

import type {
  StatisticsDateRange,
  StatisticsValueSelection,
} from "./statistics-types";

const approvedAnalysisSchema = z.object({
  executiveDescription: z
    .string()
    .trim()
    .min(
      20,
      "الوصف التنفيذي قصير جدًا.",
    )
    .max(
      1800,
      "الوصف التنفيذي تجاوز الحد المسموح.",
    ),

  insights: z
    .array(
      z
        .string()
        .trim()
        .min(5)
        .max(400),
    )
    .max(6)
    .default([]),

  recommendations: z
    .array(
      z
        .string()
        .trim()
        .min(5)
        .max(400),
    )
    .max(6)
    .default([]),

  analysisMode: z.enum([
    "DEEPSEEK",
    "FALLBACK",
  ]),
});

export class StatisticsReportServiceError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(input: {
    message: string;
    code: string;
    status?: number;
  }) {
    super(input.message);
    this.name =
      "StatisticsReportServiceError";
    this.code = input.code;
    this.status = input.status || 400;
  }
}

function toPrismaJson(
  value: unknown,
): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value),
  ) as Prisma.InputJsonValue;
}

function buildReportTitle(input: {
  serviceName: string;
  rangeLabel: string;
}) {
  return (
    `تقرير إحصائي - ${input.serviceName} - ${input.rangeLabel}`
  ).slice(0, 255);
}

export async function createStatisticsReport(
  input: {
    context: DashboardContext;
    serviceSlug: string;
    range: StatisticsDateRange;
    selectedValues: StatisticsValueSelection[];

    analysis: {
      executiveDescription: unknown;
      insights: unknown;
      recommendations: unknown;
      analysisMode: unknown;
    };
  },
) {
  const approvedAnalysis =
    approvedAnalysisSchema.parse(
      input.analysis,
    );

  const prepared =
    await prepareDeterministicStatistics({
      context: input.context,
      serviceSlug: input.serviceSlug,
      range: input.range,
    });

  if (
    prepared.sourceCaseCount === 0 ||
    prepared.sourceReportCount === 0
  ) {
    throw new StatisticsReportServiceError({
      message:
        "لا توجد حالات تحتوي على تقارير صادرة ضمن الفترة المحددة.",
      code:
        "STATISTICS_SOURCE_EMPTY",
      status: 409,
    });
  }

  const selectedMetrics =
    selectPreparedStatisticsMetrics(
      prepared,
      input.selectedValues,
    );

  if (selectedMetrics.length === 0) {
    throw new StatisticsReportServiceError({
      message:
        "اختر قيمة إحصائية واحدة على الأقل.",
      code:
        "STATISTICS_SELECTION_REQUIRED",
    });
  }

  const issuedSources =
    await listIssuedReportSources(
      input.context,
      {
        serviceSlug:
          prepared.service.slug,
        from: input.range.from,
        to: input.range.to,
      },
    );

  const sourceReportIds = Array.from(
    new Set(
      issuedSources.map(
        (source) =>
          source.normalizedId,
      ),
    ),
  );

  const sourceCaseIds = Array.from(
    new Set(
      issuedSources.map(
        (source) =>
          source.caseEntryId,
      ),
    ),
  );

  if (
    sourceReportIds.length !==
      prepared.sourceReportCount ||
    sourceCaseIds.length !==
      prepared.sourceCaseCount
  ) {
    throw new StatisticsReportServiceError({
      message:
        "تغيرت البيانات أثناء التحضير. أعد فتح صفحة التحضير.",
      code:
        "STATISTICS_SOURCE_CHANGED",
      status: 409,
    });
  }

  const title = buildReportTitle({
    serviceName:
      prepared.service.name,
    rangeLabel:
      prepared.dateRange.label,
  });

  const filtersJson = {
    serviceSlug:
      prepared.service.slug,

    dateRange: {
      preset:
        input.range.preset,
      from:
        input.range.from.toISOString(),
      to:
        input.range.to.toISOString(),
      label:
        input.range.label,
    },

    selectedValues:
      input.selectedValues,
  };

  const deterministicMetricsJson = {
    service:
      prepared.service,

    dateRange:
      prepared.dateRange,

    sourceCaseCount:
      sourceCaseIds.length,

    sourceReportCount:
      sourceReportIds.length,

    selectedMetrics,
  };

  const aiAnalysisJson = {
    executiveDescription:
      approvedAnalysis
        .executiveDescription,

    insights:
      approvedAnalysis.insights,

    recommendations:
      approvedAnalysis
        .recommendations,

    analysisMode:
      approvedAnalysis.analysisMode,
  };

  const report =
    await prisma.$transaction(
      async (tx) => {
        const created =
          await tx.statisticalReport.create({
            data: {
              schoolAccountId:
                input.context
                  .schoolAccountId,

              createdById:
                input.context.user.id,

              serviceId:
                prepared.service.id,

              serviceSlugSnapshot:
                prepared.service.slug,

              serviceNameSnapshot:
                prepared.service.name,

              title,

              dateFrom:
                input.range.from,

              dateTo:
                input.range.to,

              filtersJson:
                toPrismaJson(
                  filtersJson,
                ),

              deterministicMetricsJson:
                toPrismaJson(
                  deterministicMetricsJson,
                ),

              aiAnalysisJson:
                toPrismaJson(
                  aiAnalysisJson,
                ),

              sourceCaseCount:
                sourceCaseIds.length,

              sourceReportCount:
                sourceReportIds.length,

              sourceReportIdsJson:
                toPrismaJson(
                  sourceReportIds,
                ),

              analysisMode:
                approvedAnalysis
                  .analysisMode,

              reportTemplateId:
                null,

              archivedAt:
                null,
            },
            select: {
              id: true,
              title: true,
              createdAt: true,
            },
          });

        await tx.platformActivityLog.create({
          data: {
            actorUserId:
              input.context.user.id,

            targetUserId:
              input.context.user.id,

            schoolAccountId:
              input.context
                .schoolAccountId,

            category: "REPORT",

            action:
              "statistical-report-created",

            severity: "SUCCESS",

            title:
              "تم إنشاء تقرير إحصائي",

            details:
              toPrismaJson({
                statisticalReportId:
                  created.id,

                serviceSlug:
                  prepared.service.slug,

                sourceCaseCount:
                  sourceCaseIds.length,

                sourceReportCount:
                  sourceReportIds.length,

                selectedMetricCount:
                  selectedMetrics.length,

                analysisMode:
                  approvedAnalysis
                    .analysisMode,
              }),
          },
        });

        return created;
      },
    );

  return {
    reportId: report.id,
    title: report.title,
    createdAt:
      report.createdAt.toISOString(),
  };
}

export async function listStatisticsReports(
  context: DashboardContext,
) {
  const reports =
    await prisma.statisticalReport.findMany({
      where: {
        archivedAt: null,

        ...(!context.isAdmin
          ? {
              schoolAccountId:
                context.schoolAccountId ||
                "__missing_school__",

              createdById:
                context.user.id,
            }
          : {}),
      },

      orderBy: {
        createdAt: "desc",
      },

      take: 50,

      select: {
        id: true,
        title: true,

        serviceSlugSnapshot: true,
        serviceNameSnapshot: true,

        sourceCaseCount: true,
        sourceReportCount: true,

        analysisMode: true,

        dateFrom: true,
        dateTo: true,

        createdAt: true,
      },
    });

  return reports.map(
    (report) => ({
      id: report.id,
      title: report.title,

      serviceSlug:
        report.serviceSlugSnapshot,

      serviceName:
        report.serviceNameSnapshot,

      sourceCaseCount:
        report.sourceCaseCount,

      sourceReportCount:
        report.sourceReportCount,

      analysisMode:
        report.analysisMode,

      dateFrom:
        report.dateFrom.toISOString(),

      dateTo:
        report.dateTo.toISOString(),

      createdAt:
        report.createdAt.toISOString(),
    }),
  );
}