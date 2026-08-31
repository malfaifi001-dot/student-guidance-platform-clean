import { NextResponse } from "next/server";
import { certificatePrisma } from "@/lib/certificates/certificate-db";
import { getCertificateActor } from "@/lib/certificates/certificate-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    certificateId: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const actor = await getCertificateActor();

  if (!actor) {
    return NextResponse.json(
      { success: false, error: "غير مصرح." },
      { status: 401 },
    );
  }

  const { certificateId } = await context.params;

  if (!certificateId) {
    return NextResponse.json(
      { success: false, error: "معرّف الشهادة مطلوب." },
      { status: 400 },
    );
  }

  const existing = await certificatePrisma.issuedCertificate.findFirst({
    where: {
      id: certificateId,
      createdById: actor.id,
    },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json(
      { success: false, error: "الشهادة غير موجودة." },
      { status: 404 },
    );
  }

  const deleted = await certificatePrisma.issuedCertificate.deleteMany({
    where: {
      id: existing.id,
      createdById: actor.id,
    },
  });

  if (deleted.count !== 1) {
    return NextResponse.json(
      { success: false, error: "تعذر حذف الشهادة." },
      { status: 409 },
    );
  }

  return NextResponse.json({
    success: true,
    message: "تم حذف الشهادة بنجاح.",
  });
}
