import { NextResponse } from "next/server";
import { activateSchoolAccount } from "@/lib/activation/activation-service";
import { getCurrentSessionUser } from "@/lib/auth/current-user";

export async function POST(request: Request) {
  const current = await getCurrentSessionUser();

  if (!current?.user || current.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);

  const schoolAccountId = String(payload?.schoolAccountId || "").trim();
  const days = Number(payload?.days || 30);
  const reason = String(payload?.reason || "").trim();

  if (!schoolAccountId) {
    return NextResponse.json(
      {
        error: "اختر الحساب المراد تفعيله.",
      },
      {
        status: 400,
      }
    );
  }

  await activateSchoolAccount({
    schoolAccountId,
    days: days > 0 ? days : 30,
    reason: reason || `تفعيل يدوي لمدة ${days || 30} يوم`,
    activatedById: current.user.id,
  });

  return NextResponse.json({
    message: "تم تفعيل الحساب يدويًا.",
  });
}
