import { NextResponse } from "next/server";
import { activateSchoolAccount } from "@/lib/activation/activation-service";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { getCurrentSessionUser } from "@/lib/auth/current-user";

export async function POST(request: Request) {
  const adminError = await requireAdminApi();

  if (adminError) {
    return adminError;
  }

  const current = await getCurrentSessionUser();

  if (!current?.user) {
    return NextResponse.json({ error: "يجب تسجيل الدخول." }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);

  const schoolAccountId = String(payload?.schoolAccountId || "").trim();
  const days = Number(payload?.days || 30);
  const reason = String(payload?.reason || "").trim();

  if (!schoolAccountId) {
    return NextResponse.json(
      {
        error: "حساب المدرسة مطلوب للتفعيل.",
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
    message: "تم تفعيل المدرسة بنجاح.",
  });
}
