import {
  PaymentStatus,
  Prisma,
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import {
  applyFailedElectronicPaymentTransaction,
  applyPaidElectronicPaymentTransaction,
  ElectronicPaymentError,
  getWebhookSecret,
} from "@/lib/payments/electronic-payments";
import {
  MoyasarPaymentError,
  retrieveMoyasarPayment,
} from "@/lib/payments/moyasar";
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

function getObject(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function getString(value: unknown) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function getNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function getProviderMode(configJson: unknown) {
  const config = getObject(configJson);

  return getString(config.mode).toUpperCase() || "TEST";
}

async function markEventProcessed(eventId: string) {
  await prisma.webhookEvent.update({
    where: {
      id: eventId,
    },
    data: {
      processed: true,
      processedAt: new Date(),
    },
  });
}

async function handleMoyasarWebhook(
  provider: {
    id: string;
    slug: string;
    configJson: unknown;
  },
  payload: Record<string, unknown>
) {
  const expectedSecret = getWebhookSecret(
    provider.configJson
  );

  if (!expectedSecret) {
    return NextResponse.json(
      {
        error:
          "Webhook Secret الخاص بـ Moyasar غير مضبوط في المنصة.",
      },
      {
        status: 409,
      }
    );
  }

  const receivedSecret = getString(
    payload.secret_token
  );

  if (
    !receivedSecret ||
    receivedSecret !== expectedSecret
  ) {
    await prisma.webhookEvent.create({
      data: {
        providerId: null,
        eventType: "moyasar.unauthorized",
        payloadJson: asJson(payload),
        processed: false,
      },
    });

    return NextResponse.json(
      {
        error: "Webhook secret غير صحيح.",
      },
      {
        status: 401,
      }
    );
  }

  const moyasarEventId = getString(payload.id);
  const moyasarEventType = getString(payload.type);

  if (!moyasarEventId || !moyasarEventType) {
    return NextResponse.json(
      {
        error: "بيانات Webhook من Moyasar غير مكتملة.",
      },
      {
        status: 400,
      }
    );
  }

  const internalEventType =
    `moyasar:${moyasarEventType}:${moyasarEventId}`;

  const existingEvent =
    await prisma.webhookEvent.findFirst({
      where: {
        eventType: internalEventType,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  if (existingEvent?.processed) {
    return NextResponse.json({
      ok: true,
      duplicate: true,
      eventId: existingEvent.id,
    });
  }

  const event =
    existingEvent ||
    (await prisma.webhookEvent.create({
      data: {
        providerId: null,
        eventType: internalEventType,
        payloadJson: asJson(payload),
        processed: false,
      },
    }));

  const mode = getProviderMode(
    provider.configJson
  );

  const webhookIsLive =
    payload.live === true;

  if (
    (mode === "TEST" && webhookIsLive) ||
    (mode === "LIVE" && !webhookIsLive)
  ) {
    return NextResponse.json(
      {
        error:
          "بيئة Webhook لا تطابق بيئة مزود الدفع.",
        eventId: event.id,
      },
      {
        status: 400,
      }
    );
  }

  /*
   * في المرحلة الحالية نهتم بأحداث الدفع الأساسية.
   * أي حدث آخر يتم تسجيله بدون تغيير حالة الاشتراك.
   */
  if (
    moyasarEventType !== "payment_paid" &&
    moyasarEventType !== "payment_failed"
  ) {
    await markEventProcessed(event.id);

    return NextResponse.json({
      ok: true,
      ignored: true,
      eventId: event.id,
      type: moyasarEventType,
    });
  }

  const webhookData = getObject(
    payload.data
  );

  const providerPaymentId = getString(
    webhookData.id
  );

  if (!providerPaymentId) {
    return NextResponse.json(
      {
        error:
          "رقم عملية الدفع غير موجود داخل Webhook.",
        eventId: event.id,
      },
      {
        status: 400,
      }
    );
  }

  /*
   * لا نعتمد على بيانات Webhook وحدها.
   * نجلب العملية مباشرة من Moyasar باستخدام sk_test/sk_live.
   */
  const verifiedPayment =
    await retrieveMoyasarPayment(
      providerPaymentId
    );

  if (
    getString(verifiedPayment.id) !==
    providerPaymentId
  ) {
    return NextResponse.json(
      {
        error:
          "رقم عملية Moyasar لا يطابق العملية المتحققة.",
        eventId: event.id,
      },
      {
        status: 409,
      }
    );
  }

  const metadata = getObject(
    verifiedPayment.metadata
  );

  const transactionId = getString(
    metadata.transactionId
  );

  const transaction =
    await prisma.paymentTransaction.findFirst({
      where: {
        OR: [
          transactionId
            ? {
                id: transactionId,
              }
            : undefined,

          {
            externalRef: providerPaymentId,
          },
        ].filter(
          Boolean
        ) as Prisma.PaymentTransactionWhereInput[],
      },
      include: {
        provider: true,
      },
    });

  if (!transaction) {
    return NextResponse.json(
      {
        error:
          "لم يتم العثور على PaymentTransaction المرتبطة بالعملية.",
        eventId: event.id,
      },
      {
        status: 404,
      }
    );
  }

  if (
    transaction.provider?.slug !==
    "moyasar"
  ) {
    return NextResponse.json(
      {
        error:
          "عملية الدفع مرتبطة بمزود مختلف.",
        eventId: event.id,
      },
      {
        status: 409,
      }
    );
  }

  const moyasarAmount = getNumber(
    verifiedPayment.amount
  );

  const expectedAmount =
    transaction.amount * 100;

  if (moyasarAmount !== expectedAmount) {
    return NextResponse.json(
      {
        error:
          "مبلغ Moyasar لا يطابق مبلغ العملية.",
        eventId: event.id,
      },
      {
        status: 409,
      }
    );
  }

  const moyasarCurrency = getString(
    verifiedPayment.currency
  ).toUpperCase();

  if (
    moyasarCurrency !==
    transaction.currency.toUpperCase()
  ) {
    return NextResponse.json(
      {
        error:
          "عملة Moyasar لا تطابق عملة العملية.",
        eventId: event.id,
      },
      {
        status: 409,
      }
    );
  }

  const verifiedStatus = getString(
    verifiedPayment.status
  ).toLowerCase();

  /*
   * payment_paid
   */
  if (
    moyasarEventType ===
    "payment_paid"
  ) {
    if (verifiedStatus !== "paid") {
      return NextResponse.json(
        {
          error:
            "Moyasar لم تؤكد أن العملية مدفوعة.",
          eventId: event.id,
        },
        {
          status: 409,
        }
      );
    }

    if (
      transaction.externalRef !==
      providerPaymentId
    ) {
      await prisma.paymentTransaction.update({
        where: {
          id: transaction.id,
        },
        data: {
          externalRef:
            providerPaymentId,
        },
      });
    }

    /*
     * الدالة نفسها Idempotent:
     * إذا كانت PAID مسبقًا من Callback فلن تفعّل الاشتراك مرة ثانية.
     */
    const result =
      await applyPaidElectronicPaymentTransaction({
        transactionId:
          transaction.id,
        externalRef:
          providerPaymentId,
        providerSlug:
          "moyasar",
        payload,
      });

    await markEventProcessed(
      event.id
    );

    return NextResponse.json({
      ok: true,
      eventId: event.id,
      result,
    });
  }

  /*
   * payment_failed
   */
  if (
    moyasarEventType ===
    "payment_failed"
  ) {
    /*
     * لو Callback سبق Webhook ونجحت العملية،
     * لا يسمح Webhook فشل متأخر بإرجاعها إلى FAILED.
     */
    if (
      transaction.status ===
      PaymentStatus.PAID
    ) {
      await markEventProcessed(
        event.id
      );

      return NextResponse.json({
        ok: true,
        ignored: true,
        reason:
          "TRANSACTION_ALREADY_PAID",
        eventId: event.id,
      });
    }

    if (
      transaction.externalRef !==
      providerPaymentId
    ) {
      await prisma.paymentTransaction.update({
        where: {
          id: transaction.id,
        },
        data: {
          externalRef:
            providerPaymentId,
        },
      });
    }

    const result =
      await applyFailedElectronicPaymentTransaction({
        transactionId:
          transaction.id,
        externalRef:
          providerPaymentId,
        status: "FAILED",
        providerSlug:
          "moyasar",
        payload,
      });

    await markEventProcessed(
      event.id
    );

    return NextResponse.json({
      ok: true,
      eventId: event.id,
      result,
    });
  }

  await markEventProcessed(
    event.id
  );

  return NextResponse.json({
    ok: true,
    ignored: true,
    eventId: event.id,
  });
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  const {
    provider: providerSlug,
  } = await context.params;

  const provider =
    await prisma.paymentProvider.findUnique({
      where: {
        slug: providerSlug,
      },
    });

  if (
    !provider ||
    !provider.isActive
  ) {
    return NextResponse.json(
      {
        error:
          "مزود الدفع غير متاح.",
      },
      {
        status: 404,
      }
    );
  }

  const payload = (
    await request.json().catch(
      () => ({})
    )
  ) as Record<string, unknown>;

  try {
    if (
      provider.slug === "moyasar"
    ) {
      return await handleMoyasarWebhook(
        provider,
        payload
      );
    }

    return NextResponse.json(
      {
        error:
          "Webhook لهذا المزود غير مدعوم بعد.",
      },
      {
        status: 400,
      }
    );
  } catch (error) {
    if (
      error instanceof
        ElectronicPaymentError ||
      error instanceof
        MoyasarPaymentError
    ) {
      console.error(
        "PAYMENT_WEBHOOK_ERROR",
        error.message
      );

      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: error.status,
        }
      );
    }

    console.error(
      "PAYMENT_WEBHOOK_UNKNOWN_ERROR",
      error
    );

    return NextResponse.json(
      {
        error:
          "تعذر معالجة Webhook.",
      },
      {
        status: 500,
      }
    );
  }
}