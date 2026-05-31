import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSessionUser } from "@/lib/auth/current-user";

export async function POST(request: Request) {
  const current = await getCurrentSessionUser();

  if (!current?.user || current.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);

  const subscriptionId = String(payload?.subscriptionId || "").trim();
  const schoolAccountIdFromPayload = String(payload?.schoolAccountId || "").trim();

  if (!subscriptionId && !schoolAccountIdFromPayload) {
    return NextResponse.json(
      { error: "حدد الحساب أو الاشتراك المراد إلغاء تفعيله." },
      { status: 400 }
    );
  }

  const subscription = subscriptionId
    ? await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: { schoolAccount: true },
      })
    : await prisma.subscription.findUnique({
        where: { schoolAccountId: schoolAccountIdFromPayload },
        include: { schoolAccount: true },
      });

  if (!subscription) {
    return NextResponse.json(
      { error: "لم يتم العثور على اشتراك لهذا الحساب." },
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
      schoolAccountId: subscription.schoolAccountId,
    },
    data: {
      isEnabled: false,
    },
  });

  await prisma.manualActivation.create({
    data: {
      schoolAccountId: subscription.schoolAccountId,
      activatedById: current.user.id,
      reason: `إلغاء تفعيل الحساب: ${subscription.schoolAccount.name}`,
      startsAt: now,
      endsAt: now,
    },
  });

  return NextResponse.json({
    message: "تم إلغاء تفعيل الحساب وإغلاق الخدمات المرتبطة به.",
  });
}
