import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
type LoginTransactionClient = Pick<typeof prisma, "user" | "userSession">;
import { verifyPassword } from "@/lib/auth/password";
import { getRequestDeviceInfo } from "@/lib/auth/current-user";
import { shouldLimitActiveSessions } from "@/lib/auth/session-policy";
import { enforceRateLimit } from "@/lib/auth/auth-rate-limit";
import { logAuthLoginEvent } from "@/lib/admin/activity-events";
import {
  createSessionToken,
  createTokenId,
  getSessionCookieOptions,
  getSessionExpiryDate,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");

    const rateLimitResponse = enforceRateLimit(request, {
      namespace: "auth-login",
      identity: email,
      limit: 8,
      windowMs: 10 * 60 * 1000,
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        schoolAccountId: true,
        isActive: true,
        onboardingCompleted: true,
        onboardingSkippedAt: true,
      },
    });

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { success: false, error: "بيانات الدخول غير صحيحة." },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: "الحساب غير مفعل." },
        { status: 403 }
      );
    }

    const deviceInfo = await getRequestDeviceInfo();
    const tokenId = createTokenId();
    const expiresAt = getSessionExpiryDate();

    const session = await prisma.$transaction(async (tx: LoginTransactionClient) => {
      if (shouldLimitActiveSessions()) {
        await tx.userSession.updateMany({
          where: {
            userId: user.id,
            isActive: true,
          },
          data: {
            isActive: false,
            revokedAt: new Date(),
          },
        });
      }

      return tx.userSession.create({
        data: {
          userId: user.id,
          tokenId,
          expiresAt,
          userAgent: deviceInfo.userAgent,
          ipAddress: deviceInfo.ipAddress,
        },
      });
    });

    await logAuthLoginEvent({
      userId: user.id,
      schoolAccountId: user.schoolAccountId || null,
      email: user.email,
    });

    const response = NextResponse.json({
      success: true,
      redirectTo:
        user.role === "ADMIN"
          ? "/dashboard/admin"
          : user.onboardingCompleted || user.onboardingSkippedAt
            ? "/dashboard"
            : "/dashboard/onboarding",
    });

    response.cookies.set(
      SESSION_COOKIE_NAME,
      createSessionToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        schoolAccountId: user.schoolAccountId,
        sessionId: session.id,
        tokenId,
      }),
      getSessionCookieOptions()
    );

    return response;
  } catch (error) {
    console.error("LOGIN_ERROR", error);

    return NextResponse.json(
      { success: false, error: "حدث خطأ أثناء تسجيل الدخول." },
      { status: 500 }
    );
  }
}



