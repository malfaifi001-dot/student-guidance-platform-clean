"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { NativeDownloadLink } from "@/components/downloads/native-download-link";

type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELED";
type PaymentMethod = "CARD" | "BANK_TRANSFER" | "MANUAL";

type PaymentMetrics = {
  totalRevenue: number;
  currentMonthRevenue: number;
  paidCount: number;
  pendingCount: number;
  failedCount: number;
  refundedCount: number;
  canceledCount: number;
  pendingBankTransferCount: number;
  pendingBankTransferAmount: number;
  averagePaidTransactionAmount: number;
  statusBreakdown: Array<{
    status: PaymentStatus;
    count: number;
    amount: number;
  }>;
  methodBreakdown: Array<{
    method: PaymentMethod;
    count: number;
    amount: number;
  }>;
};

type PaymentTransaction = {
  id: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  externalRef: string | null;
  createdAt: string;
  updatedAt: string;
  metadataJson: unknown;
  requesterUser: {
    id: string;
    name: string;
    officialName: string | null;
    email: string;
    jobTitle: string | null;
    gender: string;
  } | null;
  provider: {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
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
      profile: {
        schoolName: string | null;
      } | null;
    };
  } | null;
};

type PendingBankTransfer = {
  id: string;
  schoolAccountId: string;
  amount: number;
  currency: string;
  senderName: string | null;
  receiptUrl: string | null;
  status: PaymentStatus;
  adminNote: string | null;
  planId: string | null;
  durationDays: number | null;
  requesterUserId: string | null;
  billingCycle: string | null;
  createdAt: string;
  updatedAt: string;
  schoolAccount: {
    id: string;
    name: string;
    slug: string;
    profile: {
      schoolName: string | null;
    } | null;
  } | null;
  plan: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

type PaymentsCenterResponse = {
  generatedAt: string;
  metrics: PaymentMetrics;
  transactions: PaymentTransaction[];
  pendingBankTransfers: PendingBankTransfer[];
};

const paymentStatusOptions: Array<{ value: "ALL" | PaymentStatus; label: string }> = [
  { value: "ALL", label: "كل الحالات" },
  { value: "PAID", label: "مكتملة" },
  { value: "PENDING", label: "معلقة" },
  { value: "FAILED", label: "فاشلة" },
  { value: "REFUNDED", label: "مستردة" },
  { value: "CANCELED", label: "ملغاة" },
];

const paymentMethodOptions: Array<{ value: "ALL" | PaymentMethod; label: string }> = [
  { value: "ALL", label: "كل الطرق" },
  { value: "CARD", label: "بطاقة" },
  { value: "BANK_TRANSFER", label: "تحويل بنكي" },
  { value: "MANUAL", label: "يدوي" },
];

function formatAmount(amount: number, currency = "SAR") {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function buildPaymentsExportUrl({
  query,
  status,
  method,
  from,
  to,
}: {
  query: string;
  status: "ALL" | PaymentStatus;
  method: "ALL" | PaymentMethod;
  from: string;
  to: string;
}) {
  const params = new URLSearchParams();

  if (query.trim()) params.set("query", query.trim());
  if (status !== "ALL") params.set("status", status);
  if (method !== "ALL") params.set("method", method);
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  return `/api/dashboard/admin/payments/export?${params.toString()}`;
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

function getStatusClass(status: string) {
  if (status === "PAID") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200";
  }

  if (status === "PENDING") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200";
  }

  if (status === "FAILED" || status === "CANCELED") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200";
  }

  return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200";
}

function getTransactionMetadata(transaction: PaymentTransaction) {
  return transaction.metadataJson && typeof transaction.metadataJson === "object"
    ? (transaction.metadataJson as Record<string, unknown>)
    : null;
}

function getCounselorName(transaction: PaymentTransaction) {
  const metadata = getTransactionMetadata(transaction);
  const senderName = metadata?.senderName;

  return (
    transaction.requesterUser?.officialName ||
    transaction.requesterUser?.name ||
    (typeof senderName === "string" ? senderName : null) ||
    transaction.subscription?.schoolAccount.profile?.schoolName ||
    transaction.subscription?.schoolAccount.name ||
    "موجه غير محدد"
  );
}

function getCounselorSubtitle(transaction: PaymentTransaction) {
  if (transaction.requesterUser?.jobTitle) {
    return transaction.requesterUser.jobTitle;
  }

  if (transaction.requesterUser?.email) {
    return transaction.requesterUser.email;
  }

  return transaction.subscription?.schoolAccount.profile?.schoolName ||
    transaction.subscription?.schoolAccount.name ||
    transaction.subscription?.schoolAccount.slug ||
    "لا توجد بيانات إضافية";
}
function getSchoolName(transaction: PaymentTransaction) {
  return (
    transaction.subscription?.schoolAccount.profile?.schoolName ||
    transaction.subscription?.schoolAccount.name ||
    "غير مرتبط بحساب مدرسة"
  );
}

