import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

  const subscriptionId = String(payload?.subscriptionId || "").trim();
  if (!subscriptionId) {
    return NextResponse.json(
      { error: "رقم الاشتراك أو حساب المدرسة مطلوب لإلغاء الاشتراك." },
      { status: 400 }
    );
  }

  const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: { schoolAccount: true },
      });

  if (!subscription) {
    return NextResponse.json(
      { error: "لم يتم العثور على اشتراك مطابق للطلب." },
      { status: 404 }
    );
  }

  const now = new Date();

  await prisma.subscription.update({
    where: {
      id: subscription.id,
    },
    data: {
      status: "CANCELED",
      endsAt: now,
    },
  });

  await prisma.serviceAccess.updateMany({
    where: {
      userId: subscription.userId || "__missing__",
      isPaid: true,
    },
    data: {
      isEnabled: false,
    },
  });

  await prisma.manualActivation.create({
    data: {
      schoolAccountId: subscription.schoolAccountId,
      userId: subscription.userId,
      activatedById: current.user.id,
      reason: `إلغاء اشتراك المدرسة: ${subscription.schoolAccount.name}`,
      startsAt: now,
      endsAt: now,
    },
  });

  return NextResponse.json({
    message: "تم إلغاء اشتراك المدرسة وتعطيل خدماتها.",
  });
}
