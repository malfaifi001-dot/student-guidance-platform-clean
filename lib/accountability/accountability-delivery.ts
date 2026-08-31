import { buildWhatsAppLink } from "@/lib/whatsapp/whatsapp-links";

export function buildAccountabilityPublicUrl(origin: string, token: string) {
  return new URL(`/accountability/respond/${encodeURIComponent(token)}`, origin).toString();
}

export function buildAccountabilityWhatsAppLink(input: { phone: string | null | undefined; title: string; publicUrl: string }) {
  const message = ["السلام عليكم،", "يوجد طلب إفادة موجه إليك من إدارة المدرسة بعنوان:", input.title, "يمكنك فتح الطلب من الرابط الآمن التالي:", input.publicUrl].join("\n");
  return buildWhatsAppLink(input.phone, message);
}
