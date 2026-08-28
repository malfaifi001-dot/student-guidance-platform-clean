import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { hashPasswordResetToken } from "@/lib/auth/password-reset";
import { SESSION_COOKIE_NAME, getSessionCookieOptions } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/auth/auth-rate-limit";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const token = String(body?.token || "").trim();
  const password = String(body?.password || "");
  const confirmation = String(body?.confirmation || "");
  if (!token || password.length < 8 || password !== confirmation) {
    return NextResponse.json({ success: false, error: "بيانات كلمة المرور غير صالحة." }, { status: 400 });
  }

  const tokenHash = hashPasswordResetToken(token);
  const limited = enforceRateLimit(request, { namespace: "auth-reset-password", identity: tokenHash.slice(0, 16), limit: 10, windowMs: 30 * 60 * 1000 });
  if (limited) return limited;
  const now = new Date();
  let result = false;
  try {
    result = await prisma.$transaction(async (tx) => {
      const reset = await tx.passwordResetToken.findFirst({ where: { tokenHash, usedAt: null, expiresAt: { gt: now } }, select: { id: true, userId: true } });
      if (!reset) return false;
      const user = await tx.user.findFirst({ where: { id: reset.userId, isActive: true }, select: { id: true } });
      if (!user) return false;
      const claimed = await tx.passwordResetToken.updateMany({ where: { id: reset.id, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } });
      if (claimed.count !== 1) return false;
      await tx.user.update({ where: { id: reset.userId }, data: { passwordHash: hashPassword(password) } });
      await tx.userSession.updateMany({ where: { userId: reset.userId }, data: { isActive: false, revokedAt: now } });
      return true;
    });
  } catch (error) {
    console.error("PASSWORD_RESET_FAILED", error instanceof Error ? error.message : "unknown");
    result = false;
  }
  if (!result) return NextResponse.json({ success: false, error: "الرابط غير صالح أو منتهي الصلاحية." }, { status: 400 });

  const response = NextResponse.json({ success: true, redirectTo: "/login?password=reset" });
  response.cookies.set(SESSION_COOKIE_NAME, "", { ...getSessionCookieOptions(), maxAge: 0 });
  return response;
}
