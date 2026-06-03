import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { logAdminActivity } from "@/lib/admin/activity-log";

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

function isStrongEnoughPassword(password: string) {
  return password.length >= 8;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const adminError = await requireAdminApi();

  if (adminError) {
    return adminError;
  }

  const current = await getCurrentSessionUser();
  const admin = current?.user;

  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json(
      {
        success: false,
        error: "غير مصرح.",
      },
      { status: 403 }
    );
  }

  const { userId } = await context.params;

  if (admin.id === userId) {
    return NextResponse.json(
      {
        success: false,
        error: "لا يمكن تغيير كلمة مرور حسابك من إدارة المستخدمين. استخدم صفحة الحساب.",
      },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => null);
  const password = String(body?.password || "").trim();

  if (!isStrongEnoughPassword(password)) {
    return NextResponse.json(
      {
        success: false,
        error: "كلمة المرور يجب ألا تقل عن 8 أحرف.",
      },
      { status: 400 }
    );
  }

  const targetUser = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      schoolAccountId: true,
      isActive: true,
    },
  });

  if (!targetUser) {
    return NextResponse.json(
      {
        success: false,
        error: "المستخدم غير موجود.",
      },
      { status: 404 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: {
        id: targetUser.id,
      },
      data: {
        passwordHash: hashPassword(password),
      },
    });

    await tx.userSession.updateMany({
      where: {
        userId: targetUser.id,
        isActive: true,
      },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });
  });

  await logAdminActivity({
    actorUserId: admin.id,
    targetUserId: targetUser.id,
    schoolAccountId: targetUser.schoolAccountId || admin.schoolAccountId || null,
    category: "USER",
    action: "admin-password-reset",
    severity: "WARNING",
    title: `تم تغيير كلمة مرور المستخدم ${targetUser.email}`,
    details: {
      targetEmail: targetUser.email,
      targetRole: targetUser.role,
      targetIsActive: targetUser.isActive,
      sessionsRevoked: true,
    },
  });

  return NextResponse.json({
    success: true,
    message: "تم تغيير كلمة المرور وإلغاء جلسات المستخدم الحالية.",
  });
}
