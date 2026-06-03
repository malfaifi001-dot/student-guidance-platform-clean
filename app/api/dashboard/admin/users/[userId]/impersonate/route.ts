import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { logAdminActivity } from "@/lib/admin/activity-log";
import { getCurrentSessionUser, getRequestDeviceInfo } from "@/lib/auth/current-user";
import {
  createSessionToken,
  createTokenId,
  getSessionCookieOptions,
  getSessionExpiryDate,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

const ADMIN_RETURN_COOKIE = "admin_impersonation_return_token";

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

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
        error: "أنت داخل بالفعل بحساب الأدمن.",
      },
      { status: 400 }
    );
  }

  const currentAdminToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!currentAdminToken) {
    return NextResponse.json(
      {
        success: false,
        error: "تعذر حفظ جلسة الأدمن الحالية.",
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
      schoolAccount: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!targetUser || !targetUser.isActive) {
    return NextResponse.json(
      {
        success: false,
        error: "لا يمكن الدخول لحساب غير موجود أو غير مفعل.",
      },
      { status: 400 }
    );
  }

  if (targetUser.role === "ADMIN") {
    return NextResponse.json(
      {
        success: false,
        error: "لا يمكن انتحال حساب أدمن آخر.",
      },
      { status: 400 }
    );
  }

  const deviceInfo = await getRequestDeviceInfo();
  const tokenId = createTokenId();

  const session = await prisma.userSession.create({
    data: {
      userId: targetUser.id,
      tokenId,
      expiresAt: getSessionExpiryDate(),
      userAgent: `ADMIN_IMPERSONATION_BY_${admin.id} | ${deviceInfo.userAgent || ""}`,
      ipAddress: deviceInfo.ipAddress,
    },
  });

  await logAdminActivity({
    actorUserId: admin.id,
    targetUserId: targetUser.id,
    schoolAccountId: targetUser.schoolAccountId || null,
    category: "SECURITY",
    action: "admin-impersonation-started",
    severity: "WARNING",
    title: `بدأ الأدمن انتحال حساب ${targetUser.email}`,
    details: {
      targetEmail: targetUser.email,
      targetRole: targetUser.role,
      targetSchoolAccountId: targetUser.schoolAccountId || null,
      targetSchoolName: targetUser.schoolAccount?.name || null,
      impersonationSessionId: session.id,
    },
    ipAddress: deviceInfo.ipAddress,
    userAgent: deviceInfo.userAgent,
  });

  const response = NextResponse.json({
    success: true,
    redirectTo: "/dashboard",
  });

  response.cookies.set(ADMIN_RETURN_COOKIE, currentAdminToken, {
    ...getSessionCookieOptions(),
    maxAge: 60 * 60,
  });

  response.cookies.set(
    SESSION_COOKIE_NAME,
    createSessionToken({
      userId: targetUser.id,
      email: targetUser.email,
      role: targetUser.role,
      schoolAccountId: targetUser.schoolAccountId,
      sessionId: session.id,
      tokenId,
    }),
    getSessionCookieOptions()
  );

  return response;
}
