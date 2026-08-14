import { NextResponse } from "next/server";

import { signReportSignatureRequest } from "@/lib/report-signatures/report-signature-service";

export const runtime = "nodejs";

type Context = { params: Promise<{ token: string }> };

export async function POST(request: Request, context: Context) {
  const { token } = await context.params;
  const body = await request.json().catch(() => null);

  if (
    !body ||
    typeof body.dataUrl !== "string" ||
    typeof body.consentToReuse !== "boolean"
  ) {
    return NextResponse.json(
      { success: false, error: "بيانات التوقيع غير صالحة." },
      { status: 400 },
    );
  }

  const result = await signReportSignatureRequest({
    token,
    dataUrl: body.dataUrl,
    consentToReuse: body.consentToReuse,
  });

  if (!result.ok) {
    const unavailable = ["SIGNED", "EXPIRED", "CANCELED", "USED"].includes(result.code);
    return NextResponse.json(
      {
        success: false,
        error: unavailable
          ? "طلب التوقيع منتهٍ أو مكتمل ولا يمكن استخدامه مرة أخرى."
          : result.code === "INVALID_SIGNATURE"
            ? "التوقيع غير صالح. امسح التوقيع وأعد المحاولة."
            : "رابط التوقيع غير صالح.",
      },
      { status: unavailable ? 409 : 400 },
    );
  }

  return NextResponse.json({
    success: true,
    signedAt: result.signedAt.toISOString(),
  });
}
