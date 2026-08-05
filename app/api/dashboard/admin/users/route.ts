import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import {
  getRemainingDays,
  isSubscriptionUsable,
} from "@/lib/subscription/subscription-service";
import { logAdminActivity } from "@/lib/admin/activity-log";
import { UserRole } from "@prisma/client";

function getSubscriptionStatusLabel(status?: string | null, endsAt?: Date | null) {
  if (!status) return "NO_SUBSCRIPTION";

  if (endsAt && endsAt.getTime() <= Date.now() && status !== "CANCELED") {
    return "EXPIRED";
  }

  return status;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export async function GET() {
  const adminError = await requireAdminApi();

  if (adminError) {
    return adminError;
  }

  const current = await getCurrentSessionUser();

  if (!current) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }

  const now = new Date();
  const last30Days = addDays(now, -30);
  const inactiveSince = addDays(now, -14);

  const [
    users,
    logs,
    pendingTransfers,
    casesLast30,
    recentActivity,
  ] = await Promise.all([
    prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        schoolAccount: {
          include: {
            profile: true,
            subscription: {
              include: {
                plan: true,
              },
            },
            _count: {
              select: {
                students: true,
                users: true,
              },
            },
          },
        },
        sessions: {
          orderBy: {
            lastSeenAt: "desc",
          },
          take: 1,
        },
        _count: {
          select: {
            cases: true,
          },
        },
      },
    }),

    prisma.platformActivityLog.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 160,
    }),

    prisma.bankTransferRequest.findMany({
      where: {
        status: "PENDING",
      },
      select: {
        schoolAccountId: true,
      },
    }),

    prisma.caseEntry.groupBy({
      by: ["createdById"],
      where: {
        createdAt: {
          gte: last30Days,
        },
        createdById: {
          not: null,
        },
      },
      _count: {
        _all: true,
      },
    }),

    prisma.platformActivityLog.findMany({
      where: {
        createdAt: {
          gte: last30Days,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        actorUserId: true,
        targetUserId: true,
        schoolAccountId: true,
        category: true,
        action: true,
        severity: true,
        title: true,
        createdAt: true,
      },
    }),
  ]);

  const pendingTransferCountBySchool = new Map<string, number>();

  for (const request of pendingTransfers) {
    pendingTransferCountBySchool.set(
      request.schoolAccountId,
      (pendingTransferCountBySchool.get(request.schoolAccountId) || 0) + 1
    );
  }

  const casesLast30ByUser = new Map<string, number>();

  for (const item of casesLast30) {
    if (item.createdById) {
      casesLast30ByUser.set(item.createdById, item._count._all);
    }
  }

  const activityStatsByUser = new Map<
    string,
    {
      activityLast30Days: number;
      reportsLast30Days: number;
      evidencesLast30Days: number;
      lastActivityAt: Date | null;
    }
  >();

  function ensureActivityStats(userId: string) {
    const existing = activityStatsByUser.get(userId);

    if (existing) return existing;

    const created = {
      activityLast30Days: 0,
      reportsLast30Days: 0,
      evidencesLast30Days: 0,
      lastActivityAt: null as Date | null,
    };

    activityStatsByUser.set(userId, created);

    return created;
  }

  for (const log of recentActivity) {
    const relatedUserIds = [log.actorUserId, log.targetUserId].filter(
      Boolean
    ) as string[];

    for (const userId of new Set(relatedUserIds)) {
      const stats = ensureActivityStats(userId);

      stats.activityLast30Days += 1;

      if (log.category === "REPORT" || log.action === "report-created") {
        stats.reportsLast30Days += 1;
      }

      if (log.category === "EVIDENCE" || log.action === "evidence-uploaded") {
        stats.evidencesLast30Days += 1;
      }

      if (!stats.lastActivityAt || log.createdAt.getTime() > stats.lastActivityAt.getTime()) {
        stats.lastActivityAt = log.createdAt;
      }
    }
  }

  const mappedUsers = users.map((user: any) => {
    const subscription = user.schoolAccount?.subscription;
    const computedSubscriptionStatus = getSubscriptionStatusLabel(
      subscription?.status,
      subscription?.endsAt
    );

    const subscriptionUsable = isSubscriptionUsable(
      subscription?.status,
      subscription?.endsAt
    );

    const userActivityStats = activityStatsByUser.get(user.id) || {
      activityLast30Days: 0,
      reportsLast30Days: 0,
      evidencesLast30Days: 0,
      lastActivityAt: null,
    };

    const lastSeenAt = user.sessions[0]?.lastSeenAt || null;
    const casesLast30Days = casesLast30ByUser.get(user.id) || 0;
    const reportsLast30Days = userActivityStats.reportsLast30Days;
    const evidencesLast30Days = userActivityStats.evidencesLast30Days;
    const activityLast30Days = userActivityStats.activityLast30Days;

    const isInactive =
      user.role === "COUNSELOR" &&
      user.isActive &&
      (!lastSeenAt || lastSeenAt.getTime() < inactiveSince.getTime());

    const isVeryActive =
      user.role === "COUNSELOR" &&
      (casesLast30Days >= 10 ||
        reportsLast30Days >= 5 ||
        evidencesLast30Days >= 10 ||
        activityLast30Days >= 20);

    const isIncompleteOnboarding = !user.onboardingCompleted;

    return {
      id: user.id,
      name: user.name,
      officialName: user.officialName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      gender: user.gender,
      jobTitle: user.jobTitle,
      isActive: user.isActive,
      onboardingCompleted: user.onboardingCompleted,
      createdAt: user.createdAt,
      lastSeenAt,
      lastActivityAt: userActivityStats.lastActivityAt,
      schoolAccountId: user.schoolAccountId,
      schoolName:
        user.schoolAccount?.profile?.schoolName ||
        user.schoolAccount?.name ||
        "بدون حساب",
      schoolAccountName: user.schoolAccount?.name || "",
      educationDepartment: user.schoolAccount?.profile?.educationDepartment || "",
      schoolUsersCount: user.schoolAccount?._count.users || 0,
      studentsCount: user.schoolAccount?._count.students || 0,
      casesCount: user._count.cases,
      casesLast30Days,
      reportsLast30Days,
      evidencesLast30Days,
      activityLast30Days,
      flags: {
        inactive: isInactive,
        veryActive: isVeryActive,
        incompleteOnboarding: isIncompleteOnboarding,
      },
      pendingTransfersCount: user.schoolAccountId
        ? pendingTransferCountBySchool.get(user.schoolAccountId) || 0
        : 0,
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.status,
            computedStatus: computedSubscriptionStatus,
            usable: subscriptionUsable,
            planName: subscription.plan?.name || "بدون باقة",
            planId: subscription.planId,
            endsAt: subscription.endsAt,
            remainingDays: getRemainingDays(subscription.endsAt),
          }
        : null,
      riskLevel:
        !user.isActive
          ? "DISABLED"
          : !subscription
            ? "NO_SUBSCRIPTION"
            : computedSubscriptionStatus === "EXPIRED" ||
                computedSubscriptionStatus === "CANCELED" ||
                computedSubscriptionStatus === "PAST_DUE"
              ? "SUBSCRIPTION_ISSUE"
              : pendingTransferCountBySchool.get(user.schoolAccountId || "") || 0
                ? "PENDING_PAYMENT"
                : isInactive
                  ? "INACTIVE"
                  : isIncompleteOnboarding
                    ? "INCOMPLETE_ONBOARDING"
                    : "OK",
    };
  });

  const stats = {
    totalUsers: mappedUsers.length,
    counselors: mappedUsers.filter((user: any) => user.role === "COUNSELOR").length,
    admins: mappedUsers.filter((user: any) => user.role === "ADMIN").length,
    activeUsers: mappedUsers.filter((user: any) => user.isActive).length,
    disabledUsers: mappedUsers.filter((user: any) => !user.isActive).length,
    subscribedUsers: mappedUsers.filter((user: any) => user.subscription?.usable).length,
    withoutSubscription: mappedUsers.filter((user: any) => !user.subscription).length,
    needsAttention: mappedUsers.filter((user: any) => user.riskLevel !== "OK").length,
    pendingTransfers: mappedUsers.reduce(
      (sum: any, user: any) => sum + user.pendingTransfersCount,
      0
    ),
    inactiveCounselors: mappedUsers.filter((user: any) => user.flags.inactive).length,
    veryActiveCounselors: mappedUsers.filter((user: any) => user.flags.veryActive).length,
    incompleteOnboarding: mappedUsers.filter((user: any) => user.flags.incompleteOnboarding).length,
    casesLast30Days: mappedUsers.reduce((sum: any, user: any) => sum + user.casesLast30Days, 0),
    reportsLast30Days: mappedUsers.reduce((sum: any, user: any) => sum + user.reportsLast30Days, 0),
    evidencesLast30Days: mappedUsers.reduce((sum: any, user: any) => sum + user.evidencesLast30Days, 0),
  };

  return NextResponse.json({
    stats,
    users: mappedUsers,
    logs,
  });
}

