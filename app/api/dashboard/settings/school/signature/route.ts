import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireActiveSubscriptionForCurrentUser } from "@/bin/require-auth";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { schoolSignaturePostSchema } from "@/lib/settings/school-settings-api-schema";

export const runtime = "nodejs";

type SignatureKind = "activityLeader" | "counselor";

async function saveSignatureImage(input: {
  schoolAccountId: string;
  kind: SignatureKind;
  dataUrl: string;
}) {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(
    String(input.dataUrl || "").trim(),
  );

  if (!match) {
    return "";
  }

  const buffer = Buffer.from(match[1], "base64");

  if (buffer.length < 200 || buffer.length > 2_000_000) {
    return "";
  }

  const uploadDir = path.join(
    process.cwd(),
    "public",
    "uploads",
    "school-signatures",
    input.schoolAccountId,
  );

  await mkdir(uploadDir, { recursive: true });

  const fileName = `${input.kind}-signature-${Date.now()}.png`;
  const fullPath = path.join(uploadDir, fileName);

  await writeFile(fullPath, buffer);

  return `/uploads/school-signatures/${input.schoolAccountId}/${fileName}`;
}

export async function POST(request: Request) {
  const subscriptionGuard = await requireActiveSubscriptionForCurrentUser();

  if (subscriptionGuard instanceof Response) {
    return subscriptionGuard;
  }

  const current = await getCurrentSessionUser();

  if (!current?.user.schoolAccountId) {
    return NextResponse.json(
      { success: false, error: "يلزم تسجيل الدخول." },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null);
  const payloadResult = schoolSignaturePostSchema.safeParse(body);

  if (!payloadResult.success) {
    return NextResponse.json(
      {
        success: false,
        error:
          payloadResult.error.issues[0]?.message || "بيانات التوقيع غير صالحة.",
      },
      { status: 400 },
    );
  }

  const { kind, dataUrl } = payloadResult.data;

  const signatureUrl = await saveSignatureImage({
    schoolAccountId: current.user.schoolAccountId,
    kind,
    dataUrl,
  });

  if (!signatureUrl) {
    return NextResponse.json(
      {
        success: false,
        error: "تعذر حفظ التوقيع. أعد التوقيع ثم حاول مرة أخرى.",
      },
      { status: 400 },
    );
  }

  const signedAt = new Date();

  await prisma.schoolProfile.upsert({
    where: {
      schoolAccountId: current.user.schoolAccountId,
    },
    update:
      kind === "activityLeader"
        ? {
            activityLeaderSignatureUrl: signatureUrl,
            activityLeaderSignedAt: signedAt,
          }
        : {
            counselorSignatureUrl: signatureUrl,
            counselorSignedAt: signedAt,
          },
    create: {
      schoolAccountId: current.user.schoolAccountId,
      schoolName:
        current.user.schoolAccount?.profile?.schoolName ||
        current.user.schoolAccount?.name ||
        "اسم المدرسة",
      ...(kind === "activityLeader"
        ? {
            activityLeaderSignatureUrl: signatureUrl,
            activityLeaderSignedAt: signedAt,
          }
        : {
            counselorSignatureUrl: signatureUrl,
            counselorSignedAt: signedAt,
          }),
    },
  });

  return NextResponse.json({
    success: true,
    signatureUrl,
    signedAt: signedAt.toISOString(),
  });
}
