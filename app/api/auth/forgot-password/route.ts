import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/auth/auth-rate-limit";
import { buildPasswordResetUrl, createPasswordResetToken, deliverPasswordResetLink } from "@/lib/auth/password-reset";

const GENERIC_RESPONSE = { success: true, message: "إذا كانت البيانات صحيحة فسيتم إرسال رابط الاستعادة." };

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const identifier = String(body?.identifier || body?.email || "").trim().toLowerCase();
  const limited = enforceRateLimit(request, { namespace: "auth-forgot-password", identity: identifier || "anonymous", limit: 5, windowMs: 30 * 60 * 1000 });
  if (limited) return limited;

  try {
    const user = identifier ? await prisma.user.findFirst({ where: { email: identifier, isActive: true }, select: { id: true, email: true } }) : null;
    if (user) {
      const { rawToken, tokenHash } = createPasswordResetToken();
      await prisma.$transaction([
        prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
        prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 30 * 60 * 1000) } }),
      ]);
      const delivered = await deliverPasswordResetLink({ email: user.email, resetUrl: buildPasswordResetUrl(request, rawToken) });
      if (!delivered && process.env.NODE_ENV === "production") {
        await prisma.passwordResetToken.updateMany({ where: { tokenHash, usedAt: null }, data: { usedAt: new Date() } });
      }
      if (!delivered && process.env.NODE_ENV !== "production") {
        return NextResponse.json({ ...GENERIC_RESPONSE, developmentResetUrl: buildPasswordResetUrl(request, rawToken) });
      }
    }
  } catch (error) {
    console.error("PASSWORD_RESET_REQUEST_FAILED", error instanceof Error ? error.message : "unknown");
  }

  return NextResponse.json(GENERIC_RESPONSE);
}
