import fs from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { getCurrentSessionUser, getRequestDeviceInfo } from "@/lib/auth/current-user";
import { logAdminActivity } from "@/lib/admin/activity-log";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    invoiceId: string;
  }>;
};

function escapeHtml(value: unknown) {
  return String(value ?? "—")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatAmount(amount: number, currency = "SAR") {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9-_]/g, "-");
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    ISSUED: "صادرة",
    CANCELED: "ملغاة",
  };

  return labels[status] || status;
}

function buildInvoicePdfHtml(invoice: Awaited<ReturnType<typeof getInvoiceForPdf>>) {
  if (!invoice) {
    throw new Error("الفاتورة غير موجودة.");
  }

  const creditNote = invoice.creditNotes[0] || null;

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: #0f172a;
    font-family: Arial, Tahoma, "Segoe UI", sans-serif;
    direction: rtl;
  }
  .invoice {
    width: 210mm;
    min-height: 297mm;
    padding: 12mm;
    background: #ffffff;
  }
  .header {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    padding-bottom: 14px;
    border-bottom: 1px solid #e2e8f0;
  }
  .eyebrow {
    font-size: 13px;
    font-weight: 900;
    color: #047857;
  }
  h1 {
    margin: 6px 0 4px;
    font-size: 27px;
    line-height: 1.2;
    font-weight: 900;
    color: #020617;
  }
  h2 {
    margin: 0 0 8px;
    font-size: 15px;
    font-weight: 900;
    color: #020617;
  }
  .muted {
    color: #64748b;
    font-size: 12px;
    line-height: 1.6;
  }
  .box {
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    background: #f8fafc;
    padding: 13px;
  }
  .invoice-box {
    width: 248px;
  }
  .label {
    font-size: 10px;
    font-weight: 800;
    color: #64748b;
    margin-bottom: 4px;
  }
  .value {
    font-size: 12px;
    font-weight: 900;
    color: #0f172a;
    line-height: 1.5;
    word-break: break-word;
  }
  .invoice-number {
    font-size: 17px;
    font-weight: 900;
    color: #020617;
    text-align: left;
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 14px;
  }
  .meta-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0 7px;
    font-size: 12px;
  }
  .meta-table td {
    width: 50%;
    padding: 8px 9px;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    border-radius: 12px;
    vertical-align: top;
  }
  .items-table {
    width: 100%;
    margin-top: 14px;
    border-collapse: separate;
    border-spacing: 0;
    overflow: hidden;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    font-size: 12px;
  }
  .items-table th {
    background: #020617;
    color: #ffffff;
    padding: 10px;
    font-weight: 900;
    text-align: right;
  }
  .items-table td {
    padding: 11px 10px;
    border-bottom: 1px solid #e2e8f0;
    color: #0f172a;
  }
  .totals-wrap {
    display: flex;
    justify-content: flex-start;
    margin-top: 14px;
  }
  .totals {
    width: 335px;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    background: #f8fafc;
    padding: 12px;
  }
  .total-row {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    padding: 7px 0;
    border-bottom: 1px solid #e2e8f0;
    font-size: 12px;
  }
  .total-row span {
    font-weight: 800;
    color: #64748b;
  }
  .grand {
    border-bottom: none;
    padding-top: 10px;
    align-items: center;
  }
  .grand span {
    font-size: 13px;
    font-weight: 900;
    color: #020617;
  }
  .grand strong {
    font-size: 18px;
    font-weight: 900;
    color: #047857;
  }
  .canceled {
    margin-top: 14px;
    border: 1px solid #fecaca;
    background: #fef2f2;
    color: #991b1b;
    border-radius: 16px;
    padding: 12px;
    font-size: 12px;
    line-height: 1.7;
  }
  footer {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
    font-size: 10px;
    color: #64748b;
    line-height: 1.55;
  }
