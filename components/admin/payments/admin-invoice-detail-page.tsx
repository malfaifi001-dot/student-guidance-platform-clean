"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type CreditNote = {
  id: string;
  creditNoteNumber: string;
  status: string;
  reason: string | null;
  subtotalAmount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  issuedAt: string;
};

type InvoiceDetailResponse = {
  invoice: {
    id: string;
    invoiceNumber: string;
    paymentTransactionId: string;
    issuedById: string | null;
    status: string;
    sellerName: string;
    sellerDomain: string | null;
    sellerCountry: string | null;
    sellerAddress: string | null;
    commercialRegistration: string | null;
    taxNumber: string | null;
    buyerName: string;
    buyerEmail: string | null;
    buyerJobTitle: string | null;
    buyerSchoolName: string | null;
    buyerAccountName: string | null;
    itemTitle: string;
    subtotalAmount: number;
    taxRate: number;
    taxAmount: number;
    totalAmount: number;
    currency: string;
    pdfUrl: string | null;
    issuedAt: string;
    createdAt: string;
    updatedAt: string;
    creditNotes: CreditNote[];
    paymentTransaction: {
      id: string;
      amount: number;
      currency: string;
      method: string;
      status: string;
      externalRef: string | null;
      createdAt: string;
      subscription: {
        id: string;
        status: string;
        startsAt: string;
        endsAt: string | null;
        plan: {
          id: string;
          name: string;
          slug: string;
        };
        schoolAccount: {
          id: string;
          name: string;
          slug: string;
          profile: {
            schoolName: string | null;
          } | null;
        };
      } | null;
      provider: {
        id: string;
        name: string;
        slug: string;
        isActive: boolean;
      } | null;
    };
  };
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
    ISSUED: "صادرة",
    CANCELED: "ملغاة",
  };

  return labels[status] || status;
}

function DetailCard({
  label,
  value,
  ltr = false,
}: {
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</p>
      <p
        className="mt-2 break-words text-sm font-black text-slate-950 dark:text-white"
        dir={ltr ? "ltr" : "rtl"}
      >
        {value || "—"}
      </p>
    </div>
  );
}

export function AdminInvoiceDetailPage({ invoiceId }: { invoiceId: string }) {
  const [data, setData] = useState<InvoiceDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadInvoice() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/dashboard/admin/payments/invoices/${invoiceId}`,
        {
          cache: "no-store",
        }
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر تحميل تفاصيل الفاتورة.");
      }

      setData(payload as InvoiceDetailResponse);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "حدث خطأ أثناء تحميل الفاتورة."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadInvoice();
  }, [invoiceId]);

  const invoice = data?.invoice;

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-300">
              تفاصيل فاتورة
            </p>
            <h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
              {invoice?.invoiceNumber || "فاتورة"}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">
              صفحة مستقلة للفاتورة حسب رقمها الداخلي، مع PDF من السيرفر وإشعارات دائنة عند الإلغاء.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/admin/payments/invoices"
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              العودة للفواتير
            </Link>

            {invoice ? (
              <Link
                href={`/dashboard/admin/payments/${invoice.paymentTransactionId}`}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                عملية الدفع
              </Link>
            ) : null}

            {invoice ? (
              <a
                href={`/api/dashboard/admin/payments/invoices/${invoice.id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                توليد PDF من السيرفر
              </a>
            ) : null}

            {invoice?.pdfUrl ? (
              <a
                href={invoice.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-emerald-200 px-5 py-3 text-sm font-black text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-900/60 dark:text-emerald-200 dark:hover:bg-emerald-950/30"
              >
                فتح PDF محفوظ
              </a>
            ) : null}
          </div>
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
          {errorMessage}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
          جارٍ تحميل تفاصيل الفاتورة...
        </div>
      ) : invoice ? (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                الحالة
              </p>
              <p className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
                {getStatusLabel(invoice.status)}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                الإجمالي
              </p>
              <p className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
                {formatAmount(invoice.totalAmount, invoice.currency)}
              </p>
            </div>

            <div className="rounded-3xl border border-amber-100 bg-amber-50/70 p-5 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                الضريبة
              </p>
              <p className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
                {formatAmount(invoice.taxAmount, invoice.currency)}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                تاريخ الإصدار
              </p>
              <p className="mt-3 text-sm font-black text-slate-950 dark:text-white">
                {formatDate(invoice.issuedAt)}
              </p>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <h2 className="text-lg font-black text-slate-950 dark:text-white">
                بيانات المستفيد
              </h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <DetailCard label="الموجه/الموجهة" value={invoice.buyerName} />
                <DetailCard label="البريد" value={invoice.buyerEmail || "—"} ltr />
                <DetailCard label="المسمى الوظيفي" value={invoice.buyerJobTitle || "—"} />
                <DetailCard
                  label="الحساب/المدرسة"
                  value={invoice.buyerSchoolName || invoice.buyerAccountName || "—"}
                />
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <h2 className="text-lg font-black text-slate-950 dark:text-white">
                بيانات الجهة والفاتورة
              </h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <DetailCard label="اسم الجهة" value={invoice.sellerName} />
                <DetailCard label="الدومين" value={invoice.sellerDomain || "—"} ltr />
                <DetailCard label="السجل التجاري" value={invoice.commercialRegistration || "—"} />
                <DetailCard label="الرقم الضريبي" value={invoice.taxNumber || "—"} />
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <h2 className="text-lg font-black text-slate-950 dark:text-white">
              بنود الفاتورة
            </h2>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-right text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="px-3 py-3 font-black">الوصف</th>
                    <th className="px-3 py-3 font-black">قبل الضريبة</th>
                    <th className="px-3 py-3 font-black">الضريبة</th>
                    <th className="px-3 py-3 font-black">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-4 font-bold text-slate-900 dark:text-white">
                      {invoice.itemTitle}
                    </td>
                    <td className="px-3 py-4">
                      {formatAmount(invoice.subtotalAmount, invoice.currency)}
                    </td>
                    <td className="px-3 py-4">
                      {formatAmount(invoice.taxAmount, invoice.currency)}
                      <span className="mx-2 text-xs text-slate-500">
                        {invoice.taxRate}%
                      </span>
                    </td>
                    <td className="px-3 py-4 font-black">
                      {formatAmount(invoice.totalAmount, invoice.currency)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {invoice.creditNotes.length > 0 ? (
            <section className="rounded-[2rem] border border-red-200 bg-red-50 p-5 shadow-sm dark:border-red-900/60 dark:bg-red-950/20">
              <h2 className="text-lg font-black text-red-800 dark:text-red-200">
                الإشعارات الدائنة
              </h2>

              <div className="mt-4 space-y-3">
                {invoice.creditNotes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-2xl border border-red-200 bg-white p-4 dark:border-red-900/60 dark:bg-slate-950"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-black text-slate-950 dark:text-white" dir="ltr">
                          {note.creditNoteNumber}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(note.issuedAt)}
                        </p>
                      </div>

                      <p className="text-lg font-black text-red-700 dark:text-red-200">
                        {formatAmount(note.totalAmount, note.currency)}
                      </p>
                    </div>

                    {note.reason ? (
                      <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                        {note.reason}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}