import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireActiveSubscriptionForCurrentUser } from "@/bin/require-auth";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { schoolSignaturePostSchema } from "@/lib/settings/school-settings-api-schema";
import {
  getSchoolSignaturePublicUrl,
  writeSchoolSignatureFile,
} from "@/lib/settings/school-signature-file-storage";
import { writeDurableUpload } from "@/lib/storage/durable-upload-storage";
import { processSignatureDataUrl } from "@/lib/signatures/signature-image-processor";

export const runtime = "nodejs";

type SignatureKind = "principal" | "activityLeader" | "counselor" | "teacher";

async function saveSignatureImage(input: {
  schoolAccountId: string;
  userId: string;
  kind: SignatureKind;
  dataUrl: string;
}) {
  const buffer = await processSignatureDataUrl(input.dataUrl);
  if (!buffer) return "";

  const fileName = `${input.kind}-signature-${Date.now()}-${randomUUID()}.png`;

  if (input.kind === "teacher") {
    return writeDurableUpload("user-signatures", input.userId, fileName, new Uint8Array(buffer));
  }

  await writeSchoolSignatureFile(
    input.schoolAccountId,
    fileName,
    new Uint8Array(buffer),
  );

  return getSchoolSignaturePublicUrl(
    input.schoolAccountId,
    fileName,
  );
}

export async function POST(request: Request) {
  const current = await getCurrentSessionUser();

  if (!current?.user.schoolAccountId) {
    return NextResponse.json(
      { success: false, error: "يلزم تسجيل الدخول." },
      { status: 401 },
    );
  }

  if (current.user.role !== "PRINCIPAL") {
    const subscriptionGuard = await requireActiveSubscriptionForCurrentUser();

    if (subscriptionGuard instanceof Response) {
      return subscriptionGuard;
    }
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
    current.user.role === "PRINCIPAL"
      ? "principal"
      : current.user.role === "COUNSELOR"
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
        kind === "principal"
          ? {
              principalSignatureUrl: signatureUrl,
              principalSignatureSignedAt: signedAt,
            }
          : kind === "activityLeader"
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
        ...(kind === "principal"
          ? {
              principalSignatureUrl: signatureUrl,
              principalSignatureSignedAt: signedAt,
            }
          : kind === "activityLeader"
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
