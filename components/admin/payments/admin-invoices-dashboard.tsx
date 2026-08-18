"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { NativeDownloadLink } from "@/components/downloads/native-download-link";

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  paymentTransactionId: string;
  status: string;
  buyerName: string;
  buyerEmail: string | null;
  buyerSchoolName: string | null;
  buyerAccountName: string | null;
  itemTitle: string;
  subtotalAmount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  issuedAt: string;
  paymentTransaction: {
    id: string;
    amount: number;
    currency: string;
    method: string;
    status: string;
    externalRef: string | null;
    createdAt: string;
  };
};

type InvoicesResponse = {
  invoices: InvoiceRow[];
  metrics: {
    visibleCount: number;
    totalMatchingCount: number;
    activeCount: number;
    canceledCount: number;
    activeSubtotalAmount: number;
    activeTaxAmount: number;
    activeTotalAmount: number;
    canceledSubtotalAmount: number;
    canceledTaxAmount: number;
    canceledTotalAmount: number;
    currency: string;
  };
};

const emptyResponse: InvoicesResponse = {
  invoices: [],
  metrics: {
    visibleCount: 0,
    totalMatchingCount: 0,
    activeCount: 0,
    canceledCount: 0,
    activeSubtotalAmount: 0,
    activeTaxAmount: 0,
    activeTotalAmount: 0,
    canceledSubtotalAmount: 0,
    canceledTaxAmount: 0,
    canceledTotalAmount: 0,
    currency: "SAR",
  },
};

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

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    ISSUED: "صادرة",
    CANCELED: "ملغاة",
    DRAFT: "مسودة",
  };

  return labels[status] || status;
}

function buildInvoicesUrl({
  query,
  status,
  tax,
  from,
  to,
}: {
  query: string;
  status: string;
  tax: string;
  from: string;
  to: string;
}) {
  const params = new URLSearchParams();

  if (query.trim()) params.set("query", query.trim());
  if (status !== "ALL") params.set("status", status);
  if (tax !== "ALL") params.set("tax", tax);
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const queryString = params.toString();

  return queryString
    ? `/api/dashboard/admin/payments/invoices?${queryString}`
    : "/api/dashboard/admin/payments/invoices";
}

function buildExportUrl(filters: {
  query: string;
  status: string;
  tax: string;
  from: string;
  to: string;
}) {
  const params = new URLSearchParams();

  if (filters.query.trim()) params.set("query", filters.query.trim());
  if (filters.status !== "ALL") params.set("status", filters.status);
  if (filters.tax !== "ALL") params.set("tax", filters.tax);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);

  const queryString = params.toString();

  return queryString
    ? `/api/dashboard/admin/payments/invoices/export?${queryString}`
    : "/api/dashboard/admin/payments/invoices/export";
}