function getTransferSchoolName(request: PendingBankTransfer) {
  return request.schoolAccount?.profile?.schoolName || request.schoolAccount?.name || "حساب غير معروف";
}

function MetricCard({
  title,
  value,
  description,
  tone = "default",
}: {
  title: string;
  value: string | number;
  description: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-100 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/20"
      : tone === "warning"
        ? "border-amber-100 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/20"
        : tone === "danger"
          ? "border-red-100 bg-red-50/70 dark:border-red-900/40 dark:bg-red-950/20"
          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950";

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${toneClass}`}>
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</p>
      <p className="mt-3 text-2xl font-black text-slate-950 dark:text-white">{value}</p>
      <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-950">
      <p className="text-base font-black text-slate-900 dark:text-white">{title}</p>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  );
}

export function AdminPaymentsDashboard() {
  const [data, setData] = useState<PaymentsCenterResponse | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | PaymentStatus>("ALL");
  const [method, setMethod] = useState<"ALL" | PaymentMethod>("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const metrics = data?.metrics;
  const transactions = useMemo(() => data?.transactions || [], [data]);
  const pendingBankTransfers = useMemo(() => data?.pendingBankTransfers || [], [data]);

  const exportUrl = useMemo(
    () =>
      buildPaymentsExportUrl({
        query,
        status,
        method,
        from,
        to,
      }),
    [query, status, method, from, to]
  );

  async function loadPayments() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const params = new URLSearchParams();

      if (query.trim()) params.set("query", query.trim());
      if (status !== "ALL") params.set("status", status);
      if (method !== "ALL") params.set("method", method);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const response = await fetch(`/api/dashboard/admin/payments?${params.toString()}`, {
        cache: "no-store",
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر تحميل بيانات المدفوعات.");
      }

      setData(payload as PaymentsCenterResponse);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "حدث خطأ أثناء تحميل مركز المدفوعات."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function resetFilters() {
    setQuery("");
    setStatus("ALL");
    setMethod("ALL");
    setFrom("");
    setTo("");
    window.setTimeout(() => {
      void loadPayments();
    }, 0);
  }

  useEffect(() => {
    void loadPayments();
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-300">
              المركز المالي
            </p>
            <h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
              المدفوعات
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">
              تابع عمليات الدفع، الإيرادات المحصلة، التحويلات البنكية المعلقة، وحالة العمليات
              المرتبطة بالاشتراكات من مكان واحد.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadPayments()}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            تحديث البيانات
          </button>
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
          {errorMessage}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
          جارٍ تحميل بيانات المدفوعات...
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="إجمالي الإيرادات المحصلة"
              value={formatAmount(metrics?.totalRevenue || 0)}
              description="مجموع العمليات التي تم تأكيدها كمدفوعة."
              tone="success"
            />
            <MetricCard
              title="إيرادات الشهر الحالي"
              value={formatAmount(metrics?.currentMonthRevenue || 0)}
              description="إجمالي المدفوعات المكتملة منذ بداية الشهر."
            />
            <MetricCard
              title="عمليات مكتملة"
              value={metrics?.paidCount || 0}
              description="عدد عمليات الدفع التي حالتها مكتملة."
              tone="success"
            />
            <MetricCard
              title="تحويلات بنكية معلقة"
              value={metrics?.pendingBankTransferCount || 0}
              description={`بقيمة ${formatAmount(metrics?.pendingBankTransferAmount || 0)} تحتاج مراجعة.`}
              tone="warning"
            />
            <MetricCard
              title="عمليات معلقة"
              value={metrics?.pendingCount || 0}
              description="عمليات تنتظر تأكيد المزود أو مراجعة إدارية."
              tone="warning"
            />
            <MetricCard
              title="عمليات فاشلة"
              value={metrics?.failedCount || 0}
              description="عمليات لم تكتمل وتحتاج متابعة عند التكرار."
              tone="danger"
            />
            <MetricCard
              title="عمليات مستردة"
              value={metrics?.refundedCount || 0}
              description="عمليات تم تسجيلها كمبالغ مستردة."
            />
            <MetricCard
              title="متوسط العملية المكتملة"
              value={formatAmount(metrics?.averagePaidTransactionAmount || 0)}
              description="متوسط قيمة العمليات المكتملة فقط."
            />
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-5 flex flex-col gap-2">
              <h2 className="text-lg font-black text-slate-950 dark:text-white">
                فلاتر عمليات الدفع
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                ابحث برقم العملية، مرجع المزود، اسم المدرسة، الباقة، أو مزود الدفع.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="بحث..."
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white xl:col-span-2"
              />

              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as "ALL" | PaymentStatus)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                {paymentStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={method}
                onChange={(event) => setMethod(event.target.value as "ALL" | PaymentMethod)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                {paymentMethodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />

              <input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void loadPayments()}
                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                تطبيق الفلاتر
              </button>

              <NativeDownloadLink
                href={exportUrl}
                fileName="payments-export.xlsx"
                className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-black text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200 dark:hover:bg-emerald-950/50"
              >
                تصدير Excel
              </NativeDownloadLink>

              <button
                type="button"
                onClick={resetFilters}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                تصفير الفلاتر
              </button>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-950 dark:text-white">
                    عمليات الدفع
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    أحدث العمليات المالية المسجلة في النظام.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                  {transactions.length} عملية
                </span>
              </div>

              {transactions.length === 0 ? (
                <EmptyState
                  title="لا توجد عمليات دفع مطابقة"
                  description="عند تسجيل عمليات دفع أو تفعيل مزود دفع إلكتروني ستظهر العمليات هنا."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[920px] text-right text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                        <th className="px-3 py-3 font-black">العملية</th>
                        <th className="px-3 py-3 font-black">الموجه/الموجهة</th>
                        <th className="px-3 py-3 font-black">الباقة</th>
                        <th className="px-3 py-3 font-black">المبلغ</th>
                        <th className="px-3 py-3 font-black">الطريقة</th>
                        <th className="px-3 py-3 font-black">المزود</th>
                        <th className="px-3 py-3 font-black">الحالة</th>
                        <th className="px-3 py-3 font-black">التاريخ</th><th className="px-3 py-3 font-black">الإجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((transaction) => (
                        <tr
                          key={transaction.id}
                          className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                        >
                          <td className="px-3 py-4">
                            <div className="font-black text-slate-900 dark:text-white">
                              {transaction.id.slice(0, 10)}
                            </div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {transaction.externalRef || "بدون مرجع خارجي"}
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="font-bold text-slate-800 dark:text-slate-100">
                              {getCounselorName(transaction)}
                            </div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {getCounselorSubtitle(transaction)}
                            </div>
                          </td>
                          <td className="px-3 py-4 text-slate-700 dark:text-slate-200">
                            {transaction.subscription?.plan.name || "غير مرتبطة"}
                          </td>
                          <td className="px-3 py-4 font-black text-slate-950 dark:text-white">
                            {formatAmount(transaction.amount, transaction.currency)}
                          </td>
                          <td className="px-3 py-4 text-slate-700 dark:text-slate-200">
                            {getMethodLabel(transaction.method)}
                          </td>
                          <td className="px-3 py-4 text-slate-700 dark:text-slate-200">
                            {transaction.provider?.name || "غير محدد"}
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
                          <td className="px-3 py-4 text-xs text-slate-500 dark:text-slate-400">
                            {formatDate(transaction.createdAt)}
                          </td>
                          <td className="px-3 py-4">
                            <Link
                              href={`/dashboard/admin/payments/${transaction.id}`}
                              className="inline-flex rounded-2xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                            >
                              عرض التفاصيل
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-950 dark:text-white">
                    تحويلات بنكية معلقة
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    طلبات تحتاج مراجعة من صفحة التفعيلات قبل اعتماد الاشتراك.
                  </p>
                </div>
                <Link
                  href="/dashboard/admin/activations"
                  className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  فتح التفعيلات
                </Link>
              </div>

              {pendingBankTransfers.length === 0 ? (
                <EmptyState
                  title="لا توجد تحويلات معلقة"
                  description="كل طلبات التحويل البنكي الحالية تمت معالجتها."
                />
              ) : (
                <div className="space-y-3">
                  {pendingBankTransfers.map((request) => (
                    <div
                      key={request.id}
                      className="rounded-3xl border border-amber-100 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/20"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-slate-950 dark:text-white">
                            {getTransferSchoolName(request)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            المرسل: {request.senderName || "غير محدد"}
                          </p>
                        </div>
                        <span className="rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-black text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                          معلقة
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">المبلغ</p>
                          <p className="mt-1 font-black text-slate-950 dark:text-white">
                            {formatAmount(request.amount, request.currency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">الباقة</p>
                          <p className="mt-1 font-bold text-slate-800 dark:text-slate-100">
                            {request.plan?.name || "غير محددة"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(request.createdAt)}
                        </p>
                        <Link
                          href="/dashboard/admin/activations"
                          className="text-xs font-black text-amber-700 hover:underline dark:text-amber-200"
                        >
                          مراجعة الطلب
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