export async function POST(request: Request) {
  const adminError = await requireAdminApi();

  if (adminError) {
    return adminError;
  }

  const current = await getCurrentSessionUser();

  if (!current) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const action = String(payload?.action || "").trim();
  const userId = String(payload?.userId || "").trim();

  if (action === "create-principal") {
    return NextResponse.json(
      { error: "يتم إنشاء حساب مدير المدرسة من صفحة التسجيل العامة." },
      { status: 403 },
    );
  }

  if (!userId) {
    return NextResponse.json(
      { error: "حدد المستخدم المطلوب." },
      { status: 400 }
    );
  }

  const targetUser = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      schoolAccount: true,
    },
  });

  if (!targetUser) {
    return NextResponse.json(
      { error: "المستخدم غير موجود." },
      { status: 404 }
    );
  }

  if (targetUser.email === "admin@student-guidance.local" && action !== "activate-user") {
    return NextResponse.json(
      { error: "لا يمكن تعديل حساب الأدمن الأساسي من هنا." },
      { status: 400 }
    );
  }

  if (action === "activate-user" || action === "disable-user") {
    const isActive = action === "activate-user";

    if (isActive && targetUser.role === "PRINCIPAL" && targetUser.schoolAccountId) {
      const existingPrincipal = await prisma.user.findFirst({
        where: {
          schoolAccountId: targetUser.schoolAccountId,
          role: "PRINCIPAL",
          isActive: true,
          id: { not: targetUser.id },
        },
        select: { id: true },
      });
      if (existingPrincipal) {
        return NextResponse.json({ error: "يوجد مدير مدرسة نشط مرتبط بهذه المدرسة بالفعل." }, { status: 409 });
      }
    }

    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        isActive,
      },
    });

    if (!isActive) {
      await prisma.userSession.updateMany({
        where: {
          userId,
          isActive: true,
        },
        data: {
          isActive: false,
          revokedAt: new Date(),
        },
      });
    }

    await logAdminActivity({
      actorUserId: current.user.id,
      targetUserId: userId,
      schoolAccountId: targetUser.schoolAccountId,
      category: "USER",
      action,
      severity: isActive ? "SUCCESS" : "WARNING",
      title: isActive
        ? `تم تفعيل المستخدم ${targetUser.email}`
        : `تم إيقاف المستخدم ${targetUser.email}`,
      details: {
        targetEmail: targetUser.email,
        targetRole: targetUser.role,
      },
    });

    return NextResponse.json({
      message: isActive ? "تم تفعيل المستخدم." : "تم إيقاف المستخدم وتسجيل خروجه.",
    });
  }

  if (action === "set-role") {
    const role = String(payload?.role || "").trim();

    const allowedRoles: UserRole[] = ["ADMIN", "COUNSELOR", "ACTIVITY_LEADER", "TEACHER", "PRINCIPAL", "SCHOOL_OWNER", "STAFF"];
    if (!allowedRoles.includes(role as UserRole)) {
      return NextResponse.json(
        { error: "الدور غير صحيح." },
        { status: 400 }
      );
    }

    if (role === "PRINCIPAL") {
      if (targetUser.role !== "PRINCIPAL") {
        return NextResponse.json({ error: "يتم إنشاء حساب مدير المدرسة من صفحة التسجيل العامة." }, { status: 403 });
      }
    }

    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        role: role as UserRole,
      },
    });

    await logAdminActivity({
      actorUserId: current.user.id,
      targetUserId: userId,
      schoolAccountId: targetUser.schoolAccountId,
      category: "USER",
      action: role === "PRINCIPAL" || targetUser.role === "PRINCIPAL" ? "principal-account-updated" : "set-role",
      severity: "WARNING",
      title: `تم تغيير دور المستخدم ${targetUser.email} إلى ${role}`,
      details: {
        previousRole: targetUser.role,
        nextRole: role,
      },
    });

    return NextResponse.json({
      message: "تم تغيير دور المستخدم.",
    });
  }

  if (action === "logout-user") {
    await prisma.userSession.updateMany({
      where: {
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });

    await logAdminActivity({
      actorUserId: current.user.id,
      targetUserId: userId,
      schoolAccountId: targetUser.schoolAccountId,
      category: "SECURITY",
      action: "logout-user",
      severity: "INFO",
      title: `تم تسجيل خروج المستخدم ${targetUser.email} من جميع الجلسات`,
      details: {
        targetEmail: targetUser.email,
      },
    });

    return NextResponse.json({
      message: "تم تسجيل خروج المستخدم من كل الجلسات.",
    });
  }

  if (action === "cancel-subscription") {
    if (!targetUser.schoolAccountId) {
      return NextResponse.json(
        { error: "المستخدم غير مرتبط بحساب مدرسة." },
        { status: 400 }
      );
    }

    const subscription = await prisma.subscription.findUnique({
      where: {
        schoolAccountId: targetUser.schoolAccountId,
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "لا يوجد اشتراك مرتبط بهذا الحساب." },
        { status: 404 }
      );
    }

    await prisma.subscription.update({
      where: {
        id: subscription.id,
      },
      data: {
        status: "CANCELED",
        endsAt: new Date(),
      },
    });

    await prisma.serviceAccess.updateMany({
      where: {
        schoolAccountId: targetUser.schoolAccountId,
      },
      data: {
        isEnabled: false,
      },
    });

    await logAdminActivity({
      actorUserId: current.user.id,
      targetUserId: userId,
      schoolAccountId: targetUser.schoolAccountId,
      category: "SUBSCRIPTION",
      action: "cancel-subscription",
      severity: "WARNING",
      title: `تم إلغاء اشتراك حساب ${targetUser.schoolAccount?.name || targetUser.email}`,
      details: {
        targetEmail: targetUser.email,
        subscriptionId: subscription.id,
      },
    });

    return NextResponse.json({
      message: "تم إلغاء الاشتراك وإغلاق الخدمات.",
    });
  }

  return NextResponse.json(
    { error: "إجراء غير معروف." },
    { status: 400 }
  );
}
