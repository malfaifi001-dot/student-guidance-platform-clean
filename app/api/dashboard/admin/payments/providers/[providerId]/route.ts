import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import {
  getCurrentSessionUser,
  getRequestDeviceInfo,
} from "@/lib/auth/current-user";
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
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeProviderConfig(configJson: unknown) {
  const config = getObject(configJson);

  return {
    mode: getString(config.mode) || "TEST",
    publicKey: getString(config.publicKey),
    checkoutBaseUrl: getString(config.checkoutBaseUrl),
    notes: getString(config.notes),

    hasSecretKey: Boolean(getString(config.secretKey)),
    hasWebhookSecret: Boolean(getString(config.webhookSecret)),
  };
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  const adminError = await requireAdminApi();

  if (adminError) {
    return adminError;
  }

  const current = await getCurrentSessionUser();
  const device = await getRequestDeviceInfo();

  const { providerId } = await context.params;

  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  const existing = await prisma.paymentProvider.findUnique({
    where: {
      id: providerId,
    },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "مزود الدفع غير موجود." },
      { status: 404 }
    );
  }

  const currentConfig = getObject(existing.configJson);

  const requestedMode =
    typeof body.mode === "string"
      ? body.mode.trim().toUpperCase()
      : getString(currentConfig.mode) || "TEST";

  const nextPublicKey =
    typeof body.publicKey === "string"
      ? body.publicKey.trim()
      : getString(currentConfig.publicKey);

  const incomingSecretKey =
    typeof body.secretKey === "string"
      ? body.secretKey.trim()
      : "";

  const incomingWebhookSecret =
    typeof body.webhookSecret === "string"
      ? body.webhookSecret.trim()
      : "";

  const nextSecretKey =
    incomingSecretKey || getString(currentConfig.secretKey);

  const nextWebhookSecret =
    incomingWebhookSecret || getString(currentConfig.webhookSecret);

  if (existing.slug === "moyasar") {
    if (requestedMode === "TEST") {
      if (nextPublicKey && !nextPublicKey.startsWith("pk_test_")) {
        return NextResponse.json(
          { error: "في البيئة التجريبية يجب استخدام pk_test_." },
          { status: 400 }
        );
      }

      if (nextSecretKey && !nextSecretKey.startsWith("sk_test_")) {
        return NextResponse.json(
          { error: "في البيئة التجريبية يجب استخدام sk_test_." },
          { status: 400 }
        );
      }
    }

    if (requestedMode === "LIVE") {
      if (nextPublicKey && !nextPublicKey.startsWith("pk_live_")) {
        return NextResponse.json(
          { error: "في البيئة الفعلية يجب استخدام pk_live_." },
          { status: 400 }
        );
      }

      if (nextSecretKey && !nextSecretKey.startsWith("sk_live_")) {
        return NextResponse.json(
          { error: "في البيئة الفعلية يجب استخدام sk_live_." },
          { status: 400 }
        );
      }
    }
  }

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
        typeof body.isActive === "boolean"
          ? body.isActive
          : existing.isActive,

      configJson: asJson({
        ...currentConfig,

        mode: requestedMode,

        publicKey: nextPublicKey,

        secretKey: nextSecretKey,

        webhookSecret: nextWebhookSecret,

        checkoutBaseUrl:
          typeof body.checkoutBaseUrl === "string"
            ? body.checkoutBaseUrl.trim()
            : getString(currentConfig.checkoutBaseUrl),

        notes:
          typeof body.notes === "string"
            ? body.notes.trim()
            : getString(currentConfig.notes),
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
      mode: requestedMode,
      secretKeyConfigured: Boolean(nextSecretKey),
      webhookSecretConfigured: Boolean(nextWebhookSecret),
    },
    ipAddress: device.ipAddress,
    userAgent: device.userAgent,
  });

  return NextResponse.json({
    provider: {
      ...provider,
      configJson: sanitizeProviderConfig(provider.configJson),
    },
    message: "تم تحديث مزود الدفع بنجاح.",
  });
}