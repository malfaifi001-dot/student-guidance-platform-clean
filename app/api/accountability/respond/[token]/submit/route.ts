import { NextResponse } from "next/server";
import { submitAccountabilityResponse } from "@/lib/accountability/accountability-request-service";
import { isValidAccountabilityToken } from "@/lib/accountability/accountability-token";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isValidAccountabilityToken(token)) return NextResponse.json({ success: false, error: "الرابط غير صالح." }, { status: 404 });
  try {
    const body = await request.json().catch(() => null);
    const respondentValues = body?.respondentValues && typeof body.respondentValues === "object" && !Array.isArray(body.respondentValues) ? body.respondentValues : {};
    const evidenceItems = Array.isArray(body?.evidenceItems) ? body.evidenceItems : [];
    const item = await submitAccountabilityResponse({ token, respondentValues, evidenceItems });
    return NextResponse.json({ success: true, status: item.status });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "تعذر إرسال الإفادة." }, { status: 400 });
  }
}
