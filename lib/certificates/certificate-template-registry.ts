import { CERTIFICATE_TEMPLATE_KEYS } from "./certificate-types";

export const certificateTemplateRegistry = [
  {
    key: CERTIFICATE_TEMPLATE_KEYS.officialGreen,
    name: "القالب الرسمي الأخضر",
    description: "قالب رسمي هادئ مناسب لشهادات الشكر والتقدير والمشاركة والتميز.",
    templatePath: "/templates/certificates/official-green.svg",
    previewImagePath: "/templates/certificates/official-green.svg",
    orientation: "LANDSCAPE",
    pageSize: "A4",
  },
] as const;

export function getCertificateTemplateByKey(key: string) {
  return certificateTemplateRegistry.find((template) => template.key === key);
}