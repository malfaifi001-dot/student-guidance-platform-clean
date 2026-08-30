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
  /**
   * Mark the certificate as the last page so its trailing page break is
   * suppressed. Prevents a blank second page for a single certificate.
   */
  last?: boolean;
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
  titleSize: string;
  nameSize: string;
}) {
  const signatureUrl = resolveUrl(input.signatureUrl, input.baseUrl);

  return `
    <div class="signature-box">
      <div class="signature-title" style="font-size:${escapeHtml(input.titleSize)}">${escapeHtml(input.title)}</div>
      <div class="signature-image-wrap">
        ${signatureUrl
          ? `<img src="${escapeHtml(signatureUrl)}" alt="${escapeHtml(input.title)}" />`
          : ""}
      </div>
      <div class="signature-name" style="font-size:${escapeHtml(input.nameSize)}">${escapeHtml(input.name || "........................")}</div>
    </div>
  `;
}

function resolveTemplateKey(data: Record<string, unknown>) {
  const requested = clean(data.templateKey);
  return getCertificateTemplateByKey(requested)?.key || DEFAULT_CERTIFICATE_TEMPLATE_KEY;
}

function renderCertificateLogo(options: {
  src: string;
  alt: string;
  top: string;
  left: string;
  right: string;
  width: string;
  maxHeight: string;
  variant: "default" | "white";
  opacity: string;
  blendMode: "normal" | "multiply" | "screen";
}) {
  const horizontalPosition = options.left !== "auto"
    ? `left:${options.left};right:auto;`
    : `left:auto;right:${options.right};`;
  const filter = options.variant === "white" ? "brightness(0) invert(1)" : "none";

  return `<img class="certificate-logo" src="${escapeHtml(options.src)}" alt="${escapeHtml(options.alt)}" style="top:${options.top};${horizontalPosition}width:${options.width};max-height:${options.maxHeight};filter:${filter};opacity:${options.opacity};mix-blend-mode:${options.blendMode};" />`;
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

  const principalName = profile?.principalName || clean(data.principalName) || "مدير المدرسة";
  const principalSignatureUrl = profile?.principalSignatureUrl || clean(data.principalSignatureUrl) || "";
  const issuerTitle = profile?.issuerTitle || clean(data.issuerTitle) || "الموجه الطلابي";
  const issuerName = profile?.issuerName || clean(data.issuerName) || "الموجه الطلابي";
  const issuerSignatureUrl = profile?.issuerSignatureUrl || clean(data.issuerSignatureUrl) || "";
  const artworkUrl = resolveUrl(template.templatePath, options.baseUrl);
  const ministryLogoUrl = resolveUrl("/templates/certificates/moe-logo.svg", options.baseUrl);
  const visionLogoUrl = resolveUrl("/uploads/school-logos/VISION2030.png", options.baseUrl);
  const logoMarkup = layout.logoMode === "none"
    ? ""
    : layout.logoMode === "combined"
    ? renderCertificateLogo({
        src: resolveUrl("/templates/certificates/moe-vision-combined.svg", options.baseUrl),
        alt: "وزارة التعليم ورؤية 2030",
        top: layout.combinedLogoTop,
        left: layout.combinedLogoLeft,
        right: "auto",
        width: layout.combinedLogoWidth,
        maxHeight: layout.combinedLogoMaxHeight,
        variant: layout.combinedLogoVariant,
        opacity: layout.combinedLogoOpacity,
        blendMode: layout.combinedLogoBlendMode,
      })
    : `${renderCertificateLogo({
        src: ministryLogoUrl,
        alt: "وزارة التعليم",
        top: layout.ministryLogoTop,
        left: layout.ministryLogoLeft,
        right: layout.ministryLogoRight,
        width: layout.ministryLogoWidth,
        maxHeight: layout.ministryLogoMaxHeight,
        variant: layout.ministryLogoVariant,
        opacity: layout.ministryLogoOpacity,
        blendMode: layout.ministryLogoBlendMode,
      })}${renderCertificateLogo({
        src: visionLogoUrl,
        alt: "رؤية 2030",
        top: layout.visionLogoTop,
        left: layout.visionLogoLeft,
        right: "auto",
        width: layout.visionLogoWidth,
        maxHeight: layout.visionLogoMaxHeight,
        variant: layout.visionLogoVariant,
        opacity: layout.visionLogoOpacity,
        blendMode: layout.visionLogoBlendMode,
      })}`;

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
      font-family: var(--font-cairo, "Cairo"), Tahoma, Arial, sans-serif;
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
    .intro {
      margin: ${layout.introMarginTop} 0 0;
      color: ${layout.introColor};
      font-size: ${layout.introSize};
      font-weight: 700;
    }
    .name {
      margin: ${layout.nameMarginTop} 0 0;
      color: ${layout.nameColor};
      font-size: ${layout.nameSize};
      line-height: 1.25;
      font-weight: 900;
    }
    .body {
      max-width: 100%;
      margin: ${layout.bodyMarginTop} auto 0;
      color: ${layout.bodyColor};
      font-size: ${layout.bodySize};
      line-height: ${layout.bodyLineHeight};
      font-weight: 700;
    }
    .signatures {
      position: absolute;
      left: ${layout.signatureLeft};
      right: ${layout.signatureRight};
      bottom: ${layout.signatureBottom};
      display: flex;
      direction: rtl;
      align-items: flex-end;
      justify-content: space-between;
      gap: ${layout.signatureGap};
    }
    .signature-box {
      width: ${layout.signatureWidth};
      color: ${layout.signatureTitleColor};
      text-align: center;
      font-size: ${layout.signatureTitleSize};
      font-weight: 900;
    }
    .signature-title { margin-bottom: ${layout.signatureTitleMarginBottom}; }
    .signature-image-wrap {
      height: ${layout.signatureFrameHeight};
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: ${layout.signatureImageMarginBottom};
    }
    .signature-image-wrap img { max-width: ${layout.signatureImageMaxWidth}; max-height: ${layout.signatureImageMaxHeight}; object-fit: contain; display: block; }
    .signature-name { min-height: ${layout.signatureNameMinHeight}; color: ${layout.signatureNameColor}; font-size: ${layout.signatureNameSize}; font-weight: 700; }
    .meta {
      position: absolute;
      left: ${layout.metaLeft};
      bottom: ${layout.metaBottom};
      transform: translateX(-50%);
      color: ${layout.metaColor};
      text-align: center;
      font-size: ${layout.metaSize};
      line-height: 1.6;
      font-weight: 700;
      white-space: nowrap;
    }
    .certificate-logo {
      position: absolute;
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
  <section class="certificate-shell${options.last ? " last" : ""}">
    <img class="certificate-artwork" src="${escapeHtml(artworkUrl)}" alt="" aria-hidden="true" />
    ${logoMarkup}
    <div class="certificate-overlay">
      <main class="content">
        <p class="intro">تتقدم إدارة المدرسة بخالص الشكر والتقدير إلى</p>
        <div class="name">${escapeHtml(certificate.recipientName)}</div>
        <p class="body">${escapeHtml(certificate.body || "")}</p>
      </main>
      <div class="signatures">
        ${renderSignatureBox({ title: issuerTitle, name: issuerName, signatureUrl: issuerSignatureUrl, baseUrl: options.baseUrl, titleSize: layout.signatureTitleSize, nameSize: layout.signatureNameSize })}
        ${renderSignatureBox({ title: "مدير المدرسة", name: principalName, signatureUrl: principalSignatureUrl, baseUrl: options.baseUrl, titleSize: layout.signatureTitleSize, nameSize: layout.signatureNameSize })}
      </div>
      <div class="meta">
        <div>تاريخ الإصدار: ${escapeHtml(formatCertificateDate(certificate.issueDate))}</div>
      </div>
    </div>
  </section>
</body>
</html>`;
}
