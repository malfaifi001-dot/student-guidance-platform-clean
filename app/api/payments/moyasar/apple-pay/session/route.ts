import { request as httpsRequest } from "node:https";
import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { getPublicProviderConfig } from "@/lib/payments/electronic-payments";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MOYASAR_APPLE_PAY_SESSION_URL =
  "https://api.moyasar.com/v1/applepay/initiate";
const APPLE_PAY_SESSION_PATH = "/paymentservices/paymentSession";
const DISPLAY_NAME = "Teachix";
const DOMAIN_NAME = "teachix.sa";

function isAllowedAppleValidationUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const isApplePayGateway =
      hostname === "apple-pay-gateway.apple.com" ||
      (hostname.startsWith("apple-pay-gateway-") &&
        hostname.endsWith(".apple.com"));

    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      isApplePayGateway &&
      url.pathname === APPLE_PAY_SESSION_PATH
    );
  } catch {
    return false;
  }
}

function requestMoyasarApplePaySession(payload: {
  validation_url: string;
  display_name: string;
  domain_name: string;
  publishable_api_key: string;
}) {
  return new Promise<{
    status: number;
    payload: unknown;
  }>((resolve, reject) => {
    const body = JSON.stringify(payload);
    const request = httpsRequest(
      MOYASAR_APPLE_PAY_SESSION_URL,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
        timeout: 15_000,
      },
      (response) => {
        const chunks: Buffer[] = [];

        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          const responseBody = Buffer.concat(chunks).toString("utf8");
          let responsePayload: unknown = null;

          try {
            responsePayload = responseBody ? JSON.parse(responseBody) : null;
          } catch {
            responsePayload = null;
          }

          resolve({
            status: response.statusCode ?? 502,
            payload: responsePayload,
          });
        });
      }
    );

    request.on("timeout", () => {
      request.destroy(new Error("MOYASAR_APPLE_PAY_SESSION_TIMEOUT"));
    });
    request.on("error", reject);
    request.end(body);
  });
}

export async function POST(request: Request) {
  const current = await getCurrentSessionUser();

  if (!current?.user) {
    return NextResponse.json(
      { error: "يجب تسجيل الدخول لإتمام الدفع." },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);
  const validationUrl =
    body && typeof body === "object"
      ? (body as Record<string, unknown>).validation_url
      : null;

  if (!isAllowedAppleValidationUrl(validationUrl)) {
    return NextResponse.json(
      { error: "رابط التحقق من Apple Pay غير صالح." },
      { status: 400 }
    );
  }

  const provider = await prisma.paymentProvider.findUnique({
    where: {
      slug: "moyasar",
    },
    select: {
      isActive: true,
      configJson: true,
    },
  });

  if (!provider?.isActive) {
    return NextResponse.json(
      { error: "مزود الدفع الإلكتروني غير متاح حاليًا." },
      { status: 503 }
    );
  }

  const { publicKey } = getPublicProviderConfig(provider.configJson);

  if (!publicKey || !/^pk_(test|live)_/.test(publicKey)) {
    return NextResponse.json(
      { error: "إعداد Apple Pay غير مكتمل." },
      { status: 503 }
    );
  }

  try {
    const result = await requestMoyasarApplePaySession({
      validation_url: validationUrl,
      display_name: DISPLAY_NAME,
      domain_name: DOMAIN_NAME,
      publishable_api_key: publicKey,
    });

    if (result.status < 200 || result.status >= 300) {
      console.error("MOYASAR_APPLE_PAY_SESSION_FAILED", {
        status: result.status,
      });

      return NextResponse.json(
        { error: "تعذر بدء جلسة Apple Pay. حاول مرة أخرى." },
        { status: 502 }
      );
    }

    if (!result.payload || typeof result.payload !== "object") {
      console.error("MOYASAR_APPLE_PAY_SESSION_INVALID_RESPONSE", {
        status: result.status,
      });

      return NextResponse.json(
        { error: "استجابة Apple Pay غير صالحة." },
        { status: 502 }
      );
    }

    return NextResponse.json(result.payload);
  } catch (error) {
    console.error("MOYASAR_APPLE_PAY_SESSION_REQUEST_FAILED", {
      message: error instanceof Error ? error.message : "UNKNOWN_ERROR",
    });

    return NextResponse.json(
      { error: "تعذر الاتصال بخدمة Apple Pay. حاول مرة أخرى." },
      { status: 502 }
    );
  }
}
