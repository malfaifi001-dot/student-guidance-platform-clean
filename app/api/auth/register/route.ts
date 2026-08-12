import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { logPlatformActivity } from "@/lib/admin/activity-log";
import { enforceRateLimit } from "@/lib/auth/auth-rate-limit";
import { getRequestDeviceInfo } from "@/lib/auth/current-user";
import { getDashboardHomePath } from "@/lib/auth/dashboard-redirects";
import { registerPublicAccount } from "@/lib/auth/public-registration-service";
import { publicRegistrationSchema } from "@/lib/auth/public-registration-schema";
import {
  createSessionToken,
  createTokenId,
  getSessionCookieOptions,
  getSessionExpiryDate,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { assignDefaultFreePlanIfEligible } from "@/lib/subscription/default-free-plan";

export async function POST(request: Request) {
  try {
    const rawBody = await request.json().catch(() => null);
    const phoneIdentity = String(rawBody?.phone || "").trim();
    const rateLimitResponse = enforceRateLimit(request, {
      namespace: "auth-register",
      identity: phoneIdentity || "register",
      limit: 5,
      windowMs: 30 * 60 * 1000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const parsed = publicRegistrationSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "بيانات التسجيل غير صالحة." },
        { status: 400 },
      );
    }
    const deviceInfo = await getRequestDeviceInfo();
    const tokenId = createTokenId();
    const result = await registerPublicAccount(parsed.data, {
      tokenId,
      expiresAt: getSessionExpiryDate(),
      userAgent: deviceInfo.userAgent,
      ipAddress: deviceInfo.ipAddress,
    });

    try {
      await assignDefaultFreePlanIfEligible({
        schoolAccountId: result.schoolAccount.id,
        userId: result.user.id,
        source: "register",
      });
    } catch (error) {
      console.error("REGISTER_DEFAULT_FREE_PLAN_ERROR", error);
    }

    if (result.user.role === "PRINCIPAL") {
      await logPlatformActivity({
        actorUserId: result.user.id,
        targetUserId: result.user.id,
        schoolAccountId: result.schoolAccount.id,
        category: "AUTH",
        action: "principal-public-registration-completed",
        severity: "SUCCESS",
        title: `اكتمل تسجيل مدير المدرسة ${result.user.phone} من صفحة التسجيل العامة`,
      });
    }

    const response = NextResponse.json({
      success: true,
      message: result.user.role === "PRINCIPAL"
        ? `تم إنشاء حساب ${result.user.gender === "FEMALE" ? "مديرة المدرسة" : "مدير المدرسة"} بنجاح.`
        : "تم إنشاء الحساب بنجاح.",
      redirectTo: getDashboardHomePath(result.user.role),
    });
    response.cookies.set(
      SESSION_COOKIE_NAME,
      createSessionToken({
        userId: result.user.id,
        email: result.user.email,
        role: result.user.role,
        schoolAccountId: result.schoolAccount.id,
        sessionId: result.session.id,
        tokenId,
      }),
      getSessionCookieOptions(),
    );
    return response;
  } catch (error) {
    if (
      (error instanceof Error && error.message === "DUPLICATE_PHONE") ||
      (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
    ) {
      return NextResponse.json({ success: false, error: "رقم الجوال مسجل مسبقًا." }, { status: 409 });
    }
    console.error("REGISTER_ERROR", error);
    return NextResponse.json({ success: false, error: "حدث خطأ أثناء إنشاء الحساب." }, { status: 500 });
  }
}
