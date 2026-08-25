"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type InvoiceResponse = {
  generatedAt: string;
  invoice: {
    invoiceNumber: string;
    issueDate: string;
    note: string;
    seller: {
      name: string;
      domain: string;
      country: string;
    };
    buyer: {
      counselorName: string;
      counselorEmail: string;
      counselorJobTitle: string;
      schoolName: string;
      accountName: string;
    };
    amounts: {
      subtotalAmount: number;
      taxRate: number;
      taxAmount: number;
      totalAmount: number;
      currency: string;
    };
    item: {
      title: string;
      quantity: number;
      unitPrice: number;
      total: number;
    };
  };
  transaction: {
    id: string;
    amount: number;
    currency: string;
    method: string;
    status: string;
    externalRef: string | null;
    createdAt: string;
    updatedAt: string;
  };
  linkedBankTransfer: {
    id: string;
    amount: number;
    currency: string;
    senderName: string | null;
    receiptUrl: string | null;
    status: string;
    adminNote: string | null;
    billingCycle: string | null;
    durationDays: number | null;
    createdAt: string;
    updatedAt: string;
  } | null;
};

function formatAmount(amount: number, currency = "SAR") {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "معلقة",
    PAID: "مكتملة",
    FAILED: "فاشلة",
    REFUNDED: "مستردة",
    CANCELED: "ملغاة",
  };

  return labels[status] || status;
}

function getMethodLabel(method: string | null | undefined) {
  const labels: Record<string, string> = {
    CARD: "بطاقة",
    BANK_TRANSFER: "تحويل بنكي",
    MANUAL: "يدوي",
  };

  if (!method) return "غير محدد";
  return labels[method] || method;
}

