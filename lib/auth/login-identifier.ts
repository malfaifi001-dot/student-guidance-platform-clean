export const SAUDI_MOBILE_ERROR =
  "رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام.";

export const LOGIN_IDENTIFIER_ERROR =
  "أدخل بريدًا إلكترونيًا صحيحًا أو رقم جوال يبدأ بـ 05 ويتكون من 10 أرقام.";

const SAUDI_MOBILE_PATTERN = /^05\d{8}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_ACCOUNT_EMAIL_SUFFIX = "@phone.teachix.local";

export function normalizeSaudiMobile(value: unknown) {
  return String(value ?? "").trim();
}

export function isValidSaudiMobile(value: unknown) {
  return SAUDI_MOBILE_PATTERN.test(normalizeSaudiMobile(value));
}

export function normalizeLoginIdentifier(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized.includes("@") ? normalized.toLowerCase() : normalized;
}

export function isValidLoginEmail(value: unknown) {
  const normalized = normalizeLoginIdentifier(value);
  return normalized.length <= 254 && EMAIL_PATTERN.test(normalized);
}

export function buildTransitionalPhoneEmail(phone: string) {
  return `${phone}${PHONE_ACCOUNT_EMAIL_SUFFIX}`;
}

export function isTransitionalPhoneEmail(email: string | null | undefined) {
  return Boolean(email?.toLowerCase().endsWith(PHONE_ACCOUNT_EMAIL_SUFFIX));
}

export function classifyLoginIdentifier(value: unknown):
  | { kind: "phone"; value: string }
  | { kind: "email"; value: string }
  | null {
  const normalized = normalizeLoginIdentifier(value);
  if (isValidSaudiMobile(normalized)) return { kind: "phone", value: normalized };
  if (isValidLoginEmail(normalized)) return { kind: "email", value: normalized };
  return null;
}
