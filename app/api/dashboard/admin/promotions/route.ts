import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { logAdminActivity } from "@/lib/admin/activity-log";
import { prisma } from "@/lib/prisma";
import {
  normalizeCouponCode,
  validateCouponCodeFormat,
} from "@/lib/promotions/coupon-service";

function optionalPositiveInt(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function optionalDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET() {
  const adminError = await requireAdminApi();
  if (adminError) return adminError;

  const [plans, promotions, redemptions, redemptionTotals] = await Promise.all([
    prisma.plan.findMany({
      where: { isArchived: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    prisma.promotion.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        plans: { include: { plan: { select: { id: true, name: true } } } },
        coupons: {
          orderBy: { createdAt: "desc" },
          include: { _count: { select: { redemptions: true } } },
        },
        _count: { select: { redemptions: true } },
      },
    }),
    prisma.couponRedemption.findMany({
      take: 100,
      orderBy: { redeemedAt: "desc" },
      include: {
        coupon: { select: { code: true } },
        promotion: { select: { name: true } },
        plan: { select: { name: true } },
        schoolAccount: { select: { name: true } },
      },
    }),
    prisma.couponRedemption.aggregate({
      _count: { _all: true },
      _sum: { discountAmount: true },
    }),
  ]);

  return NextResponse.json({
    plans,
    promotions,
    redemptions,
    metrics: {
      redemptionCount: redemptionTotals._count._all,
      discountTotal: redemptionTotals._sum.discountAmount || 0,
    },
  });
}

export async function POST(request: Request) {
  const adminError = await requireAdminApi();
  if (adminError) return adminError;
  const current = await getCurrentSessionUser();
  if (!current?.user) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const action = String(body?.action || "create-promotion");

  try {
    if (action === "create-promotion") {
      const name = String(body?.name || "").trim();
      const discountType =
        body?.discountType === "FIXED_AMOUNT" ? "FIXED_AMOUNT" : "PERCENTAGE";
      const discountValue = Number(body?.discountValue || 0);
      const startsAt = optionalDate(body?.startsAt);
      const endsAt = optionalDate(body?.endsAt);
      const planIds: string[] = Array.isArray(body?.planIds)
        ? [...new Set<string>(body.planIds.map((value: unknown) => String(value)).filter(Boolean))]
        : [];

      if (!name) return NextResponse.json({ error: "اكتب اسم العرض." }, { status: 400 });
      if (!Number.isInteger(discountValue) || discountValue <= 0 || (discountType === "PERCENTAGE" && discountValue > 100)) {
        return NextResponse.json({ error: "قيمة الخصم غير صحيحة." }, { status: 400 });
      }
      if (startsAt && endsAt && startsAt >= endsAt) {
        return NextResponse.json({ error: "تاريخ نهاية العرض يجب أن يكون بعد بدايته." }, { status: 400 });
      }

      const promotion = await prisma.promotion.create({
        data: {
          name,
          description: String(body?.description || "").trim() || null,
          discountType,
          discountValue,
          startsAt,
          endsAt,
          isActive: body?.isActive !== false,
          totalUsageLimit: optionalPositiveInt(body?.totalUsageLimit),
          perAccountLimit: optionalPositiveInt(body?.perAccountLimit),
          createdById: current.user.id,
          plans: planIds.length
            ? { create: planIds.map((planId) => ({ planId })) }
            : undefined,
        },
      });
      await logAdminActivity({
        actorUserId: current.user.id,
        category: "SUBSCRIPTION",
        action: "PROMOTION_CREATED",
        severity: "SUCCESS",
        title: "إنشاء عرض اشتراك",
        details: { promotionId: promotion.id, name },
      });
      return NextResponse.json({ promotion, message: "تم إنشاء العرض." });
    }

    if (action === "create-coupon") {
      const promotionId = String(body?.promotionId || "").trim();
      const code = normalizeCouponCode(body?.code);
      if (!promotionId || !validateCouponCodeFormat(code)) {
        return NextResponse.json({ error: "استخدم رمزًا من 3 إلى 32 حرفًا أو رقمًا." }, { status: 400 });
      }
      const coupon = await prisma.coupon.create({
        data: {
          promotionId,
          code,
          isActive: body?.isActive !== false,
          usageLimit: optionalPositiveInt(body?.usageLimit),
          expiresAt: optionalDate(body?.expiresAt),
        },
      });
      await logAdminActivity({
        actorUserId: current.user.id,
        category: "SUBSCRIPTION",
        action: "COUPON_CREATED",
        severity: "SUCCESS",
        title: "إنشاء كوبون خصم",
        details: { promotionId, couponId: coupon.id, code },
      });
      return NextResponse.json({ coupon, message: "تم إنشاء الكوبون." });
    }

    if (action === "update-promotion") {
      const promotionId = String(body?.promotionId || "").trim();
      const name = String(body?.name || "").trim();
      const discountType = body?.discountType === "FIXED_AMOUNT" ? "FIXED_AMOUNT" : "PERCENTAGE";
      const discountValue = Number(body?.discountValue || 0);
      const startsAt = optionalDate(body?.startsAt);
      const endsAt = optionalDate(body?.endsAt);
      const planIds: string[] = Array.isArray(body?.planIds)
        ? [...new Set<string>(body.planIds.map((value: unknown) => String(value)).filter(Boolean))]
        : [];
      if (!promotionId || !name || !Number.isInteger(discountValue) || discountValue <= 0 || (discountType === "PERCENTAGE" && discountValue > 100)) {
        return NextResponse.json({ error: "بيانات العرض غير صحيحة." }, { status: 400 });
      }
      if (startsAt && endsAt && startsAt >= endsAt) {
        return NextResponse.json({ error: "تاريخ نهاية العرض يجب أن يكون بعد بدايته." }, { status: 400 });
      }
      const promotion = await prisma.$transaction(async (tx) => {
        await tx.promotionPlan.deleteMany({ where: { promotionId } });
        return tx.promotion.update({
          where: { id: promotionId },
          data: {
            name,
            description: String(body?.description || "").trim() || null,
            discountType,
            discountValue,
            startsAt,
            endsAt,
            totalUsageLimit: optionalPositiveInt(body?.totalUsageLimit),
            perAccountLimit: optionalPositiveInt(body?.perAccountLimit),
            isActive: body?.isActive !== false,
            plans: planIds.length ? { create: planIds.map((planId) => ({ planId })) } : undefined,
          },
        });
      });
      await logAdminActivity({ actorUserId: current.user.id, category: "SUBSCRIPTION", action: "PROMOTION_UPDATED", title: "تحديث عرض اشتراك", details: { promotionId } });
      return NextResponse.json({ promotion, message: "تم تحديث العرض." });
    }

    if (action === "toggle-promotion") {
      const promotionId = String(body?.promotionId || "");
      const promotion = await prisma.promotion.update({
        where: { id: promotionId },
        data: { isActive: Boolean(body?.isActive) },
      });
      return NextResponse.json({ promotion, message: "تم تحديث حالة العرض." });
    }

    if (action === "toggle-coupon") {
      const couponId = String(body?.couponId || "");
      const coupon = await prisma.coupon.update({
        where: { id: couponId },
        data: { isActive: Boolean(body?.isActive) },
      });
      return NextResponse.json({ coupon, message: "تم تحديث حالة الكوبون." });
    }

    return NextResponse.json({ error: "إجراء غير مدعوم." }, { status: 400 });
  } catch (error) {
    console.error("admin promotion action failed", error);
    return NextResponse.json({ error: "تعذر حفظ بيانات العرض أو الكوبون." }, { status: 500 });
  }
}