function escapeHtml(value: unknown) {
  return String(value ?? "—")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildCompactPdfInvoiceHtml(data: InvoiceResponse) {
  const transferHtml = data.linkedBankTransfer
    ? `
      <section class="compact-section transfer">
        <h2>بيانات التحويل البنكي</h2>
        <table class="meta-table">
          <tr>
            <td><span>رقم طلب التحويل</span><strong dir="ltr">${escapeHtml(data.linkedBankTransfer.id)}</strong></td>
            <td><span>اسم المحول</span><strong>${escapeHtml(data.linkedBankTransfer.senderName || "—")}</strong></td>
          </tr>
          <tr>
            <td><span>مبلغ التحويل</span><strong>${escapeHtml(formatAmount(data.linkedBankTransfer.amount, data.linkedBankTransfer.currency))}</strong></td>
            <td><span>تاريخ الطلب</span><strong>${escapeHtml(formatDate(data.linkedBankTransfer.createdAt))}</strong></td>
          </tr>
        </table>
      </section>
    `
    : "";

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    width: 794px;
    min-height: 1123px;
    background: #ffffff;
    color: #0f172a;
    font-family: Arial, Tahoma, "Segoe UI", sans-serif;
    direction: rtl;
  }
  .invoice {
    width: 794px;
    min-height: 1123px;
    padding: 30px 34px;
    background: #ffffff;
  }
  .header {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e2e8f0;
  }
  .eyebrow {
    font-size: 13px;
    font-weight: 900;
    color: #047857;
  }
  h1 {
    margin: 6px 0 4px;
    font-size: 28px;
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
  }
  .invoice-box {
    width: 238px;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    background: #f8fafc;
    padding: 14px;
  }
  .label {
    font-size: 11px;
    font-weight: 700;
    color: #64748b;
  }
  .invoice-number {
    margin-top: 5px;
    font-size: 17px;
    font-weight: 900;
    color: #020617;
    text-align: left;
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 16px;
  }
  .compact-section {
    border: 1px solid #e2e8f0;
    border-radius: 18px;
    padding: 14px;
  }
  .meta-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0 8px;
    font-size: 12px;
  }
  .meta-table td {
    width: 50%;
    padding: 9px 10px;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    border-radius: 12px;
    vertical-align: top;
  }
  .meta-table span {
    display: block;
    margin-bottom: 4px;
    font-size: 10px;
    font-weight: 700;
    color: #64748b;
  }
  .meta-table strong {
    display: block;
    color: #0f172a;
    font-size: 12px;
    font-weight: 900;
    line-height: 1.45;
    word-break: break-word;
  }
  .items-table {
    width: 100%;
    margin-top: 16px;
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
    width: 330px;
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
  .transfer {
    margin-top: 14px;
    border-color: #f59e0b;
    background: #fffbeb;
  }
  footer {
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
    font-size: 10px;
    color: #64748b;
    line-height: 1.55;
  }
</style>
</head>
<body>
  <article id="pdf-invoice" class="invoice">
    <header class="header">
      <div>
        <div class="eyebrow">فاتورة / إيصال دفع</div>
        <h1>${escapeHtml(data.invoice.seller.name)}</h1>
        <div class="muted">${escapeHtml(data.invoice.seller.domain)} — ${escapeHtml(data.invoice.seller.country)}</div>
      </div>

      <div class="invoice-box">
        <div class="label">رقم الفاتورة</div>
        <div class="invoice-number" dir="ltr">${escapeHtml(data.invoice.invoiceNumber)}</div>
        <div class="label" style="margin-top:12px;">تاريخ الإصدار</div>
        <div style="margin-top:5px;font-size:12px;font-weight:900;color:#020617;">${escapeHtml(formatDate(data.invoice.issueDate))}</div>
      </div>
    </header>

    <section class="grid">
      <div class="compact-section">
        <h2>بيانات المستفيد</h2>
        <table class="meta-table">
          <tr>
            <td><span>الموجه/الموجهة</span><strong>${escapeHtml(data.invoice.buyer.counselorName)}</strong></td>
            <td><span>البريد</span><strong dir="ltr" style="text-align:left;">${escapeHtml(data.invoice.buyer.counselorEmail)}</strong></td>
          </tr>
          <tr>
            <td><span>المسمى الوظيفي</span><strong>${escapeHtml(data.invoice.buyer.counselorJobTitle)}</strong></td>
            <td><span>الحساب/المدرسة</span><strong>${escapeHtml(data.invoice.buyer.schoolName)}</strong></td>
          </tr>
        </table>
      </div>

      <div class="compact-section">
        <h2>بيانات العملية</h2>
        <table class="meta-table">
          <tr>
            <td><span>رقم العملية</span><strong dir="ltr" style="text-align:left;">${escapeHtml(data.transaction.id)}</strong></td>
            <td><span>طريقة الدفع</span><strong>${escapeHtml(getMethodLabel(data.transaction.method))}</strong></td>
          </tr>
          <tr>
            <td><span>حالة الدفع</span><strong>${escapeHtml(getStatusLabel(data.transaction.status))}</strong></td>
            <td><span>المرجع الخارجي</span><strong dir="ltr" style="text-align:left;">${escapeHtml(data.transaction.externalRef || "—")}</strong></td>
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
          <td style="font-weight:800;">${escapeHtml(data.invoice.item.title)}</td>
          <td>${escapeHtml(data.invoice.item.quantity)}</td>
          <td>${escapeHtml(formatAmount(data.invoice.item.unitPrice, data.invoice.amounts.currency))}</td>
          <td style="font-weight:900;">${escapeHtml(formatAmount(data.invoice.item.total, data.invoice.amounts.currency))}</td>
        </tr>
      </tbody>
    </table>

    <section class="totals-wrap">
      <div class="totals">
        <div class="total-row">
          <span>المجموع الفرعي</span>
          <strong>${escapeHtml(formatAmount(data.invoice.amounts.subtotalAmount, data.invoice.amounts.currency))}</strong>
        </div>
        <div class="total-row">
          <span>الضريبة (${escapeHtml(data.invoice.amounts.taxRate)}%)</span>
          <strong>${escapeHtml(formatAmount(data.invoice.amounts.taxAmount, data.invoice.amounts.currency))}</strong>
        </div>
        <div class="total-row grand">
          <span>الإجمالي المدفوع</span>
          <strong>${escapeHtml(formatAmount(data.invoice.amounts.totalAmount, data.invoice.amounts.currency))}</strong>
        </div>
      </div>
    </section>

    ${transferHtml}

    <footer>
      <p>${escapeHtml(data.invoice.note)}</p>
      <p>تم إصدار هذه الفاتورة آليًا من مركز المدفوعات في Teachix.</p>
    </footer>
  </article>
</body>
</html>`;
}

function InvoiceDetail({
  label,
  value,
  ltr = false,
}: {
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p
        className="mt-2 break-words text-sm font-black text-slate-950"
        dir={ltr ? "ltr" : "rtl"}
      >
        {value || "—"}
      </p>
    </div>
  );
}

export function AdminPaymentInvoicePage({ transactionId }: { transactionId: string }) {
  const [data, setData] = useState<InvoiceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadInvoice() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/dashboard/admin/payments/${transactionId}/invoice`, {
        cache: "no-store",
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر إصدار الفاتورة.");
      }

      setData(payload as InvoiceResponse);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "حدث خطأ أثناء إصدار الفاتورة."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function downloadInvoicePdf() {
    if (!data) return;

    setIsExportingPdf(true);
    setErrorMessage("");

    let iframe: HTMLIFrameElement | null = null;

    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.left = "-10000px";
      iframe.style.top = "0";
      iframe.style.width = "794px";
      iframe.style.height = "1123px";
      iframe.style.border = "0";
      iframe.setAttribute("aria-hidden", "true");

      document.body.appendChild(iframe);

      const iframeDocument = iframe.contentDocument;

      if (!iframeDocument) {
        throw new Error("تعذر تجهيز صفحة PDF.");
      }

      iframeDocument.open();
      iframeDocument.write(buildCompactPdfInvoiceHtml(data));
      iframeDocument.close();

      await new Promise((resolve) => window.setTimeout(resolve, 350));

      const invoiceElement = iframeDocument.getElementById("pdf-invoice");

      if (!invoiceElement) {
        throw new Error("تعذر العثور على قالب الفاتورة.");
      }

      const canvas = await html2canvas(invoiceElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pageWidth = 210;
      const pageHeight = 297;

      const imageWidthAtFullPage = pageWidth;
      const imageHeightAtFullPage = (canvas.height * imageWidthAtFullPage) / canvas.width;

      const finalHeight = Math.min(imageHeightAtFullPage, pageHeight);
      const finalWidth =
        imageHeightAtFullPage > pageHeight
          ? (canvas.width * pageHeight) / canvas.height
          : imageWidthAtFullPage;

      const x = (pageWidth - finalWidth) / 2;
      const y = 0;

      const image = canvas.toDataURL("image/jpeg", 0.95);
      pdf.addImage(image, "JPEG", x, y, finalWidth, finalHeight);

      const safeInvoiceNumber = data.invoice.invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, "-");
      pdf.save(`${safeInvoiceNumber}.pdf`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "تعذر تصدير الفاتورة كملف PDF."
      );
    } finally {
      if (iframe) {
        iframe.remove();
      }

      setIsExportingPdf(false);
    }
  }

  useEffect(() => {
    void loadInvoice();
  }, [transactionId]);

  return (
    <div className="space-y-6">
      <style>{`
        @page {
          size: A4;
          margin: 12mm;
        }

        @media print {
          body {
            background: white !important;
          }

          .no-print {
            display: none !important;
          }

          .invoice-page {
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
            min-height: auto !important;
            margin: 0 !important;
          }
        }
      `}</style>

      <section className="no-print rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-300">
              إصدار فاتورة
            </p>
            <h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
              فاتورة عملية الدفع
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">
              يمكنك تحميل الفاتورة كملف PDF أو طباعتها من المتصفح.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/dashboard/admin/payments/${transactionId}`}
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              العودة للتفاصيل
            </Link>

            <button
              type="button"
              onClick={() => void loadInvoice()}
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              تحديث
            </button>

            <button
              type="button"
              onClick={() => void downloadInvoicePdf()}
              disabled={!data || isExportingPdf}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              {isExportingPdf ? "جارٍ تجهيز PDF..." : "تحميل PDF"}
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              disabled={!data}
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              طباعة
            </button>
          </div>
        </div>
      </section>

      {errorMessage ? (
        <div className="no-print rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
          {errorMessage}
        </div>
      ) : null}

      {isLoading ? (
        <div className="no-print rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
          جارٍ إصدار الفاتورة...
        </div>
      ) : data ? (
        <article className="invoice-page mx-auto min-h-[297mm] w-full max-w-[210mm] rounded-[2rem] border border-slate-200 bg-white p-8 text-slate-950 shadow-sm">
          <header className="flex flex-col gap-6 border-b border-slate-200 pb-6 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-black text-emerald-700">فاتورة / إيصال دفع</p>
              <h2 className="mt-2 text-3xl font-black text-slate-950">
                {data.invoice.seller.name}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {data.invoice.seller.domain} — {data.invoice.seller.country}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 md:min-w-[260px]">
              <p className="text-xs font-bold text-slate-500">رقم الفاتورة</p>
              <p className="mt-2 text-xl font-black text-slate-950" dir="ltr">
                {data.invoice.invoiceNumber}
              </p>
              <p className="mt-4 text-xs font-bold text-slate-500">تاريخ الإصدار</p>
              <p className="mt-2 text-sm font-black text-slate-950">
                {formatDate(data.invoice.issueDate)}
              </p>
            </div>
          </header>

          <section className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 p-5">
              <h3 className="text-base font-black text-slate-950">بيانات المستفيد</h3>
              <div className="mt-4 space-y-3">
                <InvoiceDetail label="الموجه/الموجهة" value={data.invoice.buyer.counselorName} />
                <InvoiceDetail label="البريد" value={data.invoice.buyer.counselorEmail} ltr />
                <InvoiceDetail label="المسمى الوظيفي" value={data.invoice.buyer.counselorJobTitle} />
                <InvoiceDetail label="الحساب/المدرسة" value={data.invoice.buyer.schoolName} />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 p-5">
              <h3 className="text-base font-black text-slate-950">بيانات العملية</h3>
              <div className="mt-4 space-y-3">
                <InvoiceDetail label="رقم العملية" value={data.transaction.id} ltr />
                <InvoiceDetail label="طريقة الدفع" value={getMethodLabel(data.transaction.method)} />
                <InvoiceDetail label="حالة الدفع" value={getStatusLabel(data.transaction.status)} />
                <InvoiceDetail
                  label="المرجع الخارجي"
                  value={data.transaction.externalRef || "—"}
                  ltr
                />
              </div>
            </div>
          </section>

          <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="bg-slate-950 text-white">
                  <th className="px-4 py-3 font-black">الوصف</th>
                  <th className="px-4 py-3 font-black">الكمية</th>
                  <th className="px-4 py-3 font-black">سعر الوحدة</th>
                  <th className="px-4 py-3 font-black">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="px-4 py-4 font-bold text-slate-900">
                    {data.invoice.item.title}
                  </td>
                  <td className="px-4 py-4">{data.invoice.item.quantity}</td>
                  <td className="px-4 py-4">
                    {formatAmount(data.invoice.item.unitPrice, data.invoice.amounts.currency)}
                  </td>
                  <td className="px-4 py-4 font-black">
                    {formatAmount(data.invoice.item.total, data.invoice.amounts.currency)}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="mt-6 flex justify-end">
            <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between border-b border-slate-200 py-3">
                <span className="text-sm font-bold text-slate-500">المجموع الفرعي</span>
                <span className="text-sm font-black text-slate-950">
                  {formatAmount(data.invoice.amounts.subtotalAmount, data.invoice.amounts.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-200 py-3">
                <span className="text-sm font-bold text-slate-500">
                  الضريبة ({data.invoice.amounts.taxRate}%)
                </span>
                <span className="text-sm font-black text-slate-950">
                  {formatAmount(data.invoice.amounts.taxAmount, data.invoice.amounts.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between pt-4">
                <span className="text-base font-black text-slate-950">الإجمالي المدفوع</span>
                <span className="text-xl font-black text-emerald-700">
                  {formatAmount(data.invoice.amounts.totalAmount, data.invoice.amounts.currency)}
                </span>
              </div>
            </div>
          </section>

          {data.linkedBankTransfer ? (
            <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="text-base font-black text-slate-950">بيانات التحويل البنكي</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <InvoiceDetail label="رقم طلب التحويل" value={data.linkedBankTransfer.id} ltr />
                <InvoiceDetail label="اسم المحول" value={data.linkedBankTransfer.senderName || "—"} />
                <InvoiceDetail
                  label="مبلغ التحويل"
                  value={formatAmount(data.linkedBankTransfer.amount, data.linkedBankTransfer.currency)}
                />
                <InvoiceDetail label="تاريخ الطلب" value={formatDate(data.linkedBankTransfer.createdAt)} />
              </div>
            </section>
          ) : null}

          <footer className="mt-8 border-t border-slate-200 pt-5">
            <p className="text-xs leading-6 text-slate-500">
              {data.invoice.note}
            </p>
            <p className="mt-3 text-xs text-slate-400">
              تم إصدار هذه الفاتورة آليًا من مركز المدفوعات في Teachix.
            </p>
          </footer>
        </article>
      ) : null}
    </div>
  );
}
