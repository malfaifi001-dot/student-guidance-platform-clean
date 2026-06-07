import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { getCurrentSessionUser, getRequestDeviceInfo } from "@/lib/auth/current-user";
import { logAdminActivity } from "@/lib/admin/activity-log";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    providerId: string;
  }>;
};

function asJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function getObject(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const adminError = await requireAdminApi();

  if (adminError) {
    return adminError;
  }

  const current = await getCurrentSessionUser();
  const device = await getRequestDeviceInfo();
  const { providerId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const existing = await prisma.paymentProvider.findUnique({
    where: {
      id: providerId,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "مزود الدفع غير موجود." }, { status: 404 });
  }

  const currentConfig = getObject(existing.configJson);

  const provider = await prisma.paymentProvider.update({
    where: {
      id: providerId,
    },
    data: {
      name:
        typeof body.name === "string" && body.name.trim()
          ? body.name.trim()
          : existing.name,
      isActive:
        typeof body.isActive === "boolean" ? body.isActive : existing.isActive,
      configJson: asJson({
        ...currentConfig,
        mode:
          typeof body.mode === "string"
            ? body.mode.toUpperCase()
            : currentConfig.mode || "TEST",
        publicKey:
          typeof body.publicKey === "string"
            ? body.publicKey.trim()
            : currentConfig.publicKey || "",
        secretKey:
          typeof body.secretKey === "string"
            ? body.secretKey.trim()
            : currentConfig.secretKey || "",
        webhookSecret:
          typeof body.webhookSecret === "string"
            ? body.webhookSecret.trim()
            : currentConfig.webhookSecret || "",
        checkoutBaseUrl:
          typeof body.checkoutBaseUrl === "string"
            ? body.checkoutBaseUrl.trim()
            : currentConfig.checkoutBaseUrl || "",
        notes:
          typeof body.notes === "string"
            ? body.notes.trim()
            : currentConfig.notes || "",
      }),
    },
  });

  await logAdminActivity({
    actorUserId: current?.user.id || null,
    category: "PAYMENT",
    action: "PAYMENT_PROVIDER_UPDATED",
    severity: "SUCCESS",
    title: "تعديل مزود دفع إلكتروني",
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
    message: "تم تحديث مزود الدفع بنجاح.",
  });
}