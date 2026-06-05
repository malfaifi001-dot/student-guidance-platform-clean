import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";

function toDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getDetailValue(details: unknown, key: string) {
  if (!details || typeof details !== "object") return null;
  const record = details as Record<string, unknown>;
  const value = record[key];

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return null;
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

  const [logs, previousLogs] = await Promise.all([
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

    prisma.platformActivityLog.findMany({
      where: {
        createdAt: {
          gte: previousFrom,
          lt: from,
        },
      },
      select: {
        id: true,
        category: true,
        action: true,
        actorUserId: true,
      },
    }),
  ]);

  const countAction = (action: string) =>
    logs.filter((log: { action: string | null }) => log.action === action).length;

  const previousCountAction = (action: string) =>
    previousLogs.filter((log: { action: string | null }) => log.action === action).length;

  const activeUserIds = new Set(
    logs.map((log) => log.actorUserId).filter(Boolean)
  );

  const actionCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  const actorCounts = new Map<string, number>();
  const serviceCounts = new Map<string, number>();

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

    const serviceSlug =
      getDetailValue(log.details, "serviceSlug") ||
      getDetailValue(log.details, "serviceId");

    if (serviceSlug) {
      serviceCounts.set(serviceSlug, (serviceCounts.get(serviceSlug) || 0) + 1);
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

  const topActorIds = Array.from(actorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id]) => id);

  const users = topActorIds.length
    ? await prisma.user.findMany({
        where: {
          id: {
            in: topActorIds,
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
    : [];

  const userMap = new Map(users.map((user) => [user.id, user]));

  const metrics = {
    rangeDays: 30,
    totalEvents: logs.length,
    activeUsers: activeUserIds.size,

    cases: {
      drafts: countAction("case-draft-saved"),
      submitted: countAction("case-submitted"),
      previousSubmitted: previousCountAction("case-submitted"),
    },

    reports: {
      created: countAction("report-created"),
      exported: countAction("report-exported"),
      previousCreated: previousCountAction("report-created"),
    },

    evidences: {
      uploaded: countAction("evidence-uploaded"),
      previousUploaded: previousCountAction("evidence-uploaded"),
    },

    subscriptions: {
      planOrders: countAction("plan-order-created"),
      activationCodes: countAction("redeem-activation-code"),
      bankTransfers: countAction("bank-transfer-requested"),
      approvedTransfers: countAction("bank-transfer-approved"),
      rejectedTransfers: countAction("bank-transfer-rejected"),
    },

    byCategory: Array.from(categoryCounts.entries())
      .map(([category, count]) => ({
        category,
        count,
      }))
      .sort((a, b) => b.count - a.count),

    byAction: Array.from(actionCounts.entries())
      .map(([action, count]) => ({
        action,
        count,
      }))
      .sort((a, b) => b.count - a.count),

    byService: Array.from(serviceCounts.entries())
      .map(([serviceSlug, count]) => ({
        serviceSlug,
        count,
      }))
      .sort((a, b) => b.count - a.count),

    topUsers: Array.from(actorCounts.entries())
      .sort((a, b) => b[1] - a[1])
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

    daily: Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    ),
  };

  return NextResponse.json(metrics);
}


