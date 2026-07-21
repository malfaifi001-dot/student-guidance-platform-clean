import "server-only";

import type { DashboardContext } from "@/lib/auth/dashboard-context";
import { prisma } from "@/lib/prisma";

function asRecord(
  value: unknown,
): Record<string, unknown> {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<
      string,
      unknown
    >;
  }

  return {};
}

function cleanString(
  value: unknown,
) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function cleanStringArray(
  value: unknown,
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) =>
      cleanString(item),
    )
    .filter(Boolean)
    .slice(0, 6);
}

function parseSelectedMetrics(
  value: unknown,
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const record =
        asRecord(item);

      const metricId =
        cleanString(
          record.metricId,
        );

      const fieldLabel =
        cleanString(
          record.fieldLabel,
        );

      const valueLabel =
        cleanString(
          record.valueLabel,
        );

      const caseCount =
        Number(record.caseCount);

      if (
        !metricId ||
        !fieldLabel ||
        !valueLabel ||
        !Number.isFinite(
          caseCount,
        ) ||
        caseCount < 0
      ) {
        return null;
      }

      return {
        metricId,
        fieldLabel,
        valueLabel,
        caseCount:
          Math.floor(caseCount),
      };
    })
    .filter(
      (
        item,
      ): item is {
        metricId: string;
        fieldLabel: string;
        valueLabel: string;
        caseCount: number;
      } => Boolean(item),
    );
}

export async function getStatisticsReportView(
  context: DashboardContext,
  reportId: string,
) {
  const report =
    await prisma.statisticalReport.findFirst({
      where: {
        id: reportId,

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
    });

  if (!report) {
    return null;
  }

  const [
    schoolAccount,
    creator,
  ] = await Promise.all([
    report.schoolAccountId
      ? prisma.schoolAccount.findUnique({
          where: {
            id:
              report.schoolAccountId,
          },

          select: {
            name: true,

            profile: {
              select: {
                schoolName: true,
                educationDepartment: true,
                educationOffice: true,
                city: true,
                stage: true,
                academicYear: true,
                currentSemester: true,
                logoUrl: true,
              },
            },
          },
        })
      : null,

    prisma.user.findUnique({
      where: {
        id: report.createdById,
      },

      select: {
        name: true,
        officialName: true,
        jobTitle: true,
      },
    }),
  ]);

  const deterministic =
    asRecord(
      report
        .deterministicMetricsJson,
    );

  const analysis =
    asRecord(
      report.aiAnalysisJson,
    );

  return {
    id: report.id,
    title: report.title,

    serviceSlug:
      report.serviceSlugSnapshot,

    serviceName:
      report.serviceNameSnapshot,

    dateFrom:
      report.dateFrom.toISOString(),

    dateTo:
      report.dateTo.toISOString(),

    sourceCaseCount:
      report.sourceCaseCount,

    sourceReportCount:
      report.sourceReportCount,

    analysisMode:
      report.analysisMode,

    createdAt:
      report.createdAt.toISOString(),

    metrics:
      parseSelectedMetrics(
        deterministic
          .selectedMetrics,
      ),

    executiveDescription:
      cleanString(
        analysis
          .executiveDescription,
      ),

    insights:
      cleanStringArray(
        analysis.insights,
      ),

    recommendations:
      cleanStringArray(
        analysis
          .recommendations,
      ),

    school: {
      name:
        schoolAccount?.profile
          ?.schoolName ||
        schoolAccount?.name ||
        "المدرسة",

      educationDepartment:
        schoolAccount?.profile
          ?.educationDepartment ||
        "",

      educationOffice:
        schoolAccount?.profile
          ?.educationOffice ||
        "",

      city:
        schoolAccount?.profile
          ?.city ||
        "",

      stage:
        schoolAccount?.profile
          ?.stage ||
        "",

      academicYear:
        schoolAccount?.profile
          ?.academicYear ||
        "",

      currentSemester:
        schoolAccount?.profile
          ?.currentSemester ||
        "",

      logoUrl:
        schoolAccount?.profile
          ?.logoUrl ||
        "",
    },

    creator: {
      name:
        creator?.officialName ||
        creator?.name ||
        "الموجه الطلابي",

      jobTitle:
        creator?.jobTitle ||
        "الموجه الطلابي",
    },
  };
}