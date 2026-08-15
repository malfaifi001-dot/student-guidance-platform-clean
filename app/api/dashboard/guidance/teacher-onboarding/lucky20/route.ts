import { NextResponse } from "next/server";

import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { normalizeCouponCode } from "@/lib/promotions/coupon-service";
import { prisma } from "@/lib/prisma";

const LUCKY20_CODE = normalizeCouponCode("Lucky20");

export async function POST() {
  const current = await getCurrentSessionUser();
  if (!current?.user) {
    return NextResponse.json({ error: "يجب تسجيل الدخول أولًا." }, { status: 401 });
  }
  if (current.user.role !== "TEACHER" || !current.user.schoolAccountId) {
    return NextResponse.json({ error: "هذه المكافأة مخصصة لرحلة المعلم." }, { status: 403 });
  }

  const now = new Date();
  const coupon = await prisma.coupon.findFirst({
    where: {
      code: LUCKY20_CODE,
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      promotion: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
    },
    select: { id: true },
  });

  return NextResponse.json({ earned: Boolean(coupon) });
}
