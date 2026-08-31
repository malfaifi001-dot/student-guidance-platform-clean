import {
  buildWhatsAppUrl,
  normalizeWhatsAppPhone,
} from "@/lib/activity-programs/teacher-assignment-links";

export function normalizeTeacherActivityPhone(value: string) {
  return normalizeWhatsAppPhone(value);
}

export function buildTeacherActivityLinkPublicUrl(origin: string, token: string) {
  const cleanOrigin = String(origin || "").replace(/\/+$/, "");
  return `${cleanOrigin}/teacher/activity-link/${encodeURIComponent(token)}`;
}

export function buildTeacherActivityLinkMessage(input: {
  schoolName?: string | null;
  title: string;
  note?: string | null;
  dueDate?: Date | string | null;
  url: string;
}) {
  const dueText = input.dueDate
    ? `\nتاريخ الانتهاء: ${new Date(input.dueDate).toLocaleDateString("ar-SA")}`
    : "";

  const noteText = input.note?.trim()
    ? `\nملاحظة رائد النشاط: ${input.note.trim()}`
    : "";

  return [
    "السلام عليكم أيها المعلم/ة الفاضل/ة",
    "",
    `تم فتح باب المشاركة في: ${input.title}.`,
    input.schoolName ? `المدرسة: ${input.schoolName}` : "",
    dueText.trim(),
    noteText.trim(),
    "",
    "يمكن لأكثر من معلم المشاركة عبر الرابط نفسه. فضلاً افتح الرابط، اختر مجال النشاط، عبئ البيانات، ارفع الشواهد، ثم اضغط إرسال:",
    input.url,
    "",
    "لا تحتاج تسجيل دخول.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildTeacherActivityLinkWhatsAppUrl(phone: string, message: string) {
  return buildWhatsAppUrl(phone, message);
}
