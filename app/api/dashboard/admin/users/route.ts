import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { getRemainingDays, isSubscriptionUsable } from "@/lib/subscription/subscription-service";
import { logAdminActivity } from "@/lib/admin/activity-log";

async function requireAdmin() {
  const current = await getCurrentSessionUser();

  if (!current?.user || current.user.role !== "ADMIN") {
    return null;
  }

  return current;
}

function getSubscriptionStatusLabel(status?: string | null, endsAt?: Date | null) {
  if (!status) return "NO_SUBSCRIPTION";

  if (endsAt && endsAt.getTime() <= Date.now() && status !== "CANCELED") {
    return "EXPIRED";
  }

  return status;
}

export async function GET() {
  const current = await requireAdmin();

  if (!current) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 403 });
  }

  const [users, logs, pendingTransfers] = await Promise.all([
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
      take: 120,
    }),

    prisma.bankTransferRequest.findMany({
      where: {
        status: "PENDING",
      },
      select: {
        schoolAccountId: true,
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

  const mappedUsers = users.map((user) => {
    const subscription = user.schoolAccount?.subscription;
    const computedSubscriptionStatus = getSubscriptionStatusLabel(
      subscription?.status,
      subscription?.endsAt
    );

    const subscriptionUsable = isSubscriptionUsable(
      subscription?.status,
      subscription?.endsAt
    );

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
      lastSeenAt: user.sessions[0]?.lastSeenAt || null,
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
                : "OK",
    };
  });

  const stats = {
    totalUsers: mappedUsers.length,
    counselors: mappedUsers.filter((user) => user.role === "COUNSELOR").length,
    admins: mappedUsers.filter((user) => user.role === "ADMIN").length,
    activeUsers: mappedUsers.filter((user) => user.isActive).length,
    disabledUsers: mappedUsers.filter((user) => !user.isActive).length,
    subscribedUsers: mappedUsers.filter((user) => user.subscription?.usable).length,
    withoutSubscription: mappedUsers.filter((user) => !user.subscription).length,
    needsAttention: mappedUsers.filter((user) => user.riskLevel !== "OK").length,
    pendingTransfers: mappedUsers.reduce(
      (sum, user) => sum + user.pendingTransfersCount,
      0
    ),
  };

  return NextResponse.json({
    stats,
    users: mappedUsers,
    logs,
  });
}

export async function POST(request: Request) {
  const current = await requireAdmin();

  if (!current) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const action = String(payload?.action || "").trim();
  const userId = String(payload?.userId || "").trim();

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

    if (!["ADMIN", "COUNSELOR", "SCHOOL_OWNER", "STAFF"].includes(role)) {
      return NextResponse.json(
        { error: "الدور غير صحيح." },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        role: role as "ADMIN" | "COUNSELOR" | "SCHOOL_OWNER" | "STAFF",
      },
    });

    await logAdminActivity({
      actorUserId: current.user.id,
      targetUserId: userId,
      schoolAccountId: targetUser.schoolAccountId,
      category: "USER",
      action: "set-role",
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
