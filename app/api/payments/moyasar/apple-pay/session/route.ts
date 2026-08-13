import { randomUUID } from "node:crypto";
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
const DIAGNOSTIC_HEADER = "X-Teachix-ApplePay-Diagnostic-Id";

type MoyasarSessionResult = {
  status: number;
  payload: unknown;
  contentType: string;
  bodyLength: number;
  parsed: boolean;
};

function diagnosticResponse(
  diagnosticId: string,
  body: unknown,
  init?: { status?: number },
) {
  return NextResponse.json(body, {
    ...init,
    headers: { [DIAGNOSTIC_HEADER]: diagnosticId },
  });
}

function getSafeTopLevelKeys(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.keys(value as Record<string, unknown>).slice(0, 30)
    : [];
}

function getSafeDiagnosticText(value: unknown) {
  if (typeof value !== "string") return undefined;
  return value
    .slice(0, 240)
    .replace(/https?:\/\/\S+/gi, "[URL_REDACTED]")
    .replace(/(?:pk|sk)_(?:live|test)_[A-Za-z0-9_-]+/g, "[KEY_REDACTED]")
    .replace(
      /(paymentData|encryptedData|ephemeralPublicKey|transactionId|merchantSessionIdentifier|nonce|epochTimestamp|signature)\s*[:=]\s*["']?[^,\s}"']+/gi,
      "$1=[REDACTED]",
    );
}

function getSafeMoyasarError(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }

  const record = payload as Record<string, unknown>;
  const error =
    record.error && typeof record.error === "object" && !Array.isArray(record.error)
      ? (record.error as Record<string, unknown>)
      : null;

  return {
    safeErrorMessage: getSafeDiagnosticText(
      record.message ?? error?.message ?? (typeof record.error === "string" ? record.error : undefined),
    ),
    safeErrorType: getSafeDiagnosticText(record.type ?? error?.type),
    safeErrorCode: getSafeDiagnosticText(record.code ?? error?.code),
  };
}

function parseAppleValidationUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isAllowedAppleValidationUrl(url: URL | null) {
  if (!url) return false;
  const hostname = url.hostname.toLowerCase();
  const isApplePayGateway =
    hostname === "apple-pay-gateway.apple.com" ||
    (hostname.startsWith("apple-pay-gateway-") && hostname.endsWith(".apple.com"));

  return (
    url.protocol === "https:" &&
    !url.username &&
    !url.password &&
    !url.port &&
    isApplePayGateway &&
    url.pathname === APPLE_PAY_SESSION_PATH
  );
}

function requestMoyasarApplePaySession(payload: {
  validation_url: string;
  display_name: string;
  domain_name: string;
  publishable_api_key: string;
}) {
  return new Promise<MoyasarSessionResult>((resolve, reject) => {
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
          let parsed = false;

          try {
            responsePayload = responseBody ? JSON.parse(responseBody) : null;
            parsed = Boolean(responseBody);
          } catch {
            responsePayload = null;
          }

          resolve({
            status: response.statusCode ?? 502,
            payload: responsePayload,
            contentType: String(response.headers["content-type"] || "unknown").slice(0, 120),
            bodyLength: Buffer.byteLength(responseBody),
            parsed,
          });
        });
      },
    );

    request.on("timeout", () => {
      request.destroy(new Error("MOYASAR_APPLE_PAY_SESSION_TIMEOUT"));
    });
    request.on("error", reject);
    request.end(body);
  });
}

