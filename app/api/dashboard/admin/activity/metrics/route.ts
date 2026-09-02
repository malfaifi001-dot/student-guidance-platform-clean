
type ActivityMetricUser = {
  id: string;
  officialName?: string | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  schoolAccountId?: string | null;
};
type ActivityMetricLog = {
  category: string;
  action: string | null;
  title: string | null;
  actorUserId: string | null;
  serviceSlug?: string | null;
  severity?: string | null;
  createdAt?: Date | string | null;
};
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { countIssuedReportsForCaseScope } from "@/lib/statistics/statistics-issued-report-source";
import { auditActionLabel, normalizeAuditAction } from "@/lib/audit/audit-events";

function toDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function GET() {
  const adminError = await requireAdminApi();

  if (adminError) {
    return adminError;
  }

  const now = new Date();

  const from = new Date(now);
  from.setDate(from.getDate() - 30);

  const previousFrom = new Date(now);
  previousFrom.setDate(previousFrom.getDate() - 60);

  const recentEvidenceFrom = new Date(now);
  recentEvidenceFrom.setDate(recentEvidenceFrom.getDate() - 14);

  const [
    logs,
    currentSubmittedCases,
    previousSubmittedCases,
    currentDraftCases,
    currentReports,
    previousReports,
    currentWorkflowEvidence,
    currentCaseEvidence,
    currentReportEvidence,
    previousWorkflowEvidence,
    previousCaseEvidence,
    previousReportEvidence,
    recentWorkflowEvidence,
    recentCaseEvidence,
    recentReportEvidence,
    activeAccounts,
    paymentStatusGroups,
  ] = await Promise.all([
    prisma.platformActivityLog.findMany({
      where: {
        createdAt: {
          gte: from,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    }),

    prisma.caseEntry.count({
      where: {
        status: "SUBMITTED",
        OR: [
          { submittedAt: { gte: from } },
          { submittedAt: null, createdAt: { gte: from } },
        ],
      },
    }),
    prisma.caseEntry.count({
      where: {
        status: "SUBMITTED",
        OR: [
          { submittedAt: { gte: previousFrom, lt: from } },
          { submittedAt: null, createdAt: { gte: previousFrom, lt: from } },
        ],
      },
    }),
    prisma.caseEntry.count({
      where: { status: "DRAFT", createdAt: { gte: from } },
    }),
    countIssuedReportsForCaseScope({}, { from, to: now }),
    countIssuedReportsForCaseScope({}, { from: previousFrom, to: from }),
    prisma.evidence.count({ where: { createdAt: { gte: from } } }),
    prisma.caseEvidence.count({ where: { createdAt: { gte: from } } }),
    prisma.reportEvidence.count({ where: { createdAt: { gte: from } } }),
    prisma.evidence.count({
      where: { createdAt: { gte: previousFrom, lt: from } },
    }),
    prisma.caseEvidence.count({
      where: { createdAt: { gte: previousFrom, lt: from } },
    }),
    prisma.reportEvidence.count({
      where: { createdAt: { gte: previousFrom, lt: from } },
    }),
    prisma.evidence.count({ where: { createdAt: { gte: recentEvidenceFrom } } }),
    prisma.caseEvidence.count({
      where: { createdAt: { gte: recentEvidenceFrom } },
    }),
    prisma.reportEvidence.count({
      where: { createdAt: { gte: recentEvidenceFrom } },
    }),
    prisma.schoolAccount.count({ where: { isActive: true } }),
    prisma.paymentTransaction.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const activeUserIds = new Set(
    logs.map((log: ActivityMetricLog) => log.actorUserId).filter(Boolean)
  );

  const actionCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  const actorCounts = new Map<string, number>();

  const dailyMap = new Map<
    string,
    {
      date: string;
      cases: number;
      reports: number;
      evidences: number;
      subscriptions: number;
      logins: number;
      total: number;
    }
  >();

  for (const log of logs) {
    actionCounts.set(log.action, (actionCounts.get(log.action) || 0) + 1);
    categoryCounts.set(
      log.category,
      (categoryCounts.get(log.category) || 0) + 1
    );

    if (log.actorUserId) {
      actorCounts.set(
        log.actorUserId,
        (actorCounts.get(log.actorUserId) || 0) + 1
      );
    }

    const dayKey = toDayKey(log.createdAt);

    if (!dailyMap.has(dayKey)) {
      dailyMap.set(dayKey, {
        date: dayKey,
        cases: 0,
        reports: 0,
        evidences: 0,
        subscriptions: 0,
        logins: 0,
        total: 0,
      });
    }

    const day = dailyMap.get(dayKey)!;
    day.total += 1;

    if (log.category === "CASE") day.cases += 1;
    if (log.category === "REPORT") day.reports += 1;
    if (log.category === "EVIDENCE") day.evidences += 1;

    if (
      log.category === "SUBSCRIPTION" ||
      log.category === "ACTIVATION" ||
      log.category === "PAYMENT"
    ) {
      day.subscriptions += 1;
    }

    if (log.category === "AUTH") {
      day.logins += 1;
    }
  }

  const actorIds = Array.from(actorCounts.keys());

  const [users, serviceGroups, subscriptionGroups] = await Promise.all([
    actorIds.length
      ? prisma.user.findMany({
        where: {
          id: {
            in: actorIds,
          },
        },
        select: {
          id: true,
          name: true,
          officialName: true,
          email: true,
          role: true,
        },
        })
      : [],
    prisma.caseEntry.groupBy({
      by: ["serviceId"],
      where: {
        status: { not: "ARCHIVED" },
        createdAt: { gte: from },
      },
      _count: { _all: true },
      orderBy: { _count: { serviceId: "desc" } },
      take: 8,
    }),
    prisma.subscription.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const serviceIds = serviceGroups.map((group) => group.serviceId);
  const services = serviceIds.length
    ? await prisma.service.findMany({
        where: { id: { in: serviceIds } },
        select: { id: true, slug: true, name: true },
      })
    : [];
  const serviceMap = new Map(services.map((service) => [service.id, service]));

  const userMap = new Map<string, ActivityMetricUser>(users.map((user: ActivityMetricUser) => [user.id, user]));

  const metrics = {
    rangeDays: 30,
    totalEvents: logs.length,
    activeUsers: activeUserIds.size,

    cases: {
      drafts: currentDraftCases,
      submitted: currentSubmittedCases,
      previousSubmitted: previousSubmittedCases,
    },

    reports: {
      created: currentReports,
      previousCreated: previousReports,
    },

    evidences: {
      uploaded:
        currentWorkflowEvidence + currentCaseEvidence + currentReportEvidence,
      recentUploaded:
        recentWorkflowEvidence + recentCaseEvidence + recentReportEvidence,
      previousUploaded:
        previousWorkflowEvidence + previousCaseEvidence + previousReportEvidence,
    },

    subscriptions: {
      total: subscriptionGroups.reduce((sum, group) => sum + group._count._all, 0),
      active: subscriptionGroups.find((group) => group.status === "ACTIVE")?._count._all || 0,
      trial: subscriptionGroups.find((group) => group.status === "TRIAL")?._count._all || 0,
      pastDue: subscriptionGroups.find((group) => group.status === "PAST_DUE")?._count._all || 0,
      expired: subscriptionGroups.find((group) => group.status === "EXPIRED")?._count._all || 0,
      canceled: subscriptionGroups.find((group) => group.status === "CANCELED")?._count._all || 0,
    },

    paymentStatuses: paymentStatusGroups.map((group) => ({
      status: group.status,
      count: group._count._all,
    })),
    activeAccounts,

    byCategory: Array.from(categoryCounts.entries())
      .map(([category, count]) => ({
        category,
        count,
      }))
      .sort((a: any, b: any) => b.count - a.count),

    byAction: Array.from(actionCounts.entries())
      .map(([action, count]) => ({
        action,
        count,
      }))
      .sort((a: any, b: any) => b.count - a.count),

    byService: serviceGroups.map((group) => ({
      serviceSlug: serviceMap.get(group.serviceId)?.slug || group.serviceId,
      serviceName: serviceMap.get(group.serviceId)?.name || null,
      count: group._count._all,
    })),

    topUsers: Array.from(actorCounts.entries())
      .sort((a: any, b: any) => b[1] - a[1])
      .filter(([userId]) => userMap.get(userId)?.role === "COUNSELOR")
      .slice(0, 8)
      .map(([userId, count]) => {
        const user = userMap.get(userId);

        return {
          userId,
          count,
          name: user?.officialName || user?.name || user?.email || "مستخدم",
          email: user?.email || "",
          role: user?.role || "",
        };
      }),

    daily: Array.from(dailyMap.values()).sort((a: any, b: any) =>
      a.date.localeCompare(b.date)
    ),

    recentActivity: logs
      .filter((log: ActivityMetricLog) =>
        ["CASE", "REPORT", "EVIDENCE", "SUBSCRIPTION", "ACTIVATION", "PAYMENT"].includes(log.category || "")
      )
      .slice(-8)
      .reverse()
      .map((log: ActivityMetricLog, index: number) => ({
        id: `${new Date(log.createdAt || new Date()).toISOString()}-${index}`,
        title: log.action
          ? auditActionLabel(normalizeAuditAction(log.action), log.title)
          : log.title || "نشاط تشغيلي",
        action: log.action || "",
        category: log.category,
        createdAt: new Date(log.createdAt || new Date()).toISOString(),
      })),
  };

  return NextResponse.json(metrics);
}






