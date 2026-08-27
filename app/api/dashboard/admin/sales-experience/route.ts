import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { logAdminActivity } from "@/lib/admin/activity-log";
import { prisma } from "@/lib/prisma";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import {
  SALES_EXPERIENCE_CONFIG_KEY,
  getGlobalSalesExperienceMode,
  resolveSalesExperienceForUser,
  type SalesExperienceMode,
} from "@/lib/sales/sales-experience";

const PAGE_SIZE = 20;

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const url = new URL(request.url);
  const q = clean(url.searchParams.get("q"));
  const page = Math.max(Number(url.searchParams.get("page") || 1) || 1, 1);
  const where = q
    ? {
        OR: [
          { name: { contains: q } },
          { email: { contains: q } },
        ],
      }
    : {};

  const [globalMode, total, users] = await Promise.all([
    getGlobalSalesExperienceMode(),
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        subscriptions: {
          where: { userId: { not: null } },
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: { status: true, endsAt: true, plan: { select: { name: true } } },
        },
        salesExperienceOverride: { select: { mode: true } },
      },
    }),
  ]);

  return NextResponse.json(
    {
      globalMode,
      page,
      pageSize: PAGE_SIZE,
      total,
      users: users.map((user) => ({
        ...user,
        effectiveMode: user.salesExperienceOverride?.mode || globalMode,
        source: user.salesExperienceOverride ? "USER_OVERRIDE" : "GLOBAL",
        activeSubscription: Boolean(
          user.subscriptions[0] &&
            user.subscriptions[0].status !== "CANCELED" &&
            user.subscriptions[0].status !== "EXPIRED" &&
            user.subscriptions[0].status !== "PAST_DUE" &&
            (!user.subscriptions[0].endsAt ||
              user.subscriptions[0].endsAt > new Date()),
        ),
        subscriptionPlanName: user.subscriptions[0]?.plan?.name || null,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const current = await getCurrentSessionUser();
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const action = clean(body?.action);

  if (action === "set-global") {
    const nextMode: SalesExperienceMode = body?.mode === "BAG" ? "BAG" : "SERVICE";
    const before = await getGlobalSalesExperienceMode();
    await prisma.salesExperienceConfig.upsert({
      where: { singletonKey: SALES_EXPERIENCE_CONFIG_KEY },
      update: { globalMode: nextMode },
      create: { singletonKey: SALES_EXPERIENCE_CONFIG_KEY, globalMode: nextMode },
    });
    await logAdminActivity({
      actorUserId: current?.user?.id || null,
      category: "SUBSCRIPTION",
      action: "sales-experience-global-mode-changed",
      severity: "WARNING",
      title: "تم تغيير وضع تجربة البيع",
      details: { before, after: nextMode },
    });
    return NextResponse.json({ ok: true, globalMode: nextMode });
  }

  const userId = clean(body?.userId);
  if (!userId) return NextResponse.json({ error: "معرّف المستخدم مطلوب." }, { status: 400 });
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true } });
  if (!target) return NextResponse.json({ error: "المستخدم غير موجود." }, { status: 404 });

  if (action === "add-override") {
    await prisma.salesExperienceUserOverride.upsert({
      where: { userId },
      update: { mode: "BAG" },
      create: { userId, mode: "BAG" },
    });
    await logAdminActivity({
      actorUserId: current?.user?.id || null,
      targetUserId: userId,
      category: "SUBSCRIPTION",
      action: "sales-experience-user-override-added",
      severity: "INFO",
      title: "تمت إضافة مستخدم إلى وضع الحقيبة",
      details: { targetEmail: target.email, mode: "BAG" },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "remove-override") {
    const before = await resolveSalesExperienceForUser(userId);
    await prisma.salesExperienceUserOverride.deleteMany({ where: { userId } });
    await logAdminActivity({
      actorUserId: current?.user?.id || null,
      targetUserId: userId,
      category: "SUBSCRIPTION",
      action: "sales-experience-user-override-removed",
      severity: "INFO",
      title: "تمت إزالة وضع الحقيبة عن المستخدم",
      details: { targetEmail: target.email, before: before.effectiveMode },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "الإجراء غير معروف." }, { status: 400 });
}
