import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireActiveSubscriptionForCurrentUser } from "@/bin/require-auth";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { schoolSignaturePostSchema } from "@/lib/settings/school-settings-api-schema";
import { getSchoolSignaturePublicUrl, writeSchoolSignatureFile } from "@/lib/settings/school-signature-file-storage";
import { writeDurableUpload } from "@/lib/storage/durable-upload-storage";
import { processSignatureDataUrl, processUploadedSignature } from "@/lib/signatures/signature-image-processor";

export const runtime = "nodejs";

type SignatureKind = "principal" | "activityLeader" | "counselor" | "teacher";

async function saveSignatureImage(input: { schoolAccountId: string; userId: string; kind: SignatureKind; buffer: Buffer }) {
  const fileName = `${input.kind}-signature-${Date.now()}-${randomUUID()}.png`;
  if (input.kind === "teacher") return writeDurableUpload("user-signatures", input.userId, fileName, new Uint8Array(input.buffer));
  await writeSchoolSignatureFile(input.schoolAccountId, fileName, new Uint8Array(input.buffer));
  return getSchoolSignaturePublicUrl(input.schoolAccountId, fileName);
}

export async function POST(request: Request) {
  const current = await getCurrentSessionUser();
  if (!current?.user.schoolAccountId) return NextResponse.json({ success: false, error: "يجب تسجيل الدخول." }, { status: 401 });
  if (current.user.role !== "PRINCIPAL") {
    const subscriptionGuard = await requireActiveSubscriptionForCurrentUser();
    if (subscriptionGuard instanceof Response) return subscriptionGuard;
  }

  const contentType = request.headers.get("content-type") || "";
  let kind: SignatureKind;
  let processed: Buffer | null;
  let previewOnly = false;

  if (contentType.toLowerCase().includes("multipart/form-data")) {
    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");
    kind = String(formData?.get("kind") || "") as SignatureKind;
    previewOnly = formData?.get("preview") === "true";
    if (!(file instanceof File)) return NextResponse.json({ success: false, error: "اختر صورة التوقيع أولًا." }, { status: 400 });
    if (file.size > 2_000_000) return NextResponse.json({ success: false, error: "حجم صورة التوقيع يجب ألا يتجاوز 2 ميجابايت." }, { status: 400 });
    processed = await processUploadedSignature(Buffer.from(await file.arrayBuffer()), file.type);
  } else {
    const body = await request.json().catch(() => null);
    const payloadResult = schoolSignaturePostSchema.safeParse(body);
    if (!payloadResult.success) return NextResponse.json({ success: false, error: payloadResult.error.issues[0]?.message || "بيانات التوقيع غير صالحة." }, { status: 400 });
    kind = payloadResult.data.kind;
    processed = await processSignatureDataUrl(payloadResult.data.dataUrl);
  }

  const expectedKind: SignatureKind | null = current.user.role === "PRINCIPAL" ? "principal" : current.user.role === "COUNSELOR" ? "counselor" : current.user.role === "ACTIVITY_LEADER" ? "activityLeader" : current.user.role === "TEACHER" ? "teacher" : null;
  if (!expectedKind || kind !== expectedKind) return NextResponse.json({ success: false, error: "لا يتوفر حقل توقيع مخصص لهذا الدور حاليًا." }, { status: 403 });
  if (!processed) return NextResponse.json({ success: false, error: "صورة التوقيع غير صالحة أو تعذر معالجتها." }, { status: 400 });
  if (previewOnly) return NextResponse.json({ success: true, previewDataUrl: `data:image/png;base64,${processed.toString("base64")}` });

  const signatureUrl = await saveSignatureImage({ schoolAccountId: current.user.schoolAccountId, userId: current.user.id, kind, buffer: processed });
  if (!signatureUrl) return NextResponse.json({ success: false, error: "تعذر حفظ التوقيع. أعد المحاولة." }, { status: 400 });
  const signedAt = new Date();

  if (kind === "teacher") {
    await prisma.user.update({ where: { id: current.user.id, schoolAccountId: current.user.schoolAccountId }, data: { signatureUrl, signatureSignedAt: signedAt } });
  } else {
    await prisma.schoolProfile.upsert({
      where: { schoolAccountId: current.user.schoolAccountId },
      update: kind === "principal" ? { principalSignatureUrl: signatureUrl, principalSignatureSignedAt: signedAt } : kind === "activityLeader" ? { activityLeaderSignatureUrl: signatureUrl, activityLeaderSignedAt: signedAt } : { counselorSignatureUrl: signatureUrl, counselorSignedAt: signedAt },
      create: { schoolAccountId: current.user.schoolAccountId, schoolName: current.user.schoolAccount?.profile?.schoolName || current.user.schoolAccount?.name || "اسم المدرسة", principalSignatureReusePolicy: "ALL_STAFF", ...(kind === "principal" ? { principalSignatureUrl: signatureUrl, principalSignatureSignedAt: signedAt } : kind === "activityLeader" ? { activityLeaderSignatureUrl: signatureUrl, activityLeaderSignedAt: signedAt } : { counselorSignatureUrl: signatureUrl, counselorSignedAt: signedAt }) },
    });
  }
  return NextResponse.json({ success: true, signatureUrl, signedAt: signedAt.toISOString() });
}

export async function DELETE() {
  const current = await getCurrentSessionUser();
  if (!current?.user.schoolAccountId) return NextResponse.json({ success: false, error: "يجب تسجيل الدخول." }, { status: 401 });
  if (current.user.role !== "PRINCIPAL") return NextResponse.json({ success: false, error: "لا تملك صلاحية حذف توقيع مدير المدرسة." }, { status: 403 });
  const result = await prisma.schoolProfile.updateMany({ where: { schoolAccountId: current.user.schoolAccountId, principalSignatureUrl: { not: null } }, data: { principalSignatureUrl: null, principalSignatureSignedAt: null, principalSignatureToken: null, principalSignatureRequestedAt: null } });
  if (!result.count) return NextResponse.json({ success: false, error: "لا يوجد توقيع مدير محفوظ للحذف." }, { status: 404 });
  return NextResponse.json({ success: true, message: "تم حذف توقيع مدير المدرسة المحفوظ." });
}
