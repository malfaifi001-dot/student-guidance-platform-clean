import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { getCurrentSessionUser, getRequestDeviceInfo } from "@/lib/auth/current-user";
import { logAdminActivity } from "@/lib/admin/activity-log";
import { prisma } from "@/lib/prisma";

function asJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function normalizeSlug(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildConfig(body: Record<string, unknown>) {
  return asJson({
    mode: String(body.mode || "TEST").toUpperCase(),
    publicKey: String(body.publicKey || "").trim(),
    secretKey: String(body.secretKey || "").trim(),
    webhookSecret: String(body.webhookSecret || "").trim(),
    checkoutBaseUrl: String(body.checkoutBaseUrl || "").trim(),
    notes: String(body.notes || "").trim(),
  });
}

export async function GET() {
  const adminError = await requireAdminApi();

  if (adminError) {
    return adminError;
  }

  const providers = await prisma.paymentProvider.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json({
    providers,
  });
}

export async function POST(request: NextRequest) {
  const adminError = await requireAdminApi();

  if (adminError) {
    return adminError;
  }

  const current = await getCurrentSessionUser();
  const device = await getRequestDeviceInfo();
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const name = String(body.name || "").trim();
  const slug = normalizeSlug(body.slug);
  const isActive = Boolean(body.isActive);

  if (!name) {
    return NextResponse.json({ error: "اسم مزود الدفع مطلوب." }, { status: 400 });
  }

  if (!slug) {
    return NextResponse.json({ error: "رمز مزود الدفع مطلوب." }, { status: 400 });
  }

  const provider = await prisma.paymentProvider.upsert({
    where: {
      slug,
    },
    update: {
      name,
      isActive,
      configJson: buildConfig(body),
    },
    create: {
      name,
      slug,
      isActive,
      configJson: buildConfig(body),
    },
  });

  await logAdminActivity({
    actorUserId: current?.user.id || null,
    category: "PAYMENT",
    action: "PAYMENT_PROVIDER_UPSERTED",
    severity: "SUCCESS",
    title: "حفظ مزود دفع إلكتروني",
    details: {
      providerId: provider.id,
      name: provider.name,
      slug: provider.slug,
      isActive: provider.isActive,
    },
    ipAddress: device.ipAddress,
    userAgent: device.userAgent,
  });

  return NextResponse.json({
    provider,
    message: "تم حفظ مزود الدفع بنجاح.",
  });
}