export function AdminInvoicesDashboard() {
  const [data, setData] = useState<InvoicesResponse>(emptyResponse);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [tax, setTax] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<InvoiceRow | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const filters = useMemo(
    () => ({
      query,
      status,
      tax,
      from,
      to,
    }),
    [query, status, tax, from, to]
  );

  const exportUrl = useMemo(() => buildExportUrl(filters), [filters]);

  async function loadInvoices() {
    setIsLoading(true);
    setErrorMessage("");
    setMessage("");

    try {
      const response = await fetch(buildInvoicesUrl(filters), {
        cache: "no-store",
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر تحميل الفواتير.");
      }

      setData(payload as InvoicesResponse);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "حدث خطأ أثناء تحميل الفواتير."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function cancelInvoice() {
    if (!cancelTarget) return;

    setIsCancelling(true);
    setErrorMessage("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/dashboard/admin/payments/invoices/${cancelTarget.id}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: cancelReason,
          }),
        }
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر إلغاء الفاتورة.");
      }

      setMessage(payload?.message || "تم إلغاء الفاتورة بنجاح.");
      setCancelTarget(null);
      setCancelReason("");
      await loadInvoices();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "حدث خطأ أثناء إلغاء الفاتورة."
      );
    } finally {
      setIsCancelling(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadInvoices();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [filters]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-300">
              مركز الفواتير
            </p>
            <h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
              الفواتير
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">
              الفواتير الملغاة تبقى في السجل، لكنها لا تدخل في إجمالي الفواتير السارية أو الضريبة المستحقة.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/admin/payments"
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              عمليات الدفع
            </Link>

            <Link
              href="/dashboard/admin/payments/invoice-settings"
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              إعدادات الفواتير
            </Link>

            <NativeDownloadLink
              href={exportUrl}
              fileName="invoices-export.xlsx"
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              تصدير Excel
            </NativeDownloadLink>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            الفواتير المعروضة
          </p>
          <p className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
            {data.metrics.visibleCount}
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            حسب فلتر الحالة الحالي.
          </p>
        </div>

        <div className="rounded-3xl border border-emerald-100 bg-emerald-50/70 p-5 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            الفواتير السارية
          </p>
          <p className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
            {data.metrics.activeCount}
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            لا تشمل الملغاة.
          </p>
        </div>

        <div className="rounded-3xl border border-emerald-100 bg-emerald-50/70 p-5 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            إجمالي الساري
          </p>
          <p className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
            {formatAmount(data.metrics.activeTotalAmount, data.metrics.currency)}
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            الإيراد المفوتر غير الملغى.
          </p>
        </div>

        <div className="rounded-3xl border border-amber-100 bg-amber-50/70 p-5 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            ضريبة الساري
          </p>
          <p className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
            {formatAmount(data.metrics.activeTaxAmount, data.metrics.currency)}
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            لا تشمل ضريبة الملغى.
          </p>
        </div>

        <div className="rounded-3xl border border-red-100 bg-red-50/70 p-5 shadow-sm dark:border-red-900/40 dark:bg-red-950/20">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            الفواتير الملغاة
          </p>
          <p className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
            {data.metrics.canceledCount}
          </p>
          <p className="mt-2 text-xs font-bold text-red-700 dark:text-red-200">
            {formatAmount(data.metrics.canceledTotalAmount, data.metrics.currency)}
          </p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="grid gap-3 lg:grid-cols-5">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="بحث برقم الفاتورة، الموجه، المدرسة..."
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white lg:col-span-2"
          />

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="ALL">كل الحالات</option>
            <option value="ISSUED">صادرة</option>
            <option value="CANCELED">ملغاة</option>
          </select>

          <select
            value={tax}
            onChange={(event) => setTax(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="ALL">كل الفواتير</option>
            <option value="WITH_TAX">بها ضريبة</option>
            <option value="WITHOUT_TAX">بدون ضريبة</option>
          </select>

          <button
            type="button"
            onClick={() => void loadInvoices()}
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            تحديث
          </button>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-slate-500 dark:text-slate-400">
              من تاريخ
            </span>
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold text-slate-500 dark:text-slate-400">
              إلى تاريخ
            </span>
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>
        </div>
      </section>

      {message ? (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
          {message}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
          {errorMessage}
        </div>
      ) : null}

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-5">
          <h2 className="text-lg font-black text-slate-950 dark:text-white">
            قائمة الفواتير
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            الإلغاء يغير حالة الفاتورة فقط. لا يتم حذفها من السجل المالي.
          </p>
        </div>

        {isLoading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
            جارٍ تحميل الفواتير...
          </div>
        ) : data.invoices.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-950">
            <p className="text-base font-black text-slate-900 dark:text-white">
              لا توجد فواتير مطابقة
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              غيّر الفلاتر أو أصدر فاتورة من عملية دفع مكتملة.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-right text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="px-3 py-3 font-black">رقم الفاتورة</th>
                  <th className="px-3 py-3 font-black">التاريخ</th>
                  <th className="px-3 py-3 font-black">الموجه/الموجهة</th>
                  <th className="px-3 py-3 font-black">الحساب</th>
                  <th className="px-3 py-3 font-black">الإجمالي</th>
                  <th className="px-3 py-3 font-black">الضريبة</th>
                  <th className="px-3 py-3 font-black">الحالة</th>
                  <th className="px-3 py-3 font-black">الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {data.invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                  >
                    <td className="px-3 py-4">
                      <div className="font-black text-slate-900 dark:text-white" dir="ltr">
                        {invoice.invoiceNumber}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400" dir="ltr">
                        {invoice.paymentTransactionId.slice(0, 14)}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(invoice.issuedAt)}
                    </td>
                    <td className="px-3 py-4 font-bold text-slate-800 dark:text-slate-100">
                      <div>{invoice.buyerName}</div>
                      <div className="mt-1 text-xs text-slate-500" dir="ltr">
                        {invoice.buyerEmail || "—"}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-slate-700 dark:text-slate-200">
                      {invoice.buyerSchoolName || invoice.buyerAccountName || "—"}
                    </td>
                    <td className="px-3 py-4 font-black text-slate-950 dark:text-white">
                      {formatAmount(invoice.totalAmount, invoice.currency)}
                    </td>
                    <td className="px-3 py-4 text-slate-700 dark:text-slate-200">
                      {formatAmount(invoice.taxAmount, invoice.currency)}
                      <div className="mt-1 text-xs text-slate-500">
                        {invoice.taxRate}%
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <span
                        className={
                          invoice.status === "CANCELED"
                            ? "inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-black text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200"
                            : "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
                        }
                      >
                        {getStatusLabel(invoice.status)}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/dashboard/admin/payments/invoices/${invoice.id}`}
                          className="inline-flex rounded-2xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                        >
                          فتح
                        </Link>

                        {invoice.status !== "CANCELED" ? (
                          <button
                            type="button"
                            onClick={() => setCancelTarget(invoice)}
                            className="inline-flex rounded-2xl border border-red-200 px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-50 dark:border-red-900/60 dark:text-red-200 dark:hover:bg-red-950/30"
                          >
                            إلغاء
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {cancelTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-950">
            <p className="text-sm font-bold text-red-600 dark:text-red-300">
              إلغاء فاتورة
            </p>
            <h3 className="mt-2 text-xl font-black text-slate-950 dark:text-white">
              هل تريد إلغاء الفاتورة؟
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">
              سيتم تغيير حالة الفاتورة إلى ملغاة، ولن تدخل في إجمالي الساري أو الضريبة المستحقة.
            </p>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
              <p className="text-xs font-bold text-slate-500">رقم الفاتورة</p>
              <p className="mt-1 font-black text-slate-950 dark:text-white" dir="ltr">
                {cancelTarget.invoiceNumber}
              </p>
            </div>

            <label className="mt-4 block">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                سبب الإلغاء
              </span>
              <textarea
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                rows={4}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                placeholder="اختياري"
              />
            </label>

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setCancelTarget(null);
                  setCancelReason("");
                }}
                disabled={isCancelling}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                تراجع
              </button>

              <button
                type="button"
                onClick={() => void cancelInvoice()}
                disabled={isCancelling}
                className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {isCancelling ? "جارٍ الإلغاء..." : "تأكيد الإلغاء"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
