export type CertificateTemplateLayout = {
  showDynamicTitle: boolean;
  contentTop: string;
  contentLeft: string;
  contentRight: string;
  contentWidth: string;
  titleSize: string;
  introSize: string;
  nameSize: string;
  bodySize: string;
  reasonSize: string;
  titleColor: string;
  bodyColor: string;
  accentColor: string;
  contentGap: string;
  introMarginTop: string;
  nameMarginTop: string;
  bodyMarginTop: string;
  reasonMarginTop: string;
  signatureLeft: string;
  signatureRight: string;
  signatureWidth: string;
  signatureBottom: string;
  signatureColor: string;
  swapSignatureSides: boolean;
  metaLeft: string;
  metaBottom: string;
  ministryLogoTop: string;
  ministryLogoLeft: string;
  ministryLogoWidth: string;
  ministryLogoMaxHeight: string;
};

const classic: CertificateTemplateLayout = {
  showDynamicTitle: true,
  contentTop: "62mm",
  contentLeft: "48mm",
  contentRight: "48mm",
  contentWidth: "201mm",
  titleSize: "30px",
  introSize: "16px",
  nameSize: "32px",
  bodySize: "17px",
  reasonSize: "12px",
  titleColor: "#102a43",
  bodyColor: "#334e68",
  accentColor: "#b98b3e",
  contentGap: "5mm",
  introMarginTop: "5mm",
  nameMarginTop: "4mm",
  bodyMarginTop: "4mm",
  reasonMarginTop: "3mm",
  signatureLeft: "29mm",
  signatureRight: "29mm",
  signatureWidth: "58mm",
  signatureBottom: "23mm",
  signatureColor: "#243b53",
  swapSignatureSides: false,
  metaLeft: "50%",
  metaBottom: "24mm",
  ministryLogoTop: "14mm",
  ministryLogoLeft: "14mm",
  ministryLogoWidth: "30mm",
  ministryLogoMaxHeight: "22mm",
};

const modern: CertificateTemplateLayout = {
  showDynamicTitle: true,
  contentTop: "58mm",
  contentLeft: "57mm",
  contentRight: "57mm",
  contentWidth: "183mm",
  titleSize: "31px",
  introSize: "16px",
  nameSize: "34px",
  bodySize: "16px",
  reasonSize: "12px",
  titleColor: "#12355b",
  bodyColor: "#486581",
  accentColor: "#d2a84a",
  contentGap: "4mm",
  introMarginTop: "4mm",
  nameMarginTop: "3mm",
  bodyMarginTop: "4mm",
  reasonMarginTop: "2mm",
  signatureLeft: "31mm",
  signatureRight: "31mm",
  signatureWidth: "56mm",
  signatureBottom: "22mm",
  signatureColor: "#243b53",
  swapSignatureSides: false,
  metaLeft: "50%",
  metaBottom: "23mm",
  ministryLogoTop: "14mm",
  ministryLogoLeft: "14mm",
  ministryLogoWidth: "30mm",
  ministryLogoMaxHeight: "22mm",
};

const elegant: CertificateTemplateLayout = {
  showDynamicTitle: true,
  contentTop: "64mm",
  contentLeft: "52mm",
  contentRight: "52mm",
  contentWidth: "193mm",
  titleSize: "29px",
  introSize: "16px",
  nameSize: "31px",
  bodySize: "16px",
  reasonSize: "12px",
  titleColor: "#172b4d",
  bodyColor: "#486581",
  accentColor: "#c29b4b",
  contentGap: "5mm",
  introMarginTop: "5mm",
  nameMarginTop: "4mm",
  bodyMarginTop: "4mm",
  reasonMarginTop: "3mm",
  signatureLeft: "29mm",
  signatureRight: "29mm",
  signatureWidth: "58mm",
  signatureBottom: "24mm",
  signatureColor: "#243b53",
  swapSignatureSides: false,
  metaLeft: "50%",
  metaBottom: "25mm",
  ministryLogoTop: "14mm",
  ministryLogoLeft: "14mm",
  ministryLogoWidth: "30mm",
  ministryLogoMaxHeight: "22mm",
};

const modernBlue: CertificateTemplateLayout = {
  showDynamicTitle: false,
  contentTop: "58mm",
  contentLeft: "67mm",
  contentRight: "48mm",
  contentWidth: "182mm",
  titleSize: "29px",
  introSize: "19px",
  nameSize: "40px",
  bodySize: "18px",
  reasonSize: "14px",
  titleColor: "#061bb0",
  bodyColor: "#334e68",
  accentColor: "#33bef2",
  contentGap: "4mm",
  introMarginTop: "9mm",
  nameMarginTop: "5mm",
  bodyMarginTop: "5mm",
  reasonMarginTop: "4mm",
  signatureLeft: "42mm",
  signatureRight: "42mm",
  signatureWidth: "52mm",
  signatureBottom: "23mm",
  signatureColor: "#061bb0",
  swapSignatureSides: true,
  metaLeft: "50%",
  metaBottom: "21mm",
  ministryLogoTop: "13mm",
  ministryLogoLeft: "16mm",
  ministryLogoWidth: "29mm",
  ministryLogoMaxHeight: "22mm",
};

export const certificateTemplateLayouts: Record<string, CertificateTemplateLayout> = {
  "certificate-modern-blue": modernBlue,
  "certificate-navy-classic": classic,
  "certificate-navy-modern": modern,
  "certificate-navy-elegant": elegant,
};

export function getCertificateTemplateLayout(key: string) {
  return certificateTemplateLayouts[key] || classic;
}
