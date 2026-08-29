export const CERTIFICATES_SERVICE_SLUG = "certificates-honors" as const;

export const CERTIFICATE_TEMPLATE_KEYS = {
  modernBlue: "certificate-modern-blue",
  navyClassic: "certificate-navy-classic",
  navyModern: "certificate-navy-modern",
  navyElegant: "certificate-navy-elegant",
} as const;

export const CERTIFICATE_TYPES = [
  { value: "thanks", label: "شكر وتقدير" },
  { value: "participation", label: "مشاركة" },
  { value: "excellence", label: "تميز" },
  { value: "achievement", label: "إنجاز" },
  { value: "cooperation", label: "تعاون" },
] as const;

export const CERTIFICATE_RECIPIENT_TYPES = [
  { value: "student", label: "طالب", prefix: "الطالب" },
  { value: "student_female", label: "طالبة", prefix: "الطالبة" },
  { value: "teacher", label: "معلم", prefix: "الأستاذ" },
  { value: "teacher_female", label: "معلمة", prefix: "الأستاذة" },
  { value: "guardian", label: "ولي أمر", prefix: "ولي الأمر" },
  { value: "guardian_female", label: "ولية أمر", prefix: "ولية الأمر" },
  { value: "team", label: "فريق", prefix: "فريق" },
  { value: "organization", label: "جهة", prefix: "جهة" },
  { value: "other", label: "أخرى", prefix: "" },
] as const;

export type CertificateType = (typeof CERTIFICATE_TYPES)[number]["value"];
export type CertificateRecipientType = (typeof CERTIFICATE_RECIPIENT_TYPES)[number]["value"];

export function getCertificateTypeLabel(value: string) {
  return CERTIFICATE_TYPES.find((item) => item.value === value)?.label ?? "شهادة";
}

export function getRecipientPrefix(value: string) {
  return CERTIFICATE_RECIPIENT_TYPES.find((item) => item.value === value)?.prefix ?? "";
}
