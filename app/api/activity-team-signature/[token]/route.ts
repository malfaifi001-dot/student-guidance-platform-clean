import { NextResponse } from "next/server";

import { signActivityTeamSupervisor } from "@/lib/activity-team/activity-team-signature-service";

type Context = { params: Promise<{ token: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { token } = await context.params;
    const body = await request.json().catch(() => null);
    if (!body || typeof body.supervisorName !== "string" || typeof body.dataUrl !== "string") {
      return NextResponse.json({ success: false, error: "بيانات التوقيع غير صالحة." }, { status: 400 });
    }
    const result = await signActivityTeamSupervisor({
      token,
      supervisorName: body.supervisorName,
      dataUrl: body.dataUrl,
    });
    if (!result.ok) {
      const status = result.code === "ALREADY_SIGNED" ? 409 : result.code === "UNAVAILABLE" ? 410 : 400;
      const error = result.code === "ALREADY_SIGNED"
        ? "تم توقيع هذا المشرف مسبقًا ولا يمكن استبدال توقيعه."
        : result.code === "INELIGIBLE"
          ? "اسم المشرف غير موجود ضمن البيانات المحفوظة."
          : result.code === "INVALID_SIGNATURE"
            ? "التوقيع غير صالح. امسح التوقيع وأعد المحاولة."
            : "رابط التوقيع غير صالح أو منتهٍ.";
      return NextResponse.json({ success: false, error }, { status });
    }
    return NextResponse.json({ success: true, signature: result.signature });
  } catch {
    return NextResponse.json({ success: false, error: "تعذر حفظ التوقيع." }, { status: 500 });
  }
}
