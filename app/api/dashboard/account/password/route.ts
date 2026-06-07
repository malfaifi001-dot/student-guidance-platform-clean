import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
type AppTransactionClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { logAdminActivity } from "@/lib/admin/activity-log";

type CurrentSessionWithToken = Awaited<ReturnType<typeof getCurrentSessionUser>> & {
  tokenId?: string | null;
};

function isStrongEnoughPassword(password: string) {
  return password.length >= 8;
}

function passwordsMatch(newPassword: string, confirmPassword: string) {
  return newPassword === confirmPassword;
}

export async function POST(request: Request) {
  const current = (await getCurrentSessionUser()) as CurrentSessionWithToken;

  if (!current?.user?.id) {
    return NextResponse.json(
      {
        success: false,
        error: "يجب تسجيل الدخول أولًا.",
        code: "UNAUTHENTICATED",
      },
      { status: 401 }
    );
  }

  const payload = await request.json().catch(() => null);

  const currentPassword = String((payload as any)?.currentPassword || "");
  const newPassword = String((payload as any)?.newPassword || "");
  const confirmPassword = String((payload as any)?.confirmPassword || "");

  if (!currentPassword) {
    return NextResponse.json(
      {
        success: false,
        error: "كلمة المرور الحالية مطلوبة.",
      },
      { status: 400 }
    );
  }

  if (!isStrongEnoughPassword(newPassword)) {
    return NextResponse.json(
      {
        success: false,
        error: "كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف.",
      },
      { status: 400 }
    );
  }

  if (!passwordsMatch(newPassword, confirmPassword)) {
    return NextResponse.json(
      {
        success: false,
        error: "تأكيد كلمة المرور غير مطابق.",
      },
      { status: 400 }
    );
  }

  if (currentPassword === newPassword) {
    return NextResponse.json(
      {
        success: false,
        error: "كلمة المرور الجديدة يجب أن تختلف عن الحالية.",
      },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: {
      id: current.user.id,
    },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      schoolAccountId: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    return NextResponse.json(
      {
        success: false,
        error: "الحساب غير موجود أو غير مفعل.",
      },
      { status: 404 }
    );
  }

  if (!verifyPassword(currentPassword, user.passwordHash)) {
    return NextResponse.json(
      {
        success: false,
        error: "كلمة المرور الحالية غير صحيحة.",
      },
      { status: 400 }
    );
  }

  const currentTokenId = current.tokenId || null;

  const result = await prisma.$transaction(async (tx: AppTransactionClient) => {
    await tx.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordHash: hashPassword(newPassword),
      },
    });

    const revokeWhere = currentTokenId
      ? {
          userId: user.id,
          isActive: true,
          tokenId: {
            not: currentTokenId,
          },
        }
      : {
          userId: user.id,
          isActive: true,
        };

    const revoked = await tx.userSession.updateMany({
      where: revokeWhere,
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });

    return {
      revokedSessionsCount: revoked.count,
    };
  });

  await logAdminActivity({
    actorUserId: user.id,
    targetUserId: user.id,
    schoolAccountId: user.schoolAccountId || null,
    category: "SECURITY",
    action: "account-password-changed",
    severity: "WARNING",
    title: "تم تغيير كلمة مرور الحساب",
    details: {
      revokedOtherSessions: true,
      revokedSessionsCount: result.revokedSessionsCount,
    },
  });

  return NextResponse.json({
    success: true,
    message: "تم تغيير كلمة المرور وإلغاء الجلسات الأخرى.",
    revokedSessionsCount: result.revokedSessionsCount,
  });
}

