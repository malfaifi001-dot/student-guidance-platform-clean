export function normalizeWhatsAppPhone(value: string) {
  let digits = String(value || "").replace(/[^\d]/g, "");

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("0")) {
    digits = `966${digits.slice(1)}`;
  }

  if (digits.length === 9 && digits.startsWith("5")) {
    digits = `966${digits}`;
  }

  return digits;
}

export function buildTeacherAssignmentPublicUrl(origin: string, token: string) {
  const cleanOrigin = String(origin || "").replace(/\/+$/, "");

  return `${cleanOrigin}/teacher/activity-assignment/${encodeURIComponent(token)}`;
}

export function buildTeacherAssignmentMessage(input: {
  teacherName: string;
  domainTitle: string;
  schoolName?: string | null;
  dueDate?: Date | string | null;
  note?: string | null;
  url: string;
}) {
  const dueText = input.dueDate
    ? `\nموعد التسليم: ${new Date(input.dueDate).toLocaleDateString("ar-SA")}`
    : "";

  const noteText = input.note?.trim()
    ? `\nملاحظة رائد النشاط: ${input.note.trim()}`
    : "";

  return [
    `السلام عليكم أستاذ/ة ${input.teacherName}`,
    "",
    `تم تكليفكم بتنفيذ نشاط مدرسي ضمن مجال: ${input.domainTitle}.`,
    input.schoolName ? `المدرسة: ${input.schoolName}` : "",
    dueText.trim(),
    noteText.trim(),
    "",
    "فضلاً افتح الرابط التالي من الجوال، عبئ البيانات، ارفع الشواهد، ثم اضغط إرسال:",
    input.url,
    "",
    "لا تحتاج تسجيل دخول."
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildWhatsAppUrl(phone: string, message: string) {
  const normalizedPhone = normalizeWhatsAppPhone(phone);

  if (!normalizedPhone) {
    return "";
  }

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}