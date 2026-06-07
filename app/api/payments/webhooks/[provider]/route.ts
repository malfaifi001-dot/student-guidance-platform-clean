import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import {
  applyFailedElectronicPaymentTransaction,
  applyPaidElectronicPaymentTransaction,
  ElectronicPaymentError,
  getWebhookSecret,
} from "@/lib/payments/electronic-payments";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    provider: string;
  }>;
};

function asJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function normalizeStatus(value: unknown) {
  const status = String(value || "").trim().toUpperCase();

  if (["PAID", "SUCCESS", "SUCCEEDED", "CAPTURED"].includes(status)) {
    return "PAID";
  }

  if (["CANCELED", "CANCELLED", "VOIDED"].includes(status)) {
    return "CANCELED";
  }

  if (["FAILED", "DECLINED", "ERROR"].includes(status)) {
    return "FAILED";
  }

  return "UNKNOWN";
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { provider: providerSlug } = await context.params;

  const provider = await prisma.paymentProvider.findUnique({
    where: {
      slug: providerSlug,
    },
  });

  if (!provider || !provider.isActive) {
    return NextResponse.json(
      { error: "مزود الدفع غير متاح." },
      { status: 404 }
    );
  }

  const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const expectedSecret = getWebhookSecret(provider.configJson);
  const receivedSecret =
    request.headers.get("x-payment-webhook-secret") ||
    request.headers.get("x-webhook-secret") ||
    "";

  if (expectedSecret && expectedSecret !== receivedSecret) {
    await prisma.webhookEvent.create({
      data: {
        providerId: null,
        eventType: `payment.${providerSlug}.unauthorized`,
        payloadJson: asJson(payload),
        processed: false,
      },
    });

    return NextResponse.json(
      { error: "Webhook secret غير صحيح." },
      { status: 401 }
    );
  }

  const event = await prisma.webhookEvent.create({
    data: {
      providerId: null,
      eventType: `payment.${providerSlug}.${String(payload.status || "unknown")}`,
      payloadJson: asJson(payload),
      processed: false,
    },
  });

  const transactionId =
    typeof payload.transactionId === "string" ? payload.transactionId : null;
  const externalRef =
    typeof payload.externalRef === "string" ? payload.externalRef : null;
  const status = normalizeStatus(payload.status);

  try {
    let result: unknown;

    if (status === "PAID") {
      result = await applyPaidElectronicPaymentTransaction({
        transactionId,
        externalRef,
        providerSlug,
        payload,
      });
    } else if (status === "FAILED" || status === "CANCELED") {
      result = await applyFailedElectronicPaymentTransaction({
        transactionId,
        externalRef,
        status,
        providerSlug,
        payload,
      });
    } else {
      throw new ElectronicPaymentError("حالة webhook غير مدعومة.", 400);
    }

    await prisma.webhookEvent.update({
      where: {
        id: event.id,
      },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      eventId: event.id,
      result,
    });
  } catch (error) {
    await prisma.webhookEvent.update({
      where: {
        id: event.id,
      },
      data: {
        processed: false,
      },
    });

    if (error instanceof ElectronicPaymentError) {
      return NextResponse.json(
        { error: error.message, eventId: event.id },
        { status: error.status }
      );
    }

    console.error("payment webhook failed", error);

    return NextResponse.json(
      { error: "تعذر معالجة webhook.", eventId: event.id },
      { status: 500 }
    );
  }
}