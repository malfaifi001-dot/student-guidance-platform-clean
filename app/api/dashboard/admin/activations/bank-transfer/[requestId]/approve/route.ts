import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import {
  assignPlanToSchool,
  getPlanFeatureValue,
} from "@/lib/subscription/subscription-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ requestId: string }> }
) {
  const adminError = await requireAdminApi();

  if (adminError) {
    return adminError;
  }

  const current = await getCurrentSessionUser();

  if (!current?.user) {
    return NextResponse.json({ error: "يجب تسجيل الدخول." }, { status: 401 });
  }

  const { requestId } = await context.params;
  const payload = await request.json().catch(() => null);
  const days = Number(payload?.days || 0);
  const adminNote = String(payload?.adminNote || "").trim();

  const transferRequest = await prisma.bankTransferRequest.findUnique({
    where: {
      id: requestId,
    },
  });

  if (!transferRequest) {
    return NextResponse.json(
      { error: "طلب التحويل غير موجود." },
      { status: 404 }
    );
  }

  if (transferRequest.status !== "PENDING") {
    return NextResponse.json(
      { error: "هذا الطلب تمت معالجته مسبقًا." },
      { status: 400 }
    );
  }

  if (!transferRequest.planId) {
    return NextResponse.json(
      {
        error:
          "هذا الطلب قديم ولا يحتوي على باقة مرتبطة. اطلب من المستخدم اختيار الباقة من صفحة الباقات أو فعّل له باقة يدويًا من إدارة الاشتراكات.",
      },
      { status: 400 }
    );
  }

  const plan = await prisma.plan.findUnique({
    where: {
      id: transferRequest.planId,
    },
    include: {
      features: true,
    },
  });

  if (!plan) {
    return NextResponse.json(
      { error: "الباقة المرتبطة بطلب التحويل غير موجودة." },
      { status: 404 }
    );
  }

  const durationDays =
    days > 0
      ? days
      : transferRequest.durationDays && transferRequest.durationDays > 0
        ? transferRequest.durationDays
        : Number(getPlanFeatureValue(plan.features, "durationDays", "30")) || 30;

  await assignPlanToSchool({
    schoolAccountId: transferRequest.schoolAccountId,
    planId: plan.id,
    days: durationDays,
    status: "ACTIVE",
    activatedById: current.user.id,
    reason: `قبول تحويل بنكي وتفعيل باقة ${plan.name} لمدة ${durationDays} يوم`,
  });

  await prisma.bankTransferRequest.update({
    where: {
      id: transferRequest.id,
    },
    data: {
      status: "PAID",
      adminNote: [
        transferRequest.adminNote || "",
        adminNote ? `ملاحظة الأدمن: ${adminNote}` : "",
        `تم القبول وتفعيل باقة ${plan.name} لمدة ${durationDays} يوم`,
      ]
        .filter(Boolean)
        .join(" | "),
    },
  });

  return NextResponse.json({
    message: `تم قبول التحويل وتفعيل باقة ${plan.name} بنجاح.`,
  });
}
