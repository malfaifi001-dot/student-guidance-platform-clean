import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSessionUser, getRequestDeviceInfo } from "@/lib/auth/current-user";
import {
  createSessionToken,
  createTokenId,
  getSessionCookieOptions,
  getSessionExpiryDate,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

const ADMIN_RETURN_COOKIE = "admin_impersonation_return_token";

function extractUser(sessionResult: unknown) {
  const value = sessionResult as any;
  return value?.user ?? value?.session?.user ?? value;
}

async function requireAdmin() {
  const sessionResult = await getCurrentSessionUser();
  const user = extractUser(sessionResult);
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json({ success: false, error: "غير مصرح." }, { status: 403 });
  }

  const { userId } = await context.params;

  if (admin.id === userId) {
    return NextResponse.json(
      { success: false, error: "أنت داخل بالفعل بحساب الأدمن." },
      { status: 400 }
    );
  }

  const currentAdminToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!currentAdminToken) {
    return NextResponse.json(
      { success: false, error: "تعذر حفظ جلسة الأدمن الحالية." },
      { status: 400 }
    );
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      schoolAccountId: true,
      isActive: true,
    },
  });

  if (!targetUser || !targetUser.isActive) {
    return NextResponse.json(
      { success: false, error: "لا يمكن الدخول لحساب غير موجود أو غير مفعل." },
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

  const response = NextResponse.json({
    success: true,
    redirectTo: "/dashboard",
  });

  response.cookies.set(
    ADMIN_RETURN_COOKIE,
    currentAdminToken,
    {
      ...getSessionCookieOptions(),
      maxAge: 60 * 60,
    }
  );

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
