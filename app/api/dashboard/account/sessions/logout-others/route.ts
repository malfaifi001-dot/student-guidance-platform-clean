import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { logAdminActivity } from "@/lib/admin/activity-log";

type CurrentSessionWithToken = Awaited<ReturnType<typeof getCurrentSessionUser>> & {
  tokenId?: string | null;
};

export async function POST() {
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

  const currentTokenId = current.tokenId || null;

  if (!currentTokenId) {
    return NextResponse.json(
      {
        success: false,
        error: "تعذر تحديد الجلسة الحالية.",
      },
      { status: 400 }
    );
  }

  const result = await prisma.userSession.updateMany({
    where: {
      userId: current.user.id,
      isActive: true,
      tokenId: {
        not: currentTokenId,
      },
    },
    data: {
      isActive: false,
      revokedAt: new Date(),
    },
  });

  await logAdminActivity({
    actorUserId: current.user.id,
    targetUserId: current.user.id,
    schoolAccountId: current.user.schoolAccountId || null,
    category: "SECURITY",
    action: "account-other-sessions-revoked",
    severity: "INFO",
    title: "تم تسجيل الخروج من الجلسات الأخرى",
    details: {
      revokedSessionsCount: result.count,
    },
  });

  return NextResponse.json({
    success: true,
    message: "تم تسجيل الخروج من الجلسات الأخرى.",
    revokedSessionsCount: result.count,
  });
}