</style>
</head>
<body>
  <article class="invoice">
    <header class="header">
      <div>
        <div class="eyebrow">${invoice.status === "CANCELED" ? "فاتورة ملغاة" : "فاتورة / إيصال دفع"}</div>
        <h1>${escapeHtml(invoice.sellerName)}</h1>
        <div class="muted">
          ${escapeHtml(invoice.sellerDomain || "—")} — ${escapeHtml(invoice.sellerCountry || "—")}
          <br />
          ${escapeHtml(invoice.sellerAddress || "—")}
        </div>
      </div>

      <div class="box invoice-box">
        <div class="label">رقم الفاتورة</div>
        <div class="invoice-number" dir="ltr">${escapeHtml(invoice.invoiceNumber)}</div>

        <div class="label" style="margin-top:10px;">الحالة</div>
        <div class="value">${escapeHtml(getStatusLabel(invoice.status))}</div>

        <div class="label" style="margin-top:10px;">تاريخ الإصدار</div>
        <div class="value">${escapeHtml(formatDate(invoice.issuedAt))}</div>
      </div>
    </header>

    ${invoice.status === "CANCELED" ? `
      <section class="canceled">
        <strong>تنبيه:</strong>
        هذه الفاتورة ملغاة ولا تدخل ضمن إجمالي الفواتير السارية أو الضريبة المستحقة.
        ${creditNote ? `<br />رقم الإشعار الدائن: <span dir="ltr">${escapeHtml(creditNote.creditNoteNumber)}</span>` : ""}
      </section>
    ` : ""}

    <section class="grid">
      <div class="box">
        <h2>بيانات المستفيد</h2>
        <table class="meta-table">
          <tr>
            <td><div class="label">الموجه/الموجهة</div><div class="value">${escapeHtml(invoice.buyerName)}</div></td>
            <td><div class="label">البريد</div><div class="value" dir="ltr" style="text-align:left;">${escapeHtml(invoice.buyerEmail || "—")}</div></td>
          </tr>
          <tr>
            <td><div class="label">المسمى الوظيفي</div><div class="value">${escapeHtml(invoice.buyerJobTitle || "—")}</div></td>
            <td><div class="label">الحساب/المدرسة</div><div class="value">${escapeHtml(invoice.buyerSchoolName || invoice.buyerAccountName || "—")}</div></td>
          </tr>
        </table>
      </div>

      <div class="box">
        <h2>بيانات الجهة</h2>
        <table class="meta-table">
          <tr>
            <td><div class="label">السجل التجاري</div><div class="value">${escapeHtml(invoice.commercialRegistration || "—")}</div></td>
            <td><div class="label">الرقم الضريبي</div><div class="value">${escapeHtml(invoice.taxNumber || "—")}</div></td>
          </tr>
          <tr>
            <td><div class="label">رقم العملية</div><div class="value" dir="ltr" style="text-align:left;">${escapeHtml(invoice.paymentTransactionId)}</div></td>
            <td><div class="label">طريقة الدفع</div><div class="value">${escapeHtml(invoice.paymentTransaction.method)}</div></td>
          </tr>
        </table>
      </div>
    </section>

    <table class="items-table">
      <thead>
        <tr>
          <th>الوصف</th>
          <th>الكمية</th>
          <th>سعر الوحدة</th>
          <th>الإجمالي</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="font-weight:800;">${escapeHtml(invoice.itemTitle)}</td>
          <td>1</td>
          <td>${escapeHtml(formatAmount(invoice.totalAmount, invoice.currency))}</td>
          <td style="font-weight:900;">${escapeHtml(formatAmount(invoice.totalAmount, invoice.currency))}</td>
        </tr>
      </tbody>
    </table>

    <section class="totals-wrap">
      <div class="totals">
        <div class="total-row">
          <span>المجموع قبل الضريبة</span>
          <strong>${escapeHtml(formatAmount(invoice.subtotalAmount, invoice.currency))}</strong>
        </div>
        <div class="total-row">
          <span>الضريبة (${escapeHtml(invoice.taxRate)}%)</span>
          <strong>${escapeHtml(formatAmount(invoice.taxAmount, invoice.currency))}</strong>
        </div>
        <div class="total-row grand">
          <span>${invoice.status === "CANCELED" ? "إجمالي الفاتورة الملغاة" : "الإجمالي المدفوع"}</span>
          <strong>${escapeHtml(formatAmount(invoice.totalAmount, invoice.currency))}</strong>
        </div>
      </div>
    </section>

    <footer>
      <p>تم إصدار هذا المستند آليًا من مركز الفواتير في Teachix.</p>
      <p>الفواتير الملغاة محفوظة للأثر المالي، ولا تدخل ضمن إجمالي الفواتير السارية.</p>
    </footer>
  </article>
</body>
</html>`;
}

async function getInvoiceForPdf(invoiceId: string) {
  return prisma.invoice.findUnique({
    where: {
      id: invoiceId,
    },
    include: {
      creditNotes: {
        orderBy: {
          issuedAt: "desc",
        },
      },
      paymentTransaction: {
        select: {
          id: true,
          method: true,
          status: true,
          externalRef: true,
          createdAt: true,
        },
      },
    },
  });
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const adminError = await requireAdminApi();

  if (adminError) {
    return adminError;
  }

  const current = await getCurrentSessionUser();
  const device = await getRequestDeviceInfo();
  const { invoiceId } = await context.params;

  const invoice = await getInvoiceForPdf(invoiceId);

  if (!invoice) {
    return NextResponse.json(
      {
        error: "الفاتورة غير موجودة.",
      },
      {
        status: 404,
      }
    );
  }

  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(buildInvoicePdfHtml(invoice), {
      waitUntil: "load",
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0",
      },
    });

    const fileName = `${safeFileName(invoice.invoiceNumber)}.pdf`;
    const publicDir = path.join(process.cwd(), "public", "generated", "invoices");
    const filePath = path.join(publicDir, fileName);
    const publicUrl = `/generated/invoices/${fileName}`;

    await fs.mkdir(publicDir, {
      recursive: true,
    });

    await fs.writeFile(filePath, pdfBuffer);

    await prisma.invoice.update({
      where: {
        id: invoice.id,
      },
      data: {
        pdfUrl: publicUrl,
      },
    });

    await logAdminActivity({
      actorUserId: current?.user.id || null,
      category: "PAYMENT",
      action: "INVOICE_SERVER_PDF_GENERATED",
      severity: "SUCCESS",
      title: "توليد PDF للفاتورة من السيرفر",
      details: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        pdfUrl: publicUrl,
        status: invoice.status,
      },
      ipAddress: device.ipAddress,
      userAgent: device.userAgent,
    });

    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } finally {
    await browser.close();
  }
}
