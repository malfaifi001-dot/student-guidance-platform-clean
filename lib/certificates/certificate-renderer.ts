export type CertificateRenderRecord = {
  id: string;
  certificateNumber: string;
  certificateType: string;
  recipientType: string;
  recipientName: string;
  title: string;
  reason: string | null;
  body: string;
  issueDate: Date | string;
  dataJson?: unknown;
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function readCertificateDataJson(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "object") return value as Record<string, unknown>;

  try {
    return JSON.parse(String(value)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function formatCertificateDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("ar-SA-u-ca-gregory", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function renderCertificateDocumentHtml(certificate: CertificateRenderRecord) {
  const data = readCertificateDataJson(certificate.dataJson);
  const issuerName = String(data.issuerName || "الموجه / رائد النشاط");
  const principalName = String(data.principalName || "مدير المدرسة");
  const issueDate = formatCertificateDate(certificate.issueDate);

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(certificate.certificateNumber)}</title>
  <style>
    @page { size: A4 landscape; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #e5e7eb; }
    body {
      font-family: Arial, Tahoma, sans-serif;
      direction: rtl;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .certificate-shell {
      width: 297mm;
      height: 210mm;
      margin: 0 auto;
      background: #fbfdf9;
      position: relative;
      overflow: hidden;
      color: #0f172a;
    }
    .top {
      position: absolute;
      inset-inline: 0;
      top: 0;
      height: 38mm;
      background: #0f7a57;
      border-bottom-left-radius: 45%;
      border-bottom-right-radius: 45%;
    }
    .bottom {
      position: absolute;
      inset-inline: 0;
      bottom: 0;
      height: 33mm;
      background: #0f7a57;
      border-top-left-radius: 45%;
      border-top-right-radius: 45%;
    }
    .gold-top {
      position: absolute;
      inset-inline: 0;
      top: 31mm;
      height: 8mm;
      background: #d6b15f;
      opacity: .9;
      border-bottom-left-radius: 60%;
      border-bottom-right-radius: 60%;
    }
    .gold-bottom {
      position: absolute;
      inset-inline: 0;
      bottom: 29mm;
      height: 8mm;
      background: #d6b15f;
      opacity: .9;
      border-top-left-radius: 60%;
      border-top-right-radius: 60%;
    }
    .outer {
      position: absolute;
      inset: 15mm;
      border: 1.3mm solid #d6b15f;
      border-radius: 9mm;
    }
    .inner {
      position: absolute;
      inset: 21mm;
      border: .45mm solid rgba(15, 122, 87, .35);
      border-radius: 7mm;
    }
    .logo {
      position: absolute;
      top: 23mm;
      width: 48mm;
      height: 19mm;
      border-radius: 5mm;
      background: rgba(255,255,255,.94);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #0f7a57;
      font-weight: 800;
      font-size: 12px;
    }
    .vision { left: 26mm; }
    .moe { right: 26mm; }
    .medal {
      position: absolute;
      top: 39mm;
      left: 50%;
      width: 23mm;
      height: 23mm;
      transform: translateX(-50%);
      border: 1.4mm solid #d6b15f;
      border-radius: 999px;
      background: #f7f0d7;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #0f7a57;
      font-size: 28px;
      font-weight: 900;
    }
    .content {
      position: absolute;
      top: 72mm;
      left: 32mm;
      right: 32mm;
      text-align: center;
    }
    .title {
      color: #0f7a57;
      font-size: 36px;
      line-height: 1.2;
      font-weight: 900;
      margin: 0;
    }
    .line {
      width: 95mm;
      height: 1.2mm;
      background: #d6b15f;
      border-radius: 99px;
      margin: 8mm auto 0;
    }
    .intro {
      margin: 12mm 0 0;
      color: #374151;
      font-size: 18px;
    }
    .name {
      margin: 9mm 0 0;
      color: #111827;
      font-size: 36px;
      font-weight: 900;
      line-height: 1.25;
    }
    .body {
      margin: 9mm auto 0;
      max-width: 205mm;
      color: #374151;
      font-size: 18px;
      line-height: 2;
    }
    .reason {
      margin: 5mm auto 0;
      color: #6b7280;
      font-size: 14px;
      line-height: 1.8;
    }
    .signature {
      position: absolute;
      bottom: 27mm;
      width: 58mm;
      text-align: center;
      color: #374151;
      font-size: 13px;
      font-weight: 800;
    }
    .signature.left { left: 26mm; }
    .signature.right { right: 26mm; }
    .sig-line {
      height: .6mm;
      background: #0f7a57;
      margin: 8mm 0 3mm;
    }
    .sig-name {
      font-size: 12px;
      color: #6b7280;
      font-weight: 500;
    }
    .meta {
      position: absolute;
      left: 50%;
      bottom: 29mm;
      transform: translateX(-50%);
      text-align: center;
      color: #6b7280;
      font-size: 12px;
      line-height: 1.8;
    }
    @media print {
      html, body { background: white; }
      .certificate-shell { margin: 0; box-shadow: none; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="certificate-shell">
    <div class="top"></div>
    <div class="gold-top"></div>
    <div class="bottom"></div>
    <div class="gold-bottom"></div>
    <div class="outer"></div>
    <div class="inner"></div>

    <div class="logo vision">شعار رؤية 2030</div>
    <div class="logo moe">شعار وزارة التعليم</div>
    <div class="medal">✓</div>

    <main class="content">
      <h1 class="title">${escapeHtml(certificate.title)}</h1>
      <div class="line"></div>
      <p class="intro">تتقدم إدارة المدرسة بخالص الشكر والتقدير إلى</p>
      <div class="name">${escapeHtml(certificate.recipientName)}</div>
      <p class="body">${escapeHtml(certificate.body)}</p>
      ${certificate.reason ? `<p class="reason">${escapeHtml(certificate.reason)}</p>` : ""}
    </main>

    <div class="signature left">
      <div>الموجه / رائد النشاط</div>
      <div class="sig-line"></div>
      <div class="sig-name">${escapeHtml(issuerName)}</div>
    </div>

    <div class="signature right">
      <div>مدير المدرسة</div>
      <div class="sig-line"></div>
      <div class="sig-name">${escapeHtml(principalName)}</div>
    </div>

    <div class="meta">
      <div>تاريخ الإصدار: ${escapeHtml(issueDate)}</div>
      <div>رقم الشهادة: ${escapeHtml(certificate.certificateNumber)}</div>
    </div>
  </div>
</body>
</html>`;
}