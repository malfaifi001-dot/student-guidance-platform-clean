const SAUDI_MOBILE_PATTERN = /^9665\d{8}$/;

export function normalizeSaudiWhatsAppNumber(value: string | null | undefined): string | null {
  let digits = String(value || "").trim().replace(/[^0-9]/g, "");

  if (digits.startsWith("00")) digits = digits.slice(2);
  if (/^05\d{8}$/.test(digits)) digits = `966${digits.slice(1)}`;
  else if (/^5\d{8}$/.test(digits)) digits = `966${digits}`;

  return SAUDI_MOBILE_PATTERN.test(digits) ? digits : null;
}

export function buildWhatsAppLink(phone: string | null | undefined, message?: string): string | null {
  const normalized = normalizeSaudiWhatsAppNumber(phone);
  if (!normalized) return null;

  const suffix = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${normalized}${suffix}`;
}

export function buildMembershipInvitationMessage(name: string | null | undefined): string {
  const displayName = String(name || "").trim();
  const greeting = displayName ? `مرحباً أ. ${displayName}` : "مرحباً";

  const message = `${greeting}

يسعدنا في Teachix منحك عضوية مجانية لمدة فصل دراسي كامل.

كوبون التفعيل: Welcome

كما خصصنا لك 4 عضويات مجانية لمدة فصل دراسي لإهدائها لمن ترغب من الزملاء والزميلات، وجميعها تُفعّل بنفس الكوبون: Welcome

نتمنى لك تجربة مميزة مع Teachix.

ملاحظة: الكود صالح لمدة 10 أيام فقط للتفعيل

فريق Teachix`;

  return message;
}
