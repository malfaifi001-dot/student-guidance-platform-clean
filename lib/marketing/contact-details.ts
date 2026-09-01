export const TEACHIX_SUPPORT_EMAIL = "support@teachix.sa";
export const TEACHIX_WHATSAPP_DISPLAY_NUMBER = "0580863868";
export const TEACHIX_WHATSAPP_INTERNATIONAL_NUMBER = "966580863868";
export const TEACHIX_WHATSAPP_URL =
  `https://wa.me/${TEACHIX_WHATSAPP_INTERNATIONAL_NUMBER}`;

export const TEACHIX_PASSWORD_RECOVERY_WHATSAPP_MESSAGE =
  "نسيت كلمة المرور لحسابي، الرجاء المساعدة";

export const TEACHIX_SUPPORT_WHATSAPP_MESSAGE =
  "السلام عليكم، أحتاج مساعدة من خدمة العملاء.";

export function buildTeachixSupportWhatsAppUrl(
  message = TEACHIX_SUPPORT_WHATSAPP_MESSAGE,
) {
  return `${TEACHIX_WHATSAPP_URL}?text=${encodeURIComponent(message)}`;
}
