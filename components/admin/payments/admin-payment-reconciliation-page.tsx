"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type TransactionRow = {
  id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  externalRef: string | null;
  metadataJson: unknown;
  createdAt: string;
  provider: {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
  } | null;
  invoice: {
    id: string;
    invoiceNumber: string;
    status: string;
    totalAmount: number;
    taxAmount: number;
    creditNotes: {
      id: string;
      creditNoteNumber: string;
      status: string;
      totalAmount: number;
    }[];
  } | null;
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
    };
  } | null;
};

type ReconciliationResponse = {
  transactions: TransactionRow[];
  metrics: {
    totalCount: number;
    pendingCount: number;
    paidCount: number;
    failedCount: number;
    refundedCount: number;
    canceledCount: number;
    paidAmount: number;
    refundedAmount: number;
    netAmount: number;
    currency: string;
  };
};

const emptyResponse: ReconciliationResponse = {
  transactions: [],
  metrics: {
    totalCount: 0,
    pendingCount: 0,
    paidCount: 0,
    failedCount: 0,
    refundedCount: 0,
    canceledCount: 0,
    paidAmount: 0,
    refundedAmount: 0,
    netAmount: 0,
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

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "بانتظار الدفع",
    PAID: "مدفوعة",
    FAILED: "فاشلة",
    REFUNDED: "مستردة",
    CANCELED: "ملغاة",
  };

  return labels[status] || status;
}

function buildUrl(filters: { query: string; status: string }) {
  const params = new URLSearchParams();

  if (filters.query.trim()) params.set("query", filters.query.trim());
  if (filters.status !== "ALL") params.set("status", filters.status);

  const queryString = params.toString();

  return queryString
    ? `/api/dashboard/admin/payments/reconciliation?${queryString}`
    : "/api/dashboard/admin/payments/reconciliation";
}

function getStatusClass(status: string) {
  if (status === "PAID") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200";
  }

  if (status === "REFUNDED" || status === "CANCELED") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200";
  }

  if (status === "FAILED") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200";
  }

  return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200";
}

export function AdminPaymentReconciliationPage() {
  const [data, setData] = useState<ReconciliationResponse>(emptyResponse);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [operation, setOperation] = useState<{
    type: "cancel" | "refund" | "reconcile";
    transaction: TransactionRow;
  } | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const filters = useMemo(
    () => ({
      query,
      status,
    }),
    [query, status]
  );

  async function loadTransactions() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(buildUrl(filters), {
        cache: "no-store",
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر تحميل عمليات التسوية.");
      }

      setData(payload as ReconciliationResponse);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "حدث خطأ أثناء تحميل عمليات التسوية."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function runOperation() {
    if (!operation) return;

    setIsWorking(true);
    setErrorMessage("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/dashboard/admin/payments/${operation.transaction.id}/${operation.type}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason,
          }),
        }
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر تنفيذ العملية.");
      }

      setMessage(payload?.message || "تم تنفيذ العملية بنجاح.");
      setOperation(null);
      setReason("");
      await loadTransactions();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "حدث خطأ أثناء تنفيذ العملية."
      );
    } finally {
      setIsWorking(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTransactions();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [filters]);

  const operationTitle =
    operation?.type === "refund"
      ? "استرداد عملية دفع"
      : operation?.type === "cancel"
        ? "إلغاء عملية دفع"
        : "تسوية عملية دفع";

  const operationDescription =
    operation?.type === "refund"
      ? "سيتم تحويل العملية إلى مستردة، وإلغاء الفاتورة المرتبطة، وإنشاء إشعار دائن."
      : operation?.type === "cancel"
        ? "سيتم إلغاء العملية إذا كانت غير مدفوعة."
        : "سيتم فحص العملية المدفوعة وإنشاء فاتورة لها إذا كانت مفقودة.";

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-300">
              التسوية المالية
            </p>
            <h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
              Refund / Cancel / Reconcile
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">
              إدارة العمليات المالية المتقدمة: إلغاء العمليات غير المدفوعة، استرداد المدفوعات، وتسوية العمليات المدفوعة التي تحتاج فاتورة.
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
              href="/dashboard/admin/payments/invoices"
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              الفواتير
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            العمليات
          </p>
          <p className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
            {data.metrics.totalCount}
          </p>
        </div>

        <div className="rounded-3xl border border-emerald-100 bg-emerald-50/70 p-5 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            المدفوع
          </p>
          <p className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
            {formatAmount(data.metrics.paidAmount, data.metrics.currency)}
          </p>
          <p className="mt-2 text-xs text-slate-500">{data.metrics.paidCount} عملية</p>
        </div>

        <div className="rounded-3xl border border-red-100 bg-red-50/70 p-5 shadow-sm dark:border-red-900/40 dark:bg-red-950/20">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            المسترد
          </p>
          <p className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
            {formatAmount(data.metrics.refundedAmount, data.metrics.currency)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {data.metrics.refundedCount} عملية
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            الصافي
          </p>
          <p className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
            {formatAmount(data.metrics.netAmount, data.metrics.currency)}
          </p>
        </div>

        <div className="rounded-3xl border border-amber-100 bg-amber-50/70 p-5 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            بانتظار الدفع
          </p>
          <p className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
            {data.metrics.pendingCount}
          </p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_140px]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="بحث برقم العملية أو externalRef"
            dir="ltr"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="ALL">كل الحالات</option>
            <option value="PENDING">بانتظار الدفع</option>
            <option value="PAID">مدفوعة</option>
            <option value="FAILED">فاشلة</option>
            <option value="REFUNDED">مستردة</option>
            <option value="CANCELED">ملغاة</option>
          </select>

          <button
            type="button"
            onClick={() => void loadTransactions()}
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            تحديث
          </button>
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
        <h2 className="text-lg font-black text-slate-950 dark:text-white">
          العمليات المالية
        </h2>

        {isLoading ? (
          <div className="mt-5 rounded-3xl border border-slate-200 p-8 text-center text-sm font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
            جارٍ التحميل...
          </div>
        ) : data.transactions.length === 0 ? (
          <div className="mt-5 rounded-3xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
            <p className="font-black text-slate-900 dark:text-white">
              لا توجد عمليات مطابقة
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[1200px] text-right text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="px-3 py-3 font-black">العملية</th>
                  <th className="px-3 py-3 font-black">التاريخ</th>
                  <th className="px-3 py-3 font-black">المبلغ</th>
                  <th className="px-3 py-3 font-black">الحالة</th>
                  <th className="px-3 py-3 font-black">المزود</th>
                  <th className="px-3 py-3 font-black">الفاتورة</th>
                  <th className="px-3 py-3 font-black">الاشتراك</th>
                  <th className="px-3 py-3 font-black">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                  >
                    <td className="px-3 py-4">
                      <Link
                        href={`/dashboard/admin/payments/${transaction.id}`}
                        className="font-black text-slate-950 underline-offset-4 hover:underline dark:text-white"
                        dir="ltr"
                      >
                        {transaction.id.slice(0, 16)}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500" dir="ltr">
                        {transaction.externalRef || "—"}
                      </p>
                    </td>

                    <td className="px-3 py-4 text-xs text-slate-500">
                      {formatDate(transaction.createdAt)}
                    </td>

                    <td className="px-3 py-4 font-black text-slate-950 dark:text-white">
                      {formatAmount(transaction.amount, transaction.currency)}
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {transaction.method}
                      </p>
                    </td>

                    <td className="px-3 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${getStatusClass(
                          transaction.status
                        )}`}
                      >
                        {getStatusLabel(transaction.status)}
                      </span>
                    </td>

                    <td className="px-3 py-4 text-slate-700 dark:text-slate-200">
                      {transaction.provider?.name || "—"}
                    </td>

                    <td className="px-3 py-4">
                      {transaction.invoice ? (
                        <div>
                          <Link
                            href={`/dashboard/admin/payments/invoices/${transaction.invoice.id}`}
                            className="font-black text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-200"
                            dir="ltr"
                          >
                            {transaction.invoice.invoiceNumber}
                          </Link>
                          <p className="mt-1 text-xs text-slate-500">
                            {transaction.invoice.status}
                          </p>
                          {transaction.invoice.creditNotes.length > 0 ? (
                            <p className="mt-1 text-xs font-bold text-red-600 dark:text-red-300">
                              إشعار دائن: {transaction.invoice.creditNotes[0].creditNoteNumber}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-300">
                          لا توجد فاتورة
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-4 text-slate-700 dark:text-slate-200">
                      {transaction.subscription ? (
                        <div>
                          <p className="font-bold">
                            {transaction.subscription.plan.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {transaction.subscription.schoolAccount.name}
                          </p>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="px-3 py-4">
                      <div className="flex flex-wrap gap-2">
                        {(transaction.status === "PENDING" ||
                          transaction.status === "FAILED") ? (
                          <button
                            type="button"
                            onClick={() =>
                              setOperation({
                                type: "cancel",
                                transaction,
                              })
                            }
                            className="rounded-2xl border border-red-200 px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-50 dark:border-red-900/60 dark:text-red-200 dark:hover:bg-red-950/30"
                          >
                            إلغاء
                          </button>
                        ) : null}

                        {transaction.status === "PAID" ? (
                          <button
                            type="button"
                            onClick={() =>
                              setOperation({
                                type: "refund",
                                transaction,
                              })
                            }
                            className="rounded-2xl border border-red-200 px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-50 dark:border-red-900/60 dark:text-red-200 dark:hover:bg-red-950/30"
                          >
                            استرداد
                          </button>
                        ) : null}

                        {transaction.status === "PAID" ? (
                          <button
                            type="button"
                            onClick={() =>
                              setOperation({
                                type: "reconcile",
                                transaction,
                              })
                            }
                            className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                          >
                            تسوية
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

      {operation ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-950">
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-300">
              {operationTitle}
            </p>
            <h3 className="mt-2 text-xl font-black text-slate-950 dark:text-white">
              تأكيد العملية
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">
              {operationDescription}
            </p>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
              <p className="text-xs font-bold text-slate-500">رقم العملية</p>
              <p className="mt-1 break-all font-black text-slate-950 dark:text-white" dir="ltr">
                {operation.transaction.id}
              </p>
              <p className="mt-2 text-sm font-black text-slate-950 dark:text-white">
                {formatAmount(operation.transaction.amount, operation.transaction.currency)}
              </p>
            </div>

            <label className="mt-4 block">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                السبب أو الملاحظة
              </span>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={4}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                placeholder="اختياري"
              />
            </label>

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setOperation(null);
                  setReason("");
                }}
                disabled={isWorking}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                تراجع
              </button>

              <button
                type="button"
                onClick={() => void runOperation()}
                disabled={isWorking}
                className={
                  operation.type === "reconcile"
                    ? "rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                    : "rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-50"
                }
              >
                {isWorking ? "جارٍ التنفيذ..." : "تأكيد"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}