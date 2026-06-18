import { prisma } from "@/lib/prisma";
import { getCertificateTypeLabel } from "@/lib/certificates/certificate-types";

const LINK_FIELD_KEY = "report_attached_certificate_ids";

type CaseSchoolRow = {
  schoolAccountId: string;
};

type CaseValueRow = {
  value: string | null;
  jsonValue: unknown;
};

type LinkedCertificateRow = {
  id: string;
  certificateNumber: string;
  certificateType: string;
  recipientType: string;
  recipientName: string;
  title: string | null;
  reason: string | null;
  body: string | null;
  issueDate: Date | string;
  dataJson: unknown;
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseJsonObject(value: unknown): Record<string, unknown> {
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

function parseLinkedIds(row: CaseValueRow | null) {
  if (!row) return [];

  const candidates = [row.jsonValue, row.value];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.map(String).filter(Boolean);
    }

    if (typeof candidate === "string" && candidate.trim()) {
      try {
        const parsed = JSON.parse(candidate);

        if (Array.isArray(parsed)) {
          return parsed.map(String).filter(Boolean);
        }
      } catch {
        return candidate
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      }
    }
  }

  return [];
}

function formatDate(value: Date | string) {
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

function buildBody(certificate: LinkedCertificateRow) {
  const body = String(certificate.body || "").trim();

  if (body) {
    return body;
  }

  const typeLabel = getCertificateTypeLabel(certificate.certificateType);
  const reason = String(certificate.reason || "التميز والمشاركة الفاعلة").trim();

  return `تتقدم إدارة المدرسة بخالص ${typeLabel} إلى ${certificate.recipientName}، وذلك نظير ${reason}، سائلين الله له دوام التوفيق والتميز.`;
}

function renderCertificateAttachmentPage(
  certificate: LinkedCertificateRow,
  index: number,
  total: number,
) {
  const data = parseJsonObject(certificate.dataJson);
  const issuerName = String(data.issuerName || "الموجه / رائد النشاط");
  const principalName = String(data.principalName || "مدير المدرسة");
  const title = certificate.title || `شهادة ${getCertificateTypeLabel(certificate.certificateType)}`;

  return `
    <section class="report-linked-certificate-page">
      <div class="rlc-top"></div>
      <div class="rlc-bottom"></div>
      <div class="rlc-border"></div>
      <div class="rlc-inner"></div>

      <div class="rlc-logo rlc-logo-right">شعار وزارة التعليم</div>
      <div class="rlc-logo rlc-logo-left">شعار رؤية 2030</div>

      <div class="rlc-badge">✓</div>

      <div class="rlc-content">
        <p class="rlc-kicker">شهادة مرفقة بالتقرير</p>
        <h1>${escapeHtml(title)}</h1>
        <div class="rlc-line"></div>
        <p class="rlc-intro">تتقدم إدارة المدرسة بخالص الشكر والتقدير إلى</p>
        <h2>${escapeHtml(certificate.recipientName)}</h2>
        <p class="rlc-body">${escapeHtml(buildBody(certificate))}</p>
        ${
          certificate.reason
            ? `<p class="rlc-reason">سبب التكريم: ${escapeHtml(certificate.reason)}</p>`
            : ""
        }
      </div>

      <div class="rlc-signature rlc-signature-right">
        <p>مدير المدرسة</p>
        <div></div>
        <span>${escapeHtml(principalName)}</span>
      </div>

      <div class="rlc-signature rlc-signature-left">
        <p>الموجه / رائد النشاط</p>
        <div></div>
        <span>${escapeHtml(issuerName)}</span>
      </div>

      <footer class="rlc-meta">
        <span>تاريخ الإصدار: ${escapeHtml(formatDate(certificate.issueDate))}</span>
        <span>رقم الشهادة: ${escapeHtml(certificate.certificateNumber)}</span>
        <span>الشهادة ${index + 1} من ${total}</span>
      </footer>
    </section>
  `;
}

function renderAttachmentStyles() {
  return `
    <style>
      .report-linked-certificate-page {
        width: 210mm !important;
        height: 297mm !important;
        min-width: 210mm !important;
        min-height: 297mm !important;
        max-width: 210mm !important;
        max-height: 297mm !important;
        margin: 0 auto !important;
        position: relative;
        overflow: hidden;
        background: #fbfdf9;
        color: #0f172a;
        direction: rtl;
        font-family: Arial, Tahoma, sans-serif;
        break-before: page;
        page-break-before: always;
        break-after: page;
        page-break-after: always;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .report-linked-certificate-page:last-child {
        break-after: auto;
        page-break-after: auto;
      }

      .rlc-top {
        position: absolute;
        inset-inline: 0;
        top: 0;
        height: 42mm;
        background: #0f7a57;
        border-bottom-left-radius: 45%;
        border-bottom-right-radius: 45%;
      }

      .rlc-bottom {
        position: absolute;
        inset-inline: 0;
        bottom: 0;
        height: 34mm;
        background: #0f7a57;
        border-top-left-radius: 45%;
        border-top-right-radius: 45%;
      }

      .rlc-border {
        position: absolute;
        inset: 16mm;
        border: 1.1mm solid #d6b15f;
        border-radius: 8mm;
      }

      .rlc-inner {
        position: absolute;
        inset: 22mm;
        border: .35mm solid rgba(15, 122, 87, .35);
        border-radius: 6mm;
      }

      .rlc-logo {
        position: absolute;
        top: 22mm;
        width: 42mm;
        height: 17mm;
        border-radius: 5mm;
        background: rgba(255,255,255,.94);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #0f7a57;
        font-size: 10px;
        font-weight: 900;
      }

      .rlc-logo-right { right: 24mm; }
      .rlc-logo-left { left: 24mm; }

      .rlc-badge {
        position: absolute;
        top: 47mm;
        left: 50%;
        width: 24mm;
        height: 24mm;
        transform: translateX(-50%);
        border: 1.3mm solid #d6b15f;
        border-radius: 999px;
        background: #f7f0d7;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #0f7a57;
        font-size: 28px;
        font-weight: 900;
      }

      .rlc-content {
        position: absolute;
        top: 82mm;
        left: 25mm;
        right: 25mm;
        text-align: center;
      }

      .rlc-kicker {
        margin: 0 0 5mm;
        color: #0f7a57;
        font-size: 13px;
        font-weight: 900;
      }

      .rlc-content h1 {
        margin: 0;
        color: #0f7a57;
        font-size: 31px;
        line-height: 1.25;
        font-weight: 900;
      }

      .rlc-line {
        width: 80mm;
        height: 1mm;
        background: #d6b15f;
        border-radius: 99px;
        margin: 8mm auto 0;
      }

      .rlc-intro {
        margin: 14mm 0 0;
        color: #475569;
        font-size: 18px;
        font-weight: 700;
      }

      .rlc-content h2 {
        margin: 9mm 0 0;
        color: #111827;
        font-size: 34px;
        line-height: 1.25;
        font-weight: 900;
      }

      .rlc-body {
        margin: 10mm auto 0;
        max-width: 150mm;
        color: #374151;
        font-size: 17px;
        line-height: 2;
        font-weight: 700;
      }

      .rlc-reason {
        margin: 6mm auto 0;
        color: #64748b;
        font-size: 13px;
        line-height: 1.9;
        font-weight: 800;
      }

      .rlc-signature {
        position: absolute;
        bottom: 39mm;
        width: 56mm;
        text-align: center;
        color: #374151;
        font-size: 12px;
        font-weight: 900;
      }

      .rlc-signature-right { right: 27mm; }
      .rlc-signature-left { left: 27mm; }

      .rlc-signature p {
        margin: 0;
      }

      .rlc-signature div {
        height: .55mm;
        background: #0f7a57;
        margin: 8mm 0 3mm;
      }

      .rlc-signature span {
        color: #64748b;
        font-size: 11px;
        font-weight: 700;
      }

      .rlc-meta {
        position: absolute;
        left: 50%;
        bottom: 18mm;
        transform: translateX(-50%);
        display: flex;
        flex-direction: column;
        gap: 1.5mm;
        text-align: center;
        color: #e2e8f0;
        font-size: 10px;
        font-weight: 800;
      }

      @media print {
        .report-linked-certificate-page {
          margin: 0 !important;
        }
      }
    </style>
  `;
}

export async function getLinkedCertificatesForReport(caseId: string) {
  const caseRows = await prisma.$queryRawUnsafe<CaseSchoolRow[]>(
    `
    SELECT schoolAccountId
    FROM CaseEntry
    WHERE id = ?
    LIMIT 1
    `,
    caseId,
  );

  const schoolAccountId = caseRows[0]?.schoolAccountId;

  if (!schoolAccountId) {
    return [];
  }

  const valueRows = await prisma.$queryRawUnsafe<CaseValueRow[]>(
    `
    SELECT value, jsonValue
    FROM CaseValue
    WHERE caseEntryId = ? AND fieldKey = ?
    ORDER BY updatedAt DESC
    LIMIT 1
    `,
    caseId,
    LINK_FIELD_KEY,
  );

  const ids = parseLinkedIds(valueRows[0] || null);

  if (!ids.length) {
    return [];
  }

  const placeholders = ids.map(() => "?").join(", ");

  const rows = await prisma.$queryRawUnsafe<LinkedCertificateRow[]>(
    `
    SELECT id, certificateNumber, certificateType, recipientType, recipientName,
           title, reason, body, issueDate, dataJson
    FROM IssuedCertificate
    WHERE schoolAccountId = ? AND id IN (${placeholders})
    `,
    schoolAccountId,
    ...ids,
  );

  const byId = new Map(rows.map((row) => [row.id, row]));

  return ids.map((id) => byId.get(id)).filter(Boolean) as LinkedCertificateRow[];
}

export async function appendLinkedCertificatesToReportHtml(html: string, caseId: string) {
  const certificates = await getLinkedCertificatesForReport(caseId);

  if (!certificates.length) {
    return html;
  }

  const attachmentHtml = `
    ${renderAttachmentStyles()}
    ${certificates
      .map((certificate, index) =>
        renderCertificateAttachmentPage(certificate, index, certificates.length),
      )
      .join("\n")}
  `;

  if (html.includes("</body>")) {
    return html.replace("</body>", `${attachmentHtml}</body>`);
  }

  return `${html}${attachmentHtml}`;
}