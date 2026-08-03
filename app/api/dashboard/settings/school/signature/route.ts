import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireActiveSubscriptionForCurrentUser } from "@/bin/require-auth";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { schoolSignaturePostSchema } from "@/lib/settings/school-settings-api-schema";

export const runtime = "nodejs";

type SignatureKind = "activityLeader" | "counselor" | "teacher";

async function saveSignatureImage(input: {
  schoolAccountId: string;
  userId: string;
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

  const relativeDirectory =
    input.kind === "teacher"
      ? path.join("user-signatures", input.userId)
      : path.join("school-signatures", input.schoolAccountId);
  const uploadDir = path.join(
    process.cwd(),
    "public",
    "uploads",
    relativeDirectory,
  );

  await mkdir(uploadDir, { recursive: true });

  const fileName = `${input.kind}-signature-${Date.now()}-${randomUUID()}.png`;
  const fullPath = path.join(uploadDir, fileName);

  await writeFile(fullPath, buffer);

  return `/uploads/${relativeDirectory.replaceAll(path.sep, "/")}/${fileName}`;
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
  const expectedKind: SignatureKind | null =
    current.user.role === "COUNSELOR"
      ? "counselor"
      : current.user.role === "ACTIVITY_LEADER"
        ? "activityLeader"
        : current.user.role === "TEACHER"
          ? "teacher"
        : null;

  if (!expectedKind || kind !== expectedKind) {
    return NextResponse.json(
      {
        success: false,
        error: "لا يتوفر حقل توقيع مخصص لهذا الدور حاليًا.",
      },
      { status: 403 },
    );
  }

  const signatureUrl = await saveSignatureImage({
    schoolAccountId: current.user.schoolAccountId,
    userId: current.user.id,
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

  if (kind === "teacher") {
    await prisma.user.update({
      where: {
        id: current.user.id,
        schoolAccountId: current.user.schoolAccountId,
      },
      data: {
        signatureUrl,
        signatureSignedAt: signedAt,
      },
    });
  } else {
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
  }

  return NextResponse.json({
    success: true,
    signatureUrl,
    signedAt: signedAt.toISOString(),
  });
}
