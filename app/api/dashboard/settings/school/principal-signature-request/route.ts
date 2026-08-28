import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { requireActiveSubscriptionForCurrentUser } from "@/bin/require-auth";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { principalSignatureRequestSchema } from "@/lib/settings/school-settings-api-schema";

function normalizeSaudiPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("966")) return digits;
  if (digits.startsWith("05")) return `966${digits.slice(1)}`;
  if (digits.startsWith("5")) return `966${digits}`;
  return digits;
}

const DEFAULT_PUBLIC_APP_URL = "https://teachix.sa";

function cleanBaseUrl(value: string | undefined) {
  const trimmed = String(value || "").trim().replace(/\/+$/, "");
  return trimmed && /^https?:\/\//i.test(trimmed) ? trimmed : "";
}

function isLocalBaseUrl(value: string) {
  try {
    const hostname = new URL(value).hostname;
    return hostname === "0.0.0.0" || hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return true;
  }
}

function getPublicBaseUrl(request: Request) {
  const envBaseUrl = cleanBaseUrl(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || process.env.SITE_URL);
  if (envBaseUrl && (process.env.NODE_ENV !== "production" || !isLocalBaseUrl(envBaseUrl))) return envBaseUrl;
  const requestBaseUrl = cleanBaseUrl(new URL(request.url).origin);
  if (requestBaseUrl && (process.env.NODE_ENV !== "production" || !isLocalBaseUrl(requestBaseUrl))) return requestBaseUrl;
  return DEFAULT_PUBLIC_APP_URL;
}

export async function POST(request: Request) {
  const current = await getCurrentSessionUser();
  if (!current?.user.schoolAccountId) {
    return NextResponse.json({ success: false, error: "يلزم تسجيل الدخول." }, { status: 401 });
  }
  if (current.user.role === "PRINCIPAL") {
    return NextResponse.json({ success: false, error: "يستخدم مدير المدرسة توقيعه المحفوظ مباشرة في التقارير." }, { status: 403 });
  }

  const subscriptionGuard = await requireActiveSubscriptionForCurrentUser();
  if (subscriptionGuard instanceof Response) return subscriptionGuard;

  const body = await request.json().catch(() => null);
  const payloadResult = principalSignatureRequestSchema.safeParse(body);
  if (!payloadResult.success) {
    return NextResponse.json({ success: false, error: payloadResult.error.issues[0]?.message || "بيانات المدير غير صالحة." }, { status: 400 });
  }

  const { principalName, principalPhone } = payloadResult.data;
  const token = crypto.randomBytes(32).toString("hex");
  const requestedAt = new Date();
  await prisma.schoolProfile.upsert({
    where: { schoolAccountId: current.user.schoolAccountId },
    update: { principalName, principalPhone, principalSignatureToken: token, principalSignatureRequestedAt: requestedAt, principalSignatureSignedAt: null },
    create: {
      schoolAccountId: current.user.schoolAccountId,
      schoolName: current.user.schoolAccount?.profile?.schoolName || current.user.schoolAccount?.name || "اسم المدرسة",
      principalName,
      principalPhone,
      principalSignatureToken: token,
      principalSignatureRequestedAt: requestedAt,
      principalSignatureSignedAt: null,
    },
  });

  const signatureUrl = `${getPublicBaseUrl(request)}/school-signature/${token}`;
  const phone = normalizeSaudiPhone(principalPhone);
  const text = encodeURIComponent(`السلام عليكم،\nفضلًا اعتماد توقيع مدير/مديرة المدرسة في منصة تيتش إكس عبر الرابط:\n${signatureUrl}`);

  return NextResponse.json({
    success: true,
    token,
    signatureUrl,
    whatsappUrl: `https://wa.me/${phone}?text=${text}`,
    requestedAt: requestedAt.toISOString(),
  });
}
