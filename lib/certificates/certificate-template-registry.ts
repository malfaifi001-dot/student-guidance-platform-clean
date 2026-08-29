import {
  ACTIVE_CERTIFICATE_TEMPLATE_KEYS,
  CERTIFICATE_TEMPLATE_KEYS,
} from "./certificate-types";

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
    key: CERTIFICATE_TEMPLATE_KEYS.modernTeal01,
    name: "مودرن تركوازي 1",
    description: "تصميم تركوازي عصري بمساحة واضحة للمحتوى الرسمي.",
    templatePath: "/templates/certificates/certificate-modern-teal-01.svg",
    previewImagePath: "/templates/certificates/certificate-modern-teal-01.svg",
    orientation: "LANDSCAPE",
    pageSize: "A4",
  },
  {
    key: CERTIFICATE_TEMPLATE_KEYS.modernTeal02,
    name: "مودرن تركوازي 2",
    description: "تصميم تركوازي حديث بتكوين مؤسسي متوازن.",
    templatePath: "/templates/certificates/certificate-modern-teal-02.svg",
    previewImagePath: "/templates/certificates/certificate-modern-teal-02.svg",
    orientation: "LANDSCAPE",
    pageSize: "A4",
  },
  {
    key: CERTIFICATE_TEMPLATE_KEYS.modernTeal03,
    name: "مودرن تركوازي 3",
    description: "تصميم تركوازي أنيق مناسب لشهادات التكريم والإنجاز.",
    templatePath: "/templates/certificates/certificate-modern-teal-03.svg",
    previewImagePath: "/templates/certificates/certificate-modern-teal-03.svg",
    orientation: "LANDSCAPE",
    pageSize: "A4",
  },
  {
    key: CERTIFICATE_TEMPLATE_KEYS.modernTeal04,
    name: "زهري أنيق",
    description: "تصميم زهري أنيق بطابع هادئ ومساحة متوازنة للمحتوى.",
    templatePath: "/templates/certificates/certificate-modern-teal-04.svg",
    previewImagePath: "/templates/certificates/certificate-modern-teal-04.svg",
    orientation: "LANDSCAPE",
    pageSize: "A4",
  },
  {
    key: CERTIFICATE_TEMPLATE_KEYS.modernTeal05,
    name: "كلاسيكي مزخرف",
    description: "تصميم كلاسيكي مزخرف بإطار أنيق ومساحة واسعة للمحتوى.",
    templatePath: "/templates/certificates/certificate-modern-teal-05.svg",
    previewImagePath: "/templates/certificates/certificate-modern-teal-05.svg",
    orientation: "LANDSCAPE",
    pageSize: "A4",
  },
] as const;

export const activeCertificateTemplateRegistry = certificateTemplateRegistry.filter((template) =>
  (ACTIVE_CERTIFICATE_TEMPLATE_KEYS as readonly string[]).includes(template.key),
);

export function getCertificateTemplateByKey(key: string) {
  return certificateTemplateRegistry.find((template) => template.key === key);
}