export async function POST(request: Request) {
  const diagnosticId = randomUUID().slice(0, 8);
  const current = await getCurrentSessionUser();
  const authenticated = Boolean(current?.user);

  console.info("APPLE_PAY_DIAG_REQUEST_RECEIVED", {
    diagnosticId,
    authenticated,
    providerSlug: "moyasar",
    timestamp: new Date().toISOString(),
    origin: getSafeDiagnosticText(request.headers.get("origin")),
    host: getSafeDiagnosticText(request.headers.get("host")),
    userAgent: getSafeDiagnosticText(request.headers.get("user-agent"))?.slice(0, 160),
  });

  if (!current?.user) {
    return diagnosticResponse(
      diagnosticId,
      { error: "يجب تسجيل الدخول لإتمام الدفع." },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null);
  const validationUrlValue =
    body && typeof body === "object"
      ? (body as Record<string, unknown>).validation_url
      : null;
  const validationUrl = parseAppleValidationUrl(validationUrlValue);
  const isAllowed = isAllowedAppleValidationUrl(validationUrl);

  console.info("APPLE_PAY_DIAG_VALIDATION_URL", {
    diagnosticId,
    hasValidationUrl: typeof validationUrlValue === "string" && Boolean(validationUrlValue.trim()),
    protocol: validationUrl?.protocol || null,
    hostname: validationUrl?.hostname || null,
    pathname: validationUrl?.pathname || null,
    isAllowed,
  });

  if (!validationUrl || !isAllowed || typeof validationUrlValue !== "string") {
    console.warn("APPLE_PAY_DIAG_VALIDATION_REJECTED", { diagnosticId });
    return diagnosticResponse(
      diagnosticId,
      { error: "رابط التحقق من Apple Pay غير صالح." },
      { status: 400 },
    );
  }

  const provider = await prisma.paymentProvider.findUnique({
    where: { slug: "moyasar" },
    select: { isActive: true, configJson: true },
  });
  const config = getPublicProviderConfig(provider?.configJson);
  const configuredMode = config.mode.toUpperCase();
  const publicKeyPrefix = config.publicKey.startsWith("pk_live_")
    ? "pk_live"
    : config.publicKey.startsWith("pk_test_")
      ? "pk_test"
      : "unknown";

  console.info("APPLE_PAY_DIAG_PROVIDER", {
    diagnosticId,
    providerFound: Boolean(provider),
    isActive: Boolean(provider?.isActive),
    configuredMode,
    publicKeyPrefix,
    hasPublicKey: Boolean(config.publicKey),
  });

  const modeKeyMismatch =
    (configuredMode === "LIVE" && publicKeyPrefix === "pk_test") ||
    (configuredMode === "TEST" && publicKeyPrefix === "pk_live");
  if (modeKeyMismatch) {
    console.error("APPLE_PAY_DIAG_MODE_KEY_MISMATCH", {
      diagnosticId,
      configuredMode,
      publicKeyPrefix,
    });
  }

  if (!provider?.isActive) {
    return diagnosticResponse(
      diagnosticId,
      { error: "مزود الدفع الإلكتروني غير متاح حاليًا." },
      { status: 503 },
    );
  }

  if (!config.publicKey || publicKeyPrefix === "unknown") {
    return diagnosticResponse(
      diagnosticId,
      { error: "إعداد Apple Pay غير مكتمل." },
      { status: 503 },
    );
  }

  console.info("APPLE_PAY_DIAG_MOYASAR_REQUEST", {
    diagnosticId,
    method: "GET",
    endpointPath: "/v1/applepay/initiate",
    domain_name: DOMAIN_NAME,
    display_name: DISPLAY_NAME,
    validationHostname: validationUrl.hostname,
    validationPath: validationUrl.pathname,
  });

  try {
    const result = await requestMoyasarApplePaySession({
      validation_url: validationUrlValue,
      display_name: DISPLAY_NAME,
      domain_name: DOMAIN_NAME,
      publishable_api_key: config.publicKey,
    });
    const topLevelKeys = getSafeTopLevelKeys(result.payload);

    if (result.status < 200 || result.status >= 300) {
      console.error("APPLE_PAY_DIAG_MOYASAR_ERROR", {
        diagnosticId,
        status: result.status,
        contentType: result.contentType,
        bodyLength: result.bodyLength,
        parsed: result.parsed,
        topLevelKeys,
        ...getSafeMoyasarError(result.payload),
      });
      return diagnosticResponse(
        diagnosticId,
        { error: "تعذر بدء جلسة Apple Pay. حاول مرة أخرى." },
        { status: 502 },
      );
    }

    if (!result.payload || typeof result.payload !== "object" || Array.isArray(result.payload)) {
      console.error("APPLE_PAY_DIAG_MOYASAR_ERROR", {
        diagnosticId,
        status: result.status,
        contentType: result.contentType,
        bodyLength: result.bodyLength,
        parsed: result.parsed,
        topLevelKeys,
        safeErrorCode: "INVALID_RESPONSE_SHAPE",
      });
      return diagnosticResponse(
        diagnosticId,
        { error: "استجابة Apple Pay غير صالحة." },
        { status: 502 },
      );
    }

    const session = result.payload as Record<string, unknown>;
    console.info("APPLE_PAY_DIAG_MOYASAR_SUCCESS", {
      diagnosticId,
      status: result.status,
      contentType: result.contentType,
      bodyLength: result.bodyLength,
      parsed: result.parsed,
      topLevelKeys,
      hasMerchantIdentifier: Boolean(session.merchantIdentifier),
      hasMerchantSessionIdentifier: Boolean(session.merchantSessionIdentifier),
      hasEpochTimestamp: Boolean(session.epochTimestamp),
      hasSignature: Boolean(session.signature),
    });

    return diagnosticResponse(diagnosticId, result.payload);
  } catch (error) {
    console.error("APPLE_PAY_DIAG_MOYASAR_ERROR", {
      diagnosticId,
      status: null,
      contentType: null,
      bodyLength: 0,
      parsed: false,
      topLevelKeys: [],
      safeErrorMessage: getSafeDiagnosticText(
        error instanceof Error ? error.message : "UNKNOWN_ERROR",
      ),
      safeErrorType: error instanceof Error ? error.name : "UNKNOWN_ERROR",
    });
    return diagnosticResponse(
      diagnosticId,
      { error: "تعذر الاتصال بخدمة Apple Pay. حاول مرة أخرى." },
      { status: 502 },
    );
  }
}
