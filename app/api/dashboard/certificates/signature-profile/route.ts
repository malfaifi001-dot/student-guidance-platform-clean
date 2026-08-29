import { NextResponse } from "next/server";
import { getCertificateActor } from "@/lib/certificates/certificate-auth";
import { getCertificateSignatureProfile } from "@/lib/certificates/certificate-signature-profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const actor = await getCertificateActor();

  if (!actor) {
    return NextResponse.json({ error: "يجب تسجيل الدخول." }, { status: 401 });
  }

  try {
    const profile = await getCertificateSignatureProfile(
      actor.schoolAccountId,
      actor.role,
      actor.name,
      actor.id,
    );

    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json(
      { error: "تعذر تحميل هوية الشهادة." },
      { status: 500 },
    );
  }
}
