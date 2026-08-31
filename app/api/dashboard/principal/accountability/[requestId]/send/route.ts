import { NextResponse } from "next/server";
import { requirePrincipalApi } from "@/lib/principal/principal-api-guard";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import { ACCOUNTABILITY_SERVICE } from "@/lib/accountability/accountability-types";
import { getAccountabilityRequestForPrincipal, sendAccountabilityRequest } from "@/lib/accountability/accountability-request-service";
import { buildAccountabilityPublicUrl, buildAccountabilityWhatsAppLink } from "@/lib/accountability/accountability-delivery";
import { normalizeSaudiWhatsAppNumber } from "@/lib/whatsapp/whatsapp-links";

type Context = { params: Promise<{ requestId: string }> };

export async function POST(request: Request, context: Context) {
  const access = await requirePrincipalApi();
  if (!access.ok) return access.response;
  const serviceGuard = await requireServiceAccessApi(ACCOUNTABILITY_SERVICE.slug, { allowPrincipal: true });
  if (serviceGuard) return serviceGuard;
  try {
    const { requestId } = await context.params;
    const body = await request.json().catch(() => null);
    const deliveryMethod = body?.deliveryMethod === "WHATSAPP" ? "WHATSAPP" : body?.deliveryMethod === "SYSTEM" ? "SYSTEM" : null;
    if (!deliveryMethod) return NextResponse.json({ success: false, error: "اختر طريقة الإرسال." }, { status: 400 });
    const principalContext = { user: { id: access.user.id, role: access.user.role, schoolAccountId: access.schoolAccountId }, schoolAccountId: access.schoolAccountId as string };
    const current = await getAccountabilityRequestForPrincipal(principalContext, requestId);
    if (!current || current.status !== "DRAFT") return NextResponse.json({ success: false, error: "المسودة غير متاحة للإرسال." }, { status: 409 });
    if (!current.respondentUserId) return NextResponse.json({ success: false, error: "يلزم اختيار مستجيب داخل النظام." }, { status: 400 });
    if (deliveryMethod === "WHATSAPP" && !normalizeSaudiWhatsAppNumber(current.respondentPhone)) return NextResponse.json({ success: false, error: "لا يوجد رقم جوال صالح للمستجيب." }, { status: 400 });
    const sent = await sendAccountabilityRequest({ context: principalContext, requestId, deliveryMethod });
    const publicUrl = buildAccountabilityPublicUrl(process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin, sent.token);
    const whatsappUrl = deliveryMethod === "WHATSAPP" ? buildAccountabilityWhatsAppLink({ phone: sent.respondentPhone, title: sent.title, publicUrl }) : null;
    if (deliveryMethod === "WHATSAPP" && !whatsappUrl) return NextResponse.json({ success: false, error: "رقم الجوال لا يدعم إرسال واتساب." }, { status: 400 });
    return NextResponse.json({ success: true, request: sent, publicUrl, whatsappUrl });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "تعذر إرسال الطلب." }, { status: 400 });
  }
}
