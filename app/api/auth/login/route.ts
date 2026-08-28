import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
type LoginTransactionClient = Pick<typeof prisma, "user" | "userSession">;
import { verifyPassword } from "@/lib/auth/password";
import { getRequestDeviceInfo } from "@/lib/auth/current-user";
import { shouldLimitActiveSessions } from "@/lib/auth/session-policy";
import { enforceRateLimit } from "@/lib/auth/auth-rate-limit";
import { logAuthLoginEvent } from "@/lib/admin/activity-events";
import { getPostLoginRedirectPath } from "@/lib/auth/dashboard-redirects";
import { assignDefaultFreePlanIfEligible } from "@/lib/subscription/default-free-plan";
import {
  createSessionToken,
  createTokenId,
  getSessionCookieOptions,
  getSessionExpiryDate,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import {
  classifyLoginIdentifier,
  normalizeLoginIdentifier,
} from "@/lib/auth/login-identifier";

const INVALID_CREDENTIALS_MESSAGE =
  "البريد الإلكتروني أو رقم الجوال أو كلمة المرور غير صحيحة.";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const rawIdentifier = body?.identifier ?? body?.email;
    const normalizedIdentifier = normalizeLoginIdentifier(rawIdentifier);
    const identifier = classifyLoginIdentifier(normalizedIdentifier);
    const password = String(body?.password || "");
    const loginPath = String(body?.loginPath || "").trim();
    const nextPath = body?.next;

    const rateLimitResponse = enforceRateLimit(request, {
      namespace: "auth-login",
      identity: normalizedIdentifier,
      limit: 8,
      windowMs: 10 * 60 * 1000,
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    if (!identifier) {
      return NextResponse.json(
        { success: false, error: INVALID_CREDENTIALS_MESSAGE },
        { status: 401 },
      );
    }

    const userSelect = {
        id: true,
        email: true,
        phone: true,
        passwordHash: true,
        role: true,
        schoolAccountId: true,
        isActive: true,
        onboardingCompleted: true,
        onboardingSkippedAt: true,
      } as const;

    const user = identifier.kind === "email"
      ? await prisma.user.findUnique({
          where: { email: identifier.value },
          select: userSelect,
        })
      : await (async () => {
          const matches = await prisma.user.findMany({
            where: { phone: identifier.value },
            select: userSelect,
            take: 2,
          });
          return matches.length === 1 ? matches[0] : null;
        })();

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { success: false, error: INVALID_CREDENTIALS_MESSAGE },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: "الحساب غير مفعل." },
        { status: 403 }
      );
    }

    if (loginPath === "teacher" && user.role !== "TEACHER") {
      return NextResponse.json(
        { success: false, error: "هذا المسار مخصص لحسابات المعلمين فقط." },
        { status: 403 }
      );
    }

    const deviceInfo = await getRequestDeviceInfo();
    const tokenId = createTokenId();
    const expiresAt = getSessionExpiryDate();

    if (user.role !== "ADMIN" && user.schoolAccountId) {
      try {
        await assignDefaultFreePlanIfEligible({
          schoolAccountId: user.schoolAccountId,
          userId: user.id,
          source: "login",
        });
      } catch (error) {
        console.error("LOGIN_DEFAULT_FREE_PLAN_ERROR", error);
      }
    }

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
      redirectTo: getPostLoginRedirectPath({ ...user, nextPath }),
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
