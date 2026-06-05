import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";

type OperationalAlertItem = Record<string, any>;

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

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getSeverityRank(severity: OperationalAlertSeverity) {
  if (severity === "CRITICAL") return 1;
  if (severity === "WARNING") return 2;
  return 3;
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

    prisma.subscription.findMany({
      where: {
        status: {
          in: ["TRIAL", "ACTIVE", "PAST_DUE"],
        },
        endsAt: {
          gte: now,
          lte: next7Days,
        },
      },
      include: {
        schoolAccount: {
          select: {
            id: true,
            name: true,
            slug: true,
            profile: {
              select: {
                schoolName: true,
              },
            },
          },
        },
        plan: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        endsAt: "asc",
      },
      take: 10,
    }),

    prisma.user.findMany({
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
      select: {
        id: true,
        name: true,
        email: true,
        schoolAccountId: true,
        schoolAccount: {
          select: {
            name: true,
            profile: {
              select: {
                schoolName: true,
              },
            },
          },
        },
        sessions: {
          orderBy: {
            lastSeenAt: "desc",
          },
          take: 1,
          select: {
            lastSeenAt: true,
          },
        },
      },
      take: 15,
    }),

    prisma.bankTransferRequest.findMany({
      where: {
        status: "PENDING",
      },
      orderBy: {
        createdAt: "asc",
      },
      take: 15,
    }),

    prisma.user.count({
      where: {
        isActive: false,
      },
    }),

    prisma.platformActivityLog.findMany({
      where: {
        severity: {
          in: ["WARNING", "ERROR", "CRITICAL"],
        },
        createdAt: {
          gte: last24Hours,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    }),

    prisma.caseEntry.groupBy({
      by: ["schoolAccountId"],
      where: {
        status: "SUBMITTED",
        guidanceReports: {
          none: {},
        },
      },
      _count: {
        _all: true,
      },
      orderBy: {
        _count: {
          schoolAccountId: "desc",
        },
      },
      take: 10,
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

  if (expiringSubscriptions.length > 0) {
    alerts.push({
      id: "subscriptions-expiring-soon",
      category: "SUBSCRIPTION",
      severity: "WARNING",
      title: "اشتراكات قاربت على الانتهاء",
      description: "توجد اشتراكات تنتهي خلال 7 أيام وتحتاج متابعة قبل توقف الخدمات.",
      count: expiringSubscriptions.length,
      href: "/dashboard/admin/subscriptions",
      actionLabel: "إدارة الاشتراكات",
      meta: {
        items: expiringSubscriptions.map((subscription: OperationalAlertItem) => ({
          id: subscription.id,
          schoolAccountId: subscription.schoolAccountId,
          schoolName:
            subscription.schoolAccount.profile?.schoolName || "هوية المدرسة غير مكتملة",
          planName: subscription.plan.name,
          endsAt: subscription.endsAt,
          status: subscription.status,
        })),
      },
    });
  }

  if (inactiveCounselors.length > 0) {
    alerts.push({
      id: "inactive-counselors",
      category: "USER",
      severity: "INFO",
      title: "موجهون لم يدخلوا منذ 14 يومًا",
      description: "يوجد مستخدمون نشطون بدور موجه/موجهة لم يظهر لهم نشاط دخول حديث.",
      count: inactiveCounselors.length,
      href: "/dashboard/admin/users",
      actionLabel: "مراجعة المستخدمين",
      meta: {
        items: inactiveCounselors.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          schoolName:
            user.schoolAccount?.profile?.schoolName ||
            user.schoolAccount?.name ||
            "بدون حساب مدرسة",
          lastSeenAt: user.sessions[0]?.lastSeenAt || null,
        })),
      },
    });
  }

  if (pendingTransfers.length > 0) {
    alerts.push({
      id: "pending-bank-transfers",
      category: "PAYMENT",
      severity: "CRITICAL",
      title: "طلبات تحويل بنكي معلقة",
      description: "توجد طلبات تحويل بنكي بانتظار مراجعة الأدمن قبولًا أو رفضًا.",
      count: pendingTransfers.length,
      href: "/dashboard/admin/activations",
      actionLabel: "مراجعة التحويلات",
      meta: {
        items: pendingTransfers.map((request: OperationalAlertItem) => ({
          id: request.id,
          schoolAccountId: request.schoolAccountId,
          amount: request.amount,
          currency: request.currency,
          senderName: request.senderName,
          createdAt: request.createdAt,
        })),
      },
    });
  }

  if (disabledUsers > 0) {
    alerts.push({
      id: "disabled-users",
      category: "USER",
      severity: "INFO",
      title: "مستخدمون موقوفون",
      description: "يوجد مستخدمون تم إيقافهم. راجع القائمة إذا كان الإيقاف مؤقتًا أو يحتاج إجراء.",
      count: disabledUsers,
      href: "/dashboard/admin/users",
      actionLabel: "إدارة المستخدمين",
    });
  }

  if (warningLogs.length > 0) {
    alerts.push({
      id: "recent-warning-logs",
      category: "ACTIVITY",
      severity: "WARNING",
      title: "تحذيرات حديثة في سجل العمليات",
      description: "ظهرت عمليات ذات مستوى تحذير أو خطأ خلال آخر 24 ساعة.",
      count: warningLogs.length,
      href: "/dashboard/admin/activity",
      actionLabel: "فتح سجل العمليات",
      meta: {
        items: warningLogs.slice(0, 8).map((log) => ({
          id: log.id,
          category: log.category,
          action: log.action,
          severity: log.severity,
          title: log.title,
          createdAt: log.createdAt,
        })),
      },
    });
  }

  const highCaseAccounts = submittedCasesWithoutReports.filter(
    (item) => item._count._all >= 5
  );

  if (highCaseAccounts.length > 0) {
    alerts.push({
      id: "submitted-cases-without-reports",
      category: "CASE",
      severity: "WARNING",
      title: "حالات مرسلة بدون تقارير",
      description: "توجد حسابات لديها عدد ملحوظ من الحالات المرسلة التي لم يصدر لها تقرير.",
      count: highCaseAccounts.reduce((sum, item) => sum + item._count._all, 0),
      href: "/dashboard/admin/users",
      actionLabel: "متابعة الحسابات",
      meta: {
        items: highCaseAccounts.map((item) => ({
          schoolAccountId: item.schoolAccountId,
          casesWithoutReports: item._count._all,
        })),
      },
    });
  }

  const sortedAlerts = alerts.sort((a, b) => {
    const severityDiff = getSeverityRank(a.severity) - getSeverityRank(b.severity);

    if (severityDiff !== 0) return severityDiff;

    return b.count - a.count;
  });

  return NextResponse.json({
    generatedAt: now,
    summary: {
      total: sortedAlerts.length,
      critical: sortedAlerts.filter((alert) => alert.severity === "CRITICAL").length,
      warning: sortedAlerts.filter((alert) => alert.severity === "WARNING").length,
      info: sortedAlerts.filter((alert) => alert.severity === "INFO").length,
    },
    alerts: sortedAlerts,
  });
}


