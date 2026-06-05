import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";

export const runtime = "nodejs";

type OperationalAlertSeverity = "CRITICAL" | "WARNING" | "INFO";

type OperationalAlertCategory =
  | "SUBSCRIPTION"
  | "PAYMENT"
  | "USER"
  | "CASE"
  | "ACTIVITY"
  | "SERVICE";

type OperationalAlert = {
  id: string;
  category: OperationalAlertCategory;
  severity: OperationalAlertSeverity;
  title: string;
  description: string;
  count: number;
  href?: string;
  actionLabel?: string;
  meta?: Record<string, unknown>;
};

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getSeverityRank(severity: OperationalAlertSeverity): number {
  if (severity === "CRITICAL") return 1;
  if (severity === "WARNING") return 2;
  return 3;
}

function buildSummary(alerts: OperationalAlert[]) {
  return {
    total: alerts.length,
    critical: alerts.filter((alert) => alert.severity === "CRITICAL").length,
    warning: alerts.filter((alert) => alert.severity === "WARNING").length,
    info: alerts.filter((alert) => alert.severity === "INFO").length,
  };
}

export async function GET() {
  const adminError = await requireAdminApi();

  if (adminError) {
    return adminError;
  }

  const now = new Date();
  const next7Days = addDays(now, 7);
  const inactiveSince = addDays(now, -14);
  const last24Hours = addDays(now, -1);

  const [
    accountsWithoutSubscription,
    expiringSubscriptions,
    inactiveCounselors,
    pendingTransfers,
    disabledUsers,
    warningLogs,
    submittedCasesWithoutReports,
  ] = await Promise.all([
    prisma.schoolAccount.count({
      where: {
        isActive: true,
        subscription: null,
      },
    }),

    prisma.subscription.count({
      where: {
        status: {
          in: ["TRIAL", "ACTIVE", "PAST_DUE"],
        },
        endsAt: {
          gte: now,
          lte: next7Days,
        },
      },
    }),

    prisma.user.count({
      where: {
        role: "COUNSELOR",
        isActive: true,
        OR: [
          {
            sessions: {
              none: {},
            },
          },
          {
            sessions: {
              every: {
                lastSeenAt: {
                  lt: inactiveSince,
                },
              },
            },
          },
        ],
      },
    }),

    prisma.bankTransferRequest.count({
      where: {
        status: "PENDING",
      },
    }),

    prisma.user.count({
      where: {
        isActive: false,
      },
    }),

    prisma.platformActivityLog.count({
      where: {
        severity: {
          in: ["WARNING", "ERROR", "CRITICAL"],
        },
        createdAt: {
          gte: last24Hours,
        },
      },
    }),

    prisma.caseEntry.count({
      where: {
        status: "SUBMITTED",
        guidanceReports: {
          none: {},
        },
      },
    }),
  ]);

  const alerts: OperationalAlert[] = [];

  if (accountsWithoutSubscription > 0) {
    alerts.push({
      id: "accounts-without-subscription",
      category: "SUBSCRIPTION",
      severity: "WARNING",
      title: "حسابات بدون اشتراك",
      description: "توجد حسابات مدارس نشطة لم يتم ربطها بأي اشتراك حتى الآن.",
      count: accountsWithoutSubscription,
      href: "/dashboard/admin/subscribers",
      actionLabel: "مراجعة المشتركين",
    });
  }

  if (expiringSubscriptions > 0) {
    alerts.push({
      id: "subscriptions-expiring-soon",
      category: "SUBSCRIPTION",
      severity: "WARNING",
      title: "اشتراكات قاربت على الانتهاء",
      description: "توجد اشتراكات تنتهي خلال 7 أيام وتحتاج متابعة.",
      count: expiringSubscriptions,
      href: "/dashboard/admin/subscriptions",
      actionLabel: "إدارة الاشتراكات",
    });
  }

  if (inactiveCounselors > 0) {
    alerts.push({
      id: "inactive-counselors",
      category: "USER",
      severity: "INFO",
      title: "موجهون لم يدخلوا منذ 14 يومًا",
      description: "يوجد موجهون أو موجهات لم يظهر لهم نشاط دخول حديث.",
      count: inactiveCounselors,
      href: "/dashboard/admin/users",
      actionLabel: "مراجعة المستخدمين",
    });
  }

  if (pendingTransfers > 0) {
    alerts.push({
      id: "pending-bank-transfers",
      category: "PAYMENT",
      severity: "CRITICAL",
      title: "طلبات تحويل بنكي معلقة",
      description: "توجد طلبات تحويل بنكي بانتظار مراجعة الأدمن.",
      count: pendingTransfers,
      href: "/dashboard/admin/activations",
      actionLabel: "مراجعة التحويلات",
    });
  }

  if (disabledUsers > 0) {
    alerts.push({
      id: "disabled-users",
      category: "USER",
      severity: "INFO",
      title: "مستخدمون موقوفون",
      description: "يوجد مستخدمون تم إيقافهم داخل المنصة.",
      count: disabledUsers,
      href: "/dashboard/admin/users",
      actionLabel: "إدارة المستخدمين",
    });
  }

  if (warningLogs > 0) {
    alerts.push({
      id: "recent-warning-logs",
      category: "ACTIVITY",
      severity: "WARNING",
      title: "تحذيرات حديثة في سجل العمليات",
      description: "ظهرت عمليات ذات مستوى تحذير أو خطأ خلال آخر 24 ساعة.",
      count: warningLogs,
      href: "/dashboard/admin/activity",
      actionLabel: "فتح سجل العمليات",
    });
  }

  if (submittedCasesWithoutReports >= 5) {
    alerts.push({
      id: "submitted-cases-without-reports",
      category: "CASE",
      severity: "WARNING",
      title: "حالات مرسلة بدون تقارير",
      description: "توجد حالات مرسلة لم يتم إصدار تقارير لها بعد.",
      count: submittedCasesWithoutReports,
      href: "/dashboard/admin/users",
      actionLabel: "متابعة الحالات",
    });
  }

  const sortedAlerts = alerts.sort((a, b) => {
    const severityDiff = getSeverityRank(a.severity) - getSeverityRank(b.severity);

    if (severityDiff !== 0) {
      return severityDiff;
    }

    return b.count - a.count;
  });

  return NextResponse.json({
    generatedAt: now,
    summary: buildSummary(sortedAlerts),
    alerts: sortedAlerts,
  });
}
