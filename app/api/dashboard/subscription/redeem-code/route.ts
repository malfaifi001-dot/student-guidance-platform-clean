import { NextResponse } from "next/server";
import { redeemActivationCode } from "@/lib/activation/activation-service";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { enforceRateLimit } from "@/lib/auth/auth-rate-limit";
import { logActivationCodeRedeemedEvent } from "@/lib/admin/activity-events";

export async function POST(request: Request) {
  const current = await getCurrentSessionUser();

  if (!current?.user?.id || !current.user.schoolAccountId) {
    return NextResponse.json(
      {
        success: false,
        error: "يجب تسجيل الدخول أولًا.",
      },
      {
        status: 401,
      }
    );
  }

  const payload = await request.json().catch(() => null);
  const code = String(payload?.code || "").trim();

  const rateLimitResponse = enforceRateLimit(request, {
    namespace: "redeem-activation-code",
    identity: `${current.user.id}:${code}`,
    limit: 6,
    windowMs: 15 * 60 * 1000,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  if (!code) {
    return NextResponse.json(
      {
        success: false,
        error: "أدخل كود التفعيل.",
      },
      {
        status: 400,
      }
    );
  }

  const result = await redeemActivationCode({
    code,
    userId: current.user.id,
    schoolAccountId: current.user.schoolAccountId,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        success: false,
        error: result.message,
      },
      {
        status: 400,
      }
    );
  }

  await logActivationCodeRedeemedEvent({
    userId: current.user.id,
    schoolAccountId: current.user.schoolAccountId,
    code,
  });

  return NextResponse.json({
    success: true,
    message: result.message,
  });
}
