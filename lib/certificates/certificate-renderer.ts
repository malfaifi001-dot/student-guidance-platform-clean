import type { CertificateSignatureProfile } from "@/lib/certificates/certificate-signature-profile";
import { getCertificateTemplateByKey } from "@/lib/certificates/certificate-template-registry";
import { getCertificateTemplateLayout } from "@/lib/certificates/certificate-template-layouts";

export type CertificateRenderRecord = {
  id: string;
  schoolAccountId: string;
  certificateNumber: string;
  certificateType: string;
  recipientType: string;
  recipientName: string;
  title: string;
  reason: string | null;
  body: string | null;
  issueDate: Date | string;
  dataJson?: unknown;
};

export type CertificateRenderOptions = {
  baseUrl?: string;
  signatureProfile?: CertificateSignatureProfile | null;
};

export const DEFAULT_CERTIFICATE_TEMPLATE_KEY = "certificate-modern-blue" as const;

export function readCertificateDataJson(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  try {
    const parsed = JSON.parse(String(value));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return {};
  }

  return {};
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function resolveUrl(url: unknown, baseUrl?: string) {
  const raw = clean(url);
  if (!raw) return "";
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;

  if (baseUrl && raw.startsWith("/")) {
    try {
      return new URL(raw, baseUrl).toString();
    } catch {
      return raw;
    }
  }

  return raw;
}

export function formatCertificateDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("ar-SA-u-ca-gregory", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function renderSignatureBox(input: {
  title: string;
  name: string;
  signatureUrl?: string;
  baseUrl?: string;
}) {
  const signatureUrl = resolveUrl(input.signatureUrl, input.baseUrl);

  return `
    <div class="signature-box">
      <div class="signature-title">${escapeHtml(input.title)}</div>
      <div class="signature-image-wrap">
        ${signatureUrl
          ? `<img src="${escapeHtml(signatureUrl)}" alt="${escapeHtml(input.title)}" />`
          : `<div class="signature-line"></div>`}
      </div>
      <div class="signature-name">${escapeHtml(input.name || "........................")}</div>
    </div>
  `;
}

function resolveTemplateKey(data: Record<string, unknown>) {
  const requested = clean(data.templateKey);
  return getCertificateTemplateByKey(requested)?.key || DEFAULT_CERTIFICATE_TEMPLATE_KEY;
}

export function renderCertificateDocumentHtml(
  certificate: CertificateRenderRecord,
  options: CertificateRenderOptions = {},
) {
  const data = readCertificateDataJson(certificate.dataJson);
  const templateKey = resolveTemplateKey(data);
  const template = getCertificateTemplateByKey(templateKey) || getCertificateTemplateByKey(DEFAULT_CERTIFICATE_TEMPLATE_KEY)!;
  const layout = getCertificateTemplateLayout(template.key);
  const profile = options.signatureProfile;

  const principalName = clean(data.principalName) || profile?.principalName || "مدير المدرسة";
  const principalSignatureUrl = clean(data.principalSignatureUrl) || profile?.principalSignatureUrl || "";
  const issuerTitle = clean(data.issuerTitle) || profile?.issuerTitle || "الموجه الطلابي";
  const issuerName = clean(data.issuerName) || profile?.issuerName || "الموجه الطلابي";
  const issuerSignatureUrl = clean(data.issuerSignatureUrl) || profile?.issuerSignatureUrl || "";
  const artworkUrl = resolveUrl(template.templatePath, options.baseUrl);
  const ministryLogoUrl = resolveUrl("/templates/certificates/moe-logo.svg", options.baseUrl);

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(certificate.title || "شهادة")}</title>
  <style>
    @page { size: A4 landscape; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #e5e7eb;
      direction: rtl;
      font-family: Arial, Tahoma, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .certificate-shell {
      width: 297mm;
      height: 210mm;
      margin: 0 auto;
      position: relative;
      overflow: hidden;
      background: #fff;
      color: #102a43;
      page-break-after: always;
      break-after: page;
    }
    .certificate-shell.last { page-break-after: auto; break-after: auto; }
    .certificate-artwork {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: fill;
      display: block;
    }
    .certificate-overlay {
      position: absolute;
      inset: 0;
      direction: rtl;
      text-align: center;
    }
    .content {
      position: absolute;
      top: ${layout.contentTop};
      left: ${layout.contentLeft};
      right: ${layout.contentRight};
      width: auto;
      max-width: ${layout.contentWidth};
      margin: 0 auto;
    }
    .title {
      margin: 0;
      color: ${layout.titleColor};
      font-size: ${layout.titleSize};
      line-height: 1.2;
      font-weight: 900;
    }
    .accent-line {
      width: 72mm;
      height: 1mm;
      margin: ${layout.contentGap} auto 0;
      background: ${layout.accentColor};
      border-radius: 99px;
    }
    .intro {
      margin: ${layout.introMarginTop} 0 0;
      color: ${layout.bodyColor};
      font-size: ${layout.introSize};
      font-weight: 700;
    }
    .name {
      margin: ${layout.nameMarginTop} 0 0;
      color: ${layout.titleColor};
      font-size: ${layout.nameSize};
      line-height: 1.25;
      font-weight: 900;
    }
    .body {
      max-width: 100%;
      margin: ${layout.bodyMarginTop} auto 0;
      color: ${layout.bodyColor};
      font-size: ${layout.bodySize};
      line-height: 1.75;
      font-weight: 700;
    }
    .reason {
      margin: ${layout.reasonMarginTop} auto 0;
      color: #627d98;
      font-size: ${layout.reasonSize};
      line-height: 1.5;
      font-weight: 800;
    }
    .signatures {
      position: absolute;
      left: ${layout.signatureLeft};
      right: ${layout.signatureRight};
      bottom: ${layout.signatureBottom};
      display: flex;
      direction: ${layout.swapSignatureSides ? "ltr" : "rtl"};
      align-items: flex-end;
      justify-content: space-between;
      gap: 20mm;
    }
    .signature-box {
      width: ${layout.signatureWidth};
      color: ${layout.signatureColor};
      text-align: center;
      font-size: 11px;
      font-weight: 900;
    }
    .signature-title { margin-bottom: 2mm; }
    .signature-image-wrap {
      height: 15mm;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1mm;
    }
    .signature-image-wrap img { max-width: 55mm; max-height: 15mm; object-fit: contain; display: block; }
    .signature-line { width: 100%; height: .5mm; background: ${layout.accentColor}; margin-top: 11mm; }
    .signature-name { min-height: 5mm; color: #627d98; font-size: 10px; font-weight: 800; }
    .meta {
      position: absolute;
      left: ${layout.metaLeft};
      bottom: ${layout.metaBottom};
      transform: translateX(-50%);
      color: #627d98;
      text-align: center;
      font-size: 10px;
      line-height: 1.6;
      font-weight: 800;
      white-space: nowrap;
    }
    .ministry-logo {
      position: absolute;
      top: ${layout.ministryLogoTop};
      left: ${layout.ministryLogoLeft};
      width: ${layout.ministryLogoWidth};
      max-height: ${layout.ministryLogoMaxHeight};
      height: auto;
      object-fit: contain;
      object-position: center;
      display: block;
    }
    @media print {
      html, body { background: #fff; }
      .certificate-shell { margin: 0; box-shadow: none; }
    }
  </style>
</head>
<body>
  <section class="certificate-shell">
    <img class="certificate-artwork" src="${escapeHtml(artworkUrl)}" alt="" aria-hidden="true" />
    <img class="ministry-logo" src="${escapeHtml(ministryLogoUrl)}" alt="وزارة التعليم" />
    <div class="certificate-overlay">
      <main class="content">
        ${layout.showDynamicTitle
          ? `<h1 class="title">${escapeHtml(certificate.title || "شهادة")}</h1>
        <div class="accent-line"></div>`
          : ""}
        <p class="intro">تتقدم إدارة المدرسة بخالص الشكر والتقدير إلى</p>
        <div class="name">${escapeHtml(certificate.recipientName)}</div>
        <p class="body">${escapeHtml(certificate.body || "")}</p>
        ${certificate.reason ? `<p class="reason">سبب التكريم: ${escapeHtml(certificate.reason)}</p>` : ""}
      </main>
      <div class="signatures">
        ${renderSignatureBox({ title: issuerTitle, name: issuerName, signatureUrl: issuerSignatureUrl, baseUrl: options.baseUrl })}
        ${renderSignatureBox({ title: "مدير المدرسة", name: principalName, signatureUrl: principalSignatureUrl, baseUrl: options.baseUrl })}
      </div>
      <div class="meta">
        <div>تاريخ الإصدار: ${escapeHtml(formatCertificateDate(certificate.issueDate))}</div>
        <div>رقم الشهادة: ${escapeHtml(certificate.certificateNumber)}</div>
      </div>
    </div>
  </section>
</body>
</html>`;
}
