import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import {
  assignPlanToSchool,
  getPlanFeatureValue,
} from "@/lib/subscription/subscription-service";

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
  const planId = String(payload?.planId || "").trim();
  const days = Number(payload?.days || 0);
  const reason = String(payload?.reason || "").trim();

  if (!schoolAccountId) {
    return NextResponse.json(
      { error: "اختر الحساب أولًا." },
      { status: 400 }
    );
  }

  if (!planId) {
    return NextResponse.json(
      { error: "اختر الباقة التي تريد تفعيلها للحساب." },
      { status: 400 }
    );
  }

  const plan = await prisma.plan.findUnique({
    where: {
      id: planId,
    },
    include: {
      features: true,
    },
  });

  if (!plan || !plan.isActive) {
    return NextResponse.json(
      { error: "الباقة غير موجودة أو غير مفعلة." },
      { status: 400 }
    );
  }

  const durationDays =
    days > 0
      ? days
      : Number(getPlanFeatureValue(plan.features, "durationDays", "30")) || 30;

  await assignPlanToSchool({
    schoolAccountId,
    planId: plan.id,
    days: durationDays,
    status: "ACTIVE",
    activatedById: current.user.id,
    reason: reason || `تفعيل يدوي لباقة ${plan.name} لمدة ${durationDays} يوم`,
  });

  return NextResponse.json({
    message: `تم تفعيل ${plan.name} للحساب بنجاح.`,
  });
}
