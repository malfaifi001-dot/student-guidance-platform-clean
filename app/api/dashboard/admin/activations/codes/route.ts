import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createReadableActivationCode,
  ensureSimpleActivationPlan,
} from "@/lib/activation/activation-service";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { getCurrentSessionUser } from "@/lib/auth/current-user";

export async function GET() {
  const adminError = await requireAdminApi();

  if (adminError) {
    return adminError;
  }

  await ensureSimpleActivationPlan();

  const [codes, requests, subscriptions, schools] = await Promise.all([
    prisma.activationCode.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    }),

    prisma.bankTransferRequest.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    }),

    prisma.subscription.findMany({
      orderBy: {
        updatedAt: "desc",
      },
      take: 50,
      include: {
        schoolAccount: true,
        plan: true,
      },
    }),

    prisma.schoolAccount.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 200,
      select: {
        id: true,
        name: true,
        slug: true,
      },
    }),
  ]);

  return NextResponse.json({
    codes,
    requests,
    subscriptions,
    schools,
  });
}

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

  const durationDays = Number(payload?.durationDays || 30);
  const maxUses = Number(payload?.maxUses || 1);
  const label = String(payload?.label || "").trim();
  const note = String(payload?.note || "").trim();
  const schoolAccountId = String(payload?.schoolAccountId || "").trim();

  const code = String(payload?.code || createReadableActivationCode()).trim().toUpperCase();

  const activationCode = await prisma.activationCode.create({
    data: {
      code,
      label: label || null,
      durationDays: durationDays > 0 ? durationDays : 30,
      maxUses: maxUses > 0 ? maxUses : 1,
      note: note || null,
      schoolAccountId: schoolAccountId || null,
      createdById: current.user.id,
      isActive: true,
    },
  });

  return NextResponse.json({
    message: "تم إنشاء كود التفعيل.",
    activationCode,
  });
}
