import { prisma } from "@/lib/prisma";

const MOYASAR_API_BASE = "https://api.moyasar.com/v1";

function getObject(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export class MoyasarPaymentError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "MoyasarPaymentError";
    this.status = status;
  }
}

export async function getMoyasarProvider() {
  const provider = await prisma.paymentProvider.findUnique({
    where: {
      slug: "moyasar",
    },
  });

  if (!provider || !provider.isActive) {
    throw new MoyasarPaymentError(
      "مزود Moyasar غير مفعل.",
      404
    );
  }

  const config = getObject(provider.configJson);

  const mode = getString(config.mode).toUpperCase() || "TEST";
  const publicKey = getString(config.publicKey);
  const secretKey = getString(config.secretKey);

  if (!publicKey) {
    throw new MoyasarPaymentError(
      "Publishable Key الخاص بـ Moyasar غير مضبوط.",
      409
    );
  }

  if (!secretKey) {
    throw new MoyasarPaymentError(
      "Secret Key الخاص بـ Moyasar غير مضبوط.",
      409
    );
  }

  if (
    mode === "TEST" &&
    (!publicKey.startsWith("pk_test_") ||
      !secretKey.startsWith("sk_test_"))
  ) {
    throw new MoyasarPaymentError(
      "مفاتيح Moyasar لا تطابق البيئة التجريبية.",
      409
    );
  }

  if (
    mode === "LIVE" &&
    (!publicKey.startsWith("pk_live_") ||
      !secretKey.startsWith("sk_live_"))
  ) {
    throw new MoyasarPaymentError(
      "مفاتيح Moyasar لا تطابق البيئة الفعلية.",
      409
    );
  }

  return {
    provider,
    mode,
    publicKey,
    secretKey,
  };
}

export async function retrieveMoyasarPayment(
  paymentId: string
) {
  if (!paymentId) {
    throw new MoyasarPaymentError(
      "رقم عملية Moyasar غير موجود.",
      400
    );
  }

  const { secretKey } = await getMoyasarProvider();

  const authorization = Buffer.from(
    `${secretKey}:`
  ).toString("base64");

  const response = await fetch(
    `${MOYASAR_API_BASE}/payments/${encodeURIComponent(paymentId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${authorization}`,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    console.error("MOYASAR_RETRIEVE_PAYMENT_FAILED", {
      paymentId,
      status: response.status,
    });

    throw new MoyasarPaymentError(
      "تعذر التحقق من عملية الدفع لدى Moyasar.",
      502
    );
  }

  if (!payload || typeof payload !== "object") {
    throw new MoyasarPaymentError(
      "استجابة Moyasar غير صالحة.",
      502
    );
  }

  return payload as Record<string, unknown>;
}