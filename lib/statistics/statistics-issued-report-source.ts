import "server-only";

import type { Prisma } from "@prisma/client";

import type { DashboardContext } from "@/lib/auth/dashboard-context";
import { prisma } from "@/lib/prisma";

import type {
  NormalizedIssuedReport,
  StatisticsIssuedReportFilters,
  StatisticsServiceOption,
} from "./statistics-types";

function buildDateFilter(
  filters: StatisticsIssuedReportFilters,
) {
  return {
    ...(filters.from ? { gte: filters.from } : {}),
    ...(filters.to ? { lte: filters.to } : {}),
  };
}

function buildGuidanceIssuedDateWhere(
  filters: StatisticsIssuedReportFilters,
): Prisma.GuidanceReportWhereInput | null {
  const issuedAtFilter = buildDateFilter(filters);

  if (Object.keys(issuedAtFilter).length === 0) {
    return null;
  }

  return {
    OR: [
      {
        approvedAt: issuedAtFilter,
      },
      {
        approvedAt: null,
        generatedAt: issuedAtFilter,
      },
      {
        approvedAt: null,
        generatedAt: null,
        createdAt: issuedAtFilter,
      },
    ],
  };
}

function buildCaseScope(
  context: DashboardContext,
  filters: StatisticsIssuedReportFilters,
): Prisma.CaseEntryWhereInput {
  return {
    ...(!context.isAdmin
      ? {
          schoolAccountId:
            context.schoolAccountId || "__missing_school_account__",
          createdById: context.user.id,
        }
      : {}),
    ...(filters.serviceSlug
      ? {
          service: {
            slug: filters.serviceSlug,
          },
        }
      : {}),
  };
}

async function listGuidanceReportSources(
  context: DashboardContext,
  filters: StatisticsIssuedReportFilters,
): Promise<NormalizedIssuedReport[]> {
  const statusWhere: Prisma.GuidanceReportWhereInput = {
    OR: [
      {
        status: {
          in: ["GENERATED", "APPROVED"],
        },
      },
      {
        status: "ARCHIVED",
        OR: [
          {
            approvedAt: {
              not: null,
            },
          },
          {
            generatedAt: {
              not: null,
            },
          },
        ],
      },
    ],
  };

  const dateWhere = buildGuidanceIssuedDateWhere(filters);

  const reports = await prisma.guidanceReport.findMany({
    where: {
      AND: [
        statusWhere,
        ...(dateWhere ? [dateWhere] : []),
      ],
      caseEntry: buildCaseScope(context, filters),
    },
    select: {
      id: true,
      title: true,
      approvedAt: true,
      generatedAt: true,
      createdAt: true,
      caseEntryId: true,
      caseEntry: {
        select: {
          schoolAccountId: true,
          service: {
            select: {
              id: true,
              slug: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return reports.map((report) => ({
    sourceType: "GUIDANCE_REPORT",
    sourceId: report.id,
    normalizedId: `guidance:${report.id}`,

    caseEntryId: report.caseEntryId,
    schoolAccountId: report.caseEntry.schoolAccountId,

    serviceId: report.caseEntry.service.id,
    serviceSlug: report.caseEntry.service.slug,
    serviceName: report.caseEntry.service.name,

    title: report.title,
    issuedAt:
      report.approvedAt ||
      report.generatedAt ||
      report.createdAt,
  }));
}

async function listReportSnapshotSources(
  context: DashboardContext,
  filters: StatisticsIssuedReportFilters,
): Promise<NormalizedIssuedReport[]> {
  if (!context.isAdmin && !context.schoolAccountId) {
    return [];
  }

  const approvedAtFilter = buildDateFilter(filters);

  const snapshots = await prisma.reportSnapshot.findMany({
    where: {
      ...(Object.keys(approvedAtFilter).length > 0
        ? {
            approvedAt: approvedAtFilter,
          }
        : {}),
      ...(filters.serviceSlug
        ? {
            serviceSlug: filters.serviceSlug,
          }
        : {}),
      ...(!context.isAdmin
        ? {
            OR: [
              {
                schoolAccountId: context.schoolAccountId,
              },
              {
                schoolAccountId: null,
              },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      caseEntryId: true,
      schoolAccountId: true,
      reportTitle: true,
      approvedAt: true,
    },
  });

  if (snapshots.length === 0) {
    return [];
  }

  const caseIds = Array.from(
    new Set(
      snapshots.map((snapshot) => snapshot.caseEntryId),
    ),
  );

  const cases = await prisma.caseEntry.findMany({
    where: {
      id: {
        in: caseIds,
      },
      ...buildCaseScope(context, filters),
    },
    select: {
      id: true,
      schoolAccountId: true,
      service: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
    },
  });

  const caseById = new Map(
    cases.map((caseEntry) => [
      caseEntry.id,
      caseEntry,
    ]),
  );

  const sources: NormalizedIssuedReport[] = [];

  for (const snapshot of snapshots) {
    const caseEntry = caseById.get(snapshot.caseEntryId);

    if (!caseEntry) {
      continue;
    }

    sources.push({
      sourceType: "REPORT_SNAPSHOT",
      sourceId: snapshot.id,
      normalizedId: `snapshot:${snapshot.id}`,

      caseEntryId: caseEntry.id,
      schoolAccountId: caseEntry.schoolAccountId,

      serviceId: caseEntry.service.id,
      serviceSlug: caseEntry.service.slug,
      serviceName: caseEntry.service.name,

      title: snapshot.reportTitle,
      issuedAt: snapshot.approvedAt,
    });
  }

  return sources;
}

export async function listIssuedReportSources(
  context: DashboardContext,
  filters: StatisticsIssuedReportFilters = {},
): Promise<NormalizedIssuedReport[]> {
  if (!context.isAdmin && !context.schoolAccountId) {
    return [];
  }

  const [guidanceReports, reportSnapshots] =
    await Promise.all([
      listGuidanceReportSources(context, filters),
      listReportSnapshotSources(context, filters),
    ]);

  return [...guidanceReports, ...reportSnapshots].sort(
    (first, second) =>
      second.issuedAt.getTime() -
      first.issuedAt.getTime(),
  );
}

export function buildStatisticsServiceOptions(
  sources: NormalizedIssuedReport[],
): StatisticsServiceOption[] {
  const grouped = new Map<
    string,
    {
      id: string;
      slug: string;
      name: string;
      caseIds: Set<string>;
      reportIds: Set<string>;
    }
  >();

  for (const source of sources) {
    const current = grouped.get(source.serviceId) || {
      id: source.serviceId,
      slug: source.serviceSlug,
      name: source.serviceName,
      caseIds: new Set<string>(),
      reportIds: new Set<string>(),
    };

    current.caseIds.add(source.caseEntryId);
    current.reportIds.add(source.normalizedId);

    grouped.set(source.serviceId, current);
  }

  return Array.from(grouped.values())
    .map((service) => ({
      id: service.id,
      slug: service.slug,
      name: service.name,
      eligibleCaseCount: service.caseIds.size,
      issuedReportCount: service.reportIds.size,
    }))
    .sort((first, second) =>
      first.name.localeCompare(second.name, "ar"),
    );
}