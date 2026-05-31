import { NextResponse } from "next/server";
import { redeemActivationCode } from "@/lib/activation/activation-service";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { logActivationCodeRedeemedEvent } from "@/lib/admin/activity-events";

export async function POST(request: Request) {
  const current = await getCurrentSessionUser();

  if (!current?.user?.id || !current.user.schoolAccountId) {
    return NextResponse.json(
      {
        error: "يجب تسجيل الدخول أولًا.",
      },
      {
        status: 401,
      }
    );
  }

  const payload = await request.json().catch(() => null);
  const code = String(payload?.code || "").trim();

  if (!code) {
    return NextResponse.json(
      {
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

  
    // audit-log:redeem-activation-code
    await logActivationCodeRedeemedEvent({
      userId: current.user.id,
      schoolAccountId: current.user.schoolAccountId,
      code,
    });

if (!result.ok) {
    return NextResponse.json(
      {
        error: result.message,
      },
      {
        status: 400,
      }
    );
  }

  return NextResponse.json({
    message: result.message,
  });
}
