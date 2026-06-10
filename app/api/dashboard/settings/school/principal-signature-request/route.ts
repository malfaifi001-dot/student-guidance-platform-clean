import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

function normalizeSaudiPhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("966")) {
    return digits;
  }

  if (digits.startsWith("05")) {
    return `966${digits.slice(1)}`;
  }

  if (digits.startsWith("5")) {
    return `966${digits}`;
  }

  return digits;
}

export async function POST(request: Request) {
  const current = await getCurrentSessionUser();

  if (!current?.user.schoolAccountId) {
    return NextResponse.json(
      { success: false, error: "يلزم تسجيل الدخول." },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null);
  const principalName = String(body?.principalName || "").trim();
  const principalPhone = String(body?.principalPhone || "").trim();

  if (!principalName || !principalPhone) {
    return NextResponse.json(
      { success: false, error: "اسم المدير ورقم الواتساب مطلوبان." },
      { status: 400 },
    );
  }

  const token = crypto.randomBytes(32).toString("hex");
  const requestedAt = new Date();

  await prisma.schoolProfile.upsert({
    where: {
      schoolAccountId: current.user.schoolAccountId,
    },
    update: {
      principalName,
      principalPhone,
      principalSignatureToken: token,
      principalSignatureRequestedAt: requestedAt,
      principalSignatureSignedAt: null,
    },
    create: {
      schoolAccountId: current.user.schoolAccountId,
      schoolName:
        current.user.schoolAccount?.profile?.schoolName ||
        current.user.schoolAccount?.name ||
        "اسم المدرسة",
      principalName,
      principalPhone,
      principalSignatureToken: token,
      principalSignatureRequestedAt: requestedAt,
      principalSignatureSignedAt: null,
    },
  });

  const origin = new URL(request.url).origin;
  const signatureUrl = `${origin}/school-signature/${token}`;
  const phone = normalizeSaudiPhone(principalPhone);
  const text = encodeURIComponent(
    `السلام عليكم\nفضلاً اعتماد توقيع مدير المدرسة في منصة التوجيه الطلابي عبر الرابط:\n${signatureUrl}`,
  );

  return NextResponse.json({
    success: true,
    token,
    signatureUrl,
    whatsappUrl: `https://wa.me/${phone}?text=${text}`,
    requestedAt: requestedAt.toISOString(),
  });
}