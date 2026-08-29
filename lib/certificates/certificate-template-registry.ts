import { CERTIFICATE_TEMPLATE_KEYS } from "./certificate-types";

export const certificateTemplateRegistry = [
  {
    key: CERTIFICATE_TEMPLATE_KEYS.modernBlue,
    name: "مودرن أزرق",
    description: "تصميم أزرق حديث بمساحة مركزية واسعة للمحتوى الرسمي.",
    templatePath: "/templates/certificates/certificate-modern-blue.svg",
    previewImagePath: "/templates/certificates/certificate-modern-blue.svg",
    orientation: "LANDSCAPE",
    pageSize: "A4",
  },
  {
    key: CERTIFICATE_TEMPLATE_KEYS.navyClassic,
    name: "كحلي كلاسيكي",
    description: "تصميم كحلي كلاسيكي متوازن لشهادات الشكر والتقدير والإنجاز.",
    templatePath: "/templates/certificates/certificate-navy-classic.svg",
    previewImagePath: "/templates/certificates/certificate-navy-classic.svg",
    orientation: "LANDSCAPE",
    pageSize: "A4",
  },
  {
    key: CERTIFICATE_TEMPLATE_KEYS.navyModern,
    name: "كحلي حديث",
    description: "تصميم كحلي حديث بمساحات واضحة ومظهر مؤسسي معاصر.",
    templatePath: "/templates/certificates/certificate-navy-modern.svg",
    previewImagePath: "/templates/certificates/certificate-navy-modern.svg",
    orientation: "LANDSCAPE",
    pageSize: "A4",
  },
  {
    key: CERTIFICATE_TEMPLATE_KEYS.navyElegant,
    name: "كحلي أنيق",
    description: "تصميم كحلي أنيق يوازن بين الطابع الرسمي واللمسة الراقية.",
    templatePath: "/templates/certificates/certificate-navy-elegant.svg",
    previewImagePath: "/templates/certificates/certificate-navy-elegant.svg",
    orientation: "LANDSCAPE",
    pageSize: "A4",
  },
] as const;

export function getCertificateTemplateByKey(key: string) {
  return certificateTemplateRegistry.find((template) => template.key === key);
}
