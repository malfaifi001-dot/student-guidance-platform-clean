import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getSchoolSignaturePublicUrl,
  writeSchoolSignatureFile,
} from "@/lib/settings/school-signature-file-storage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

async function savePrincipalSignature(input: {
  schoolAccountId: string;
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

  const fileName = `principal-signature-${Date.now()}.png`;

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

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;

  const profile = await prisma.schoolProfile.findUnique({
    where: {
      principalSignatureToken: token,
    },
    select: {
      schoolName: true,
      principalName: true,
      principalSignatureUrl: true,
      principalSignatureSignedAt: true,
    },
  });

  if (!profile) {
    return NextResponse.json(
      { success: false, error: "رابط التوقيع غير صالح." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      schoolName: profile.schoolName,
      principalName: profile.principalName || "",
      signed: Boolean(profile.principalSignatureUrl),
      signedAt: profile.principalSignatureSignedAt?.toISOString() || "",
    },
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;

  const profile = await prisma.schoolProfile.findUnique({
    where: {
      principalSignatureToken: token,
    },
  });

  if (!profile) {
    return NextResponse.json(
      { success: false, error: "رابط التوقيع غير صالح." },
      { status: 404 },
    );
  }

  const body = await request.json().catch(() => null);
  const dataUrl = String(body?.dataUrl || "");

  const signatureUrl = await savePrincipalSignature({
    schoolAccountId: profile.schoolAccountId,
    dataUrl,
  });

  if (!signatureUrl) {
    return NextResponse.json(
      { success: false, error: "تعذر حفظ التوقيع. أعد التوقيع ثم حاول مرة أخرى." },
      { status: 400 },
    );
  }

  const signedAt = new Date();

  await prisma.schoolProfile.update({
    where: {
      id: profile.id,
    },
    data: {
      principalSignatureUrl: signatureUrl,
      principalSignatureSignedAt: signedAt,
    },
  });

  return NextResponse.json({
    success: true,
    signatureUrl,
    signedAt: signedAt.toISOString(),
  });
}