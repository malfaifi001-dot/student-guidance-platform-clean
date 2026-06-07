"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELED";
type PaymentMethod = "CARD" | "BANK_TRANSFER" | "MANUAL";

type PaymentDetailResponse = {
  generatedAt: string;
  transaction: {
    id: string;
    subscriptionId: string | null;
    providerId: string | null;
    amount: number;
    currency: string;
    method: PaymentMethod;
    status: PaymentStatus;
    externalRef: string | null;
    metadataJson: unknown;
    createdAt: string;
    updatedAt: string;
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
      createdAt: string;
      updatedAt: string;
    } | null;
    subscription: {
      id: string;
      status: string;
      startsAt: string;
      endsAt: string | null;
      createdAt: string;
      updatedAt: string;
      plan: {
        id: string;
        name: string;
        slug: string;
      };
      schoolAccount: {
        id: string;
        name: string;
        slug: string;
        createdAt: string;
        profile: {
          schoolName: string | null;
          principalName: string | null;
          educationOffice: string | null;
          city: string | null;
        } | null;
      };
    } | null;
  };
  linkedBankTransfer: {
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
  } | null;
};

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

function getCounselorName(transaction: PaymentDetailResponse["transaction"]) {
  const metadata =
    transaction.metadataJson && typeof transaction.metadataJson === "object"
      ? (transaction.metadataJson as Record<string, unknown>)
      : null;

  const senderName = metadata?.senderName;

  return (
    transaction.requesterUser?.officialName ||
    transaction.requesterUser?.name ||
    (typeof senderName === "string" ? senderName : null) ||
    "موجه غير محدد"
  );
}

function getCounselorSubtitle(transaction: PaymentDetailResponse["transaction"]) {
  return (
    transaction.requesterUser?.jobTitle ||
    transaction.requesterUser?.email ||
    transaction.subscription?.schoolAccount.profile?.schoolName ||
    transaction.subscription?.schoolAccount.name ||
    "لا توجد بيانات إضافية"
  );
}
function InfoCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-5">
        <h2 className="text-lg font-black text-slate-950 dark:text-white">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-7 text-slate-500 dark:text-slate-400">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function DetailItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</p>
      <div
        className={`mt-2 text-sm font-black text-slate-950 dark:text-white ${
          mono ? "break-all font-mono text-left direction-ltr" : ""
        }`}
      >
        {value || "—"}
      </div>
    </div>
  );
}

export function AdminPaymentDetailPage({ transactionId }: { transactionId: string }) {
  const [data, setData] = useState<PaymentDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const transaction = data?.transaction;
  const counselorName = useMemo(() => {
    return transaction ? getCounselorName(transaction) : "موجه غير محدد";
  }, [transaction]);

  const counselorSubtitle = useMemo(() => {
    return transaction ? getCounselorSubtitle(transaction) : "لا توجد بيانات إضافية";
  }, [transaction]);

  async function loadDetails() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/dashboard/admin/payments/${transactionId}`, {
        cache: "no-store",
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر تحميل تفاصيل عملية الدفع.");
      }

      setData(payload as PaymentDetailResponse);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "حدث خطأ أثناء تحميل تفاصيل العملية."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadDetails();
  }, [transactionId]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-300">
              تفاصيل مالية
            </p>
            <h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
              تفاصيل عملية الدفع
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">
              عرض تفصيلي للعملية المالية، الاشتراك المرتبط، الحساب، ومصدر العملية.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/admin/payments"
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              العودة للمدفوعات
            </Link>
            <button
              type="button"
              onClick={() => void loadDetails()}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              تحديث
            </button>
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
          جارٍ تحميل تفاصيل العملية...
        </div>
      ) : transaction ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50/70 p-5 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                المبلغ
              </p>
              <p className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
                {formatAmount(transaction.amount, transaction.currency)}
              </p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                العملة: {transaction.currency}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                الحالة
              </p>
              <span
                className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-black ${getStatusClass(
                  transaction.status
                )}`}
              >
                {getStatusLabel(transaction.status)}
              </span>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                آخر تحديث: {formatDate(transaction.updatedAt)}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                طريقة الدفع
              </p>
              <p className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
                {getMethodLabel(transaction.method)}
              </p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                المصدر المالي للعملية.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                الموجه/الموجهة
              </p>
              <p className="mt-3 text-lg font-black text-slate-950 dark:text-white">
                {counselorName}
              </p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {counselorSubtitle}
              </p>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <InfoCard title="بيانات العملية" description="البيانات الأساسية المسجلة في PaymentTransaction.">
              <div className="grid gap-3 md:grid-cols-2">
                <DetailItem label="رقم العملية" value={transaction.id} mono />
                <DetailItem label="المرجع الخارجي" value={transaction.externalRef || "—"} mono />
                <DetailItem label="تاريخ الإنشاء" value={formatDate(transaction.createdAt)} />
                <DetailItem label="آخر تحديث" value={formatDate(transaction.updatedAt)} />
                <DetailItem label="مزود الدفع" value={transaction.provider?.name || "غير محدد"} />
                <DetailItem
                  label="حالة المزود"
                  value={
                    transaction.provider
                      ? transaction.provider.isActive
                        ? "مفعّل"
                        : "غير مفعّل"
                      : "غير مرتبط"
                  }
                />
              </div>
            </InfoCard>

            <InfoCard title="الاشتراك والباقة" description="الاشتراك المرتبط بهذه العملية المالية.">
              <div className="grid gap-3 md:grid-cols-2">
                <DetailItem label="رقم الاشتراك" value={transaction.subscription?.id || "غير مرتبط"} mono />
                <DetailItem label="حالة الاشتراك" value={transaction.subscription?.status || "—"} />
                <DetailItem label="الباقة" value={transaction.subscription?.plan.name || "—"} />
                <DetailItem
                  label="مبلغ العملية"
                  value={formatAmount(transaction.amount, transaction.currency)}
                />
                <DetailItem label="بداية الاشتراك" value={formatDate(transaction.subscription?.startsAt)} />
                <DetailItem label="نهاية الاشتراك" value={formatDate(transaction.subscription?.endsAt)} />
              </div>
            </InfoCard>
          </section>

          <InfoCard title="بيانات الموجه والحساب" description="بيانات الموجه/الموجهة والحساب المرتبط بالاشتراك.">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <DetailItem label="اسم الموجه/الموجهة" value={counselorName} />
              <DetailItem label="بيانات الموجه" value={counselorSubtitle} />
              <DetailItem label="اسم الحساب" value={transaction.subscription?.schoolAccount.name || "—"} />
              <DetailItem label="اسم المدرسة" value={transaction.subscription?.schoolAccount.profile?.schoolName || "—"} />
              <DetailItem label="القائد/المدير" value={transaction.subscription?.schoolAccount.profile?.principalName || "—"} />
              <DetailItem label="مكتب التعليم" value={transaction.subscription?.schoolAccount.profile?.educationOffice || "—"} />
              <DetailItem label="المدينة" value={transaction.subscription?.schoolAccount.profile?.city || "—"} />
            </div>
          </InfoCard>

          {data.linkedBankTransfer ? (
            <InfoCard
              title="بيانات التحويل البنكي المرتبط"
              description="هذه العملية تم إنشاؤها من طلب تحويل بنكي مقبول."
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <DetailItem label="رقم طلب التحويل" value={data.linkedBankTransfer.id} mono />
                <DetailItem label="اسم المحول" value={data.linkedBankTransfer.senderName || "—"} />
                <DetailItem
                  label="مبلغ التحويل"
                  value={formatAmount(data.linkedBankTransfer.amount, data.linkedBankTransfer.currency)}
                />
                <DetailItem label="حالة الطلب" value={getStatusLabel(data.linkedBankTransfer.status)} />
                <DetailItem label="مدة التفعيل" value={data.linkedBankTransfer.durationDays ? `${data.linkedBankTransfer.durationDays} يوم` : "—"} />
                <DetailItem label="دورة الفوترة" value={data.linkedBankTransfer.billingCycle || "—"} />
                <DetailItem label="تاريخ الطلب" value={formatDate(data.linkedBankTransfer.createdAt)} />
                <DetailItem label="آخر تحديث" value={formatDate(data.linkedBankTransfer.updatedAt)} />
                <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">الإيصال</p>
                  {data.linkedBankTransfer.receiptUrl ? (
                    <a
                      href={data.linkedBankTransfer.receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex text-sm font-black text-emerald-700 hover:underline dark:text-emerald-300"
                    >
                      فتح مرفق الإيصال
                    </a>
                  ) : (
                    <p className="mt-2 text-sm font-black text-slate-950 dark:text-white">لا يوجد مرفق</p>
                  )}
                </div>
              </div>

              {data.linkedBankTransfer.adminNote ? (
                <div className="mt-3 rounded-3xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    ملاحظة إدارية
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-800 dark:text-slate-100">
                    {data.linkedBankTransfer.adminNote}
                  </p>
                </div>
              ) : null}
            </InfoCard>
          ) : null}

          <InfoCard
            title="البيانات التقنية للعملية"
            description="بيانات مساعدة للتتبع والمراجعة، ولا تظهر للمستخدم النهائي."
          >
            <pre className="max-h-[420px] overflow-auto rounded-3xl bg-slate-950 p-5 text-left text-xs leading-6 text-slate-100 direction-ltr">
              {JSON.stringify(transaction.metadataJson || {}, null, 2)}
            </pre>
          </InfoCard>
        </>
      ) : null}
    </div>
  );
}