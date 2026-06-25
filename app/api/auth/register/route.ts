import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
type AppTransactionClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

import { hashPassword } from "@/lib/auth/password";
import { getRequestDeviceInfo } from "@/lib/auth/current-user";
import { shouldLimitActiveSessions } from "@/lib/auth/session-policy";
import { enforceRateLimit } from "@/lib/auth/auth-rate-limit";
import { getDashboardHomePath } from "@/lib/auth/dashboard-redirects";
import {
  createSessionToken,
  createTokenId,
  getSessionCookieOptions,
  getSessionExpiryDate,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

const KNOWN_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "icloud.com",
  "me.com",
  "proton.me",
  "protonmail.com",
]);

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmailFormat(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hasKnownEmailDomain(value: string) {
  const domain = value.split("@")[1]?.toLowerCase() || "";
  return KNOWN_EMAIL_DOMAINS.has(domain);
}

function createSlugFromName(name: string) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return `${base || "school"}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeAccountRole(value: unknown) {
  if (value === "TEACHER") return "TEACHER";
  return value === "ACTIVITY_LEADER" ? "ACTIVITY_LEADER" : "COUNSELOR";
}

function getJobTitle(role: string, gender: "MALE" | "FEMALE") {
  if (role === "ACTIVITY_LEADER") {
    return gender === "FEMALE" ? "رائدة النشاط" : "رائد النشاط";
  }

  if (role === "TEACHER") {
    return gender === "FEMALE" ? "معلمة" : "معلم";
  }

  return gender === "FEMALE" ? "موجهة طلابية" : "موجه طلابي";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = String(body?.name || "").trim();
    const email = normalizeEmail(body?.email);
    const phone = body?.phone ? String(body.phone).trim() || null : null;
    const password = String(body?.password || "");
    const gender = body?.gender === "FEMALE" ? "FEMALE" : "MALE";
    const role = normalizeAccountRole(body?.accountType);
    const jobTitle = getJobTitle(role, gender);

    const rateLimitResponse = enforceRateLimit(request, {
      namespace: "auth-register",
      identity: email || phone || "register",
      limit: 5,
      windowMs: 30 * 60 * 1000,
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    if (!name || name.length < 3) {
      return NextResponse.json(
        { success: false, error: "الاسم يجب ألا يقل عن 3 أحرف." },
        { status: 400 },
      );
    }

    if (!isValidEmailFormat(email)) {
      return NextResponse.json(
        { success: false, error: "البريد الإلكتروني غير صحيح." },
        { status: 400 },
      );
    }

    if (!hasKnownEmailDomain(email)) {
      return NextResponse.json(
        { success: false, error: "استخدم بريدًا من مزود معروف مثل Gmail أو Outlook أو iCloud." },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل." },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "هذا البريد مسجل مسبقًا." },
        { status: 409 },
      );
    }

    const deviceInfo = await getRequestDeviceInfo();
    const tokenId = createTokenId();
    const expiresAt = getSessionExpiryDate();

    const result = await prisma.$transaction(async (tx: AppTransactionClient) => {
      const schoolAccount = await tx.schoolAccount.create({
        data: {
          name: `مدرسة ${name}`,
          slug: createSlugFromName(name),
        },
      });

      const user = await tx.user.create({
        data: {
          schoolAccountId: schoolAccount.id,
          name,
          officialName: name,
          email,
          phone,
          passwordHash: hashPassword(password),
          role,
          gender,
          jobTitle,
          onboardingCompleted: false,
          onboardingSkippedAt: new Date(),
        },
      });

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

      const session = await tx.userSession.create({
        data: {
          userId: user.id,
          tokenId,
          expiresAt,
          userAgent: deviceInfo.userAgent,
          ipAddress: deviceInfo.ipAddress,
        },
      });

      return { user, schoolAccount, session };
    });

    const response = NextResponse.json({
      success: true,
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
    console.error("REGISTER_ERROR", error);

    return NextResponse.json(
      { success: false, error: "حدث خطأ أثناء إنشاء الحساب." },
      { status: 500 },
    );
  }
}
