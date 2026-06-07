import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{
    transactionId: string;
  }>;
};

function formatAmount(amount: number, currency = "SAR") {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

function getObject(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "بانتظار الدفع",
    PAID: "مدفوعة",
    FAILED: "فاشلة",
    CANCELED: "ملغاة",
    REFUNDED: "مستردة",
  };

  return labels[status] || status;
}

export default async function CheckoutTransactionRoutePage({ params }: PageProps) {
  const current = await getCurrentSessionUser();

  if (!current?.user) {
    redirect("/login");
  }

  const { transactionId } = await params;

  const transaction = await prisma.paymentTransaction.findUnique({
    where: {
      id: transactionId,
    },
    include: {
      provider: true,
      subscription: {
        include: {
          plan: true,
        },
      },
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
        },
      },
    },
  });

  if (!transaction) {
    notFound();
  }

  const metadata = getObject(transaction.metadataJson);
  const ownerSchoolAccountId =
    typeof metadata.schoolAccountId === "string" ? metadata.schoolAccountId : null;

  if (
    current.user.role !== "ADMIN" &&
    ownerSchoolAccountId &&
    ownerSchoolAccountId !== current.user.schoolAccountId
  ) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-300">
          الدفع الإلكتروني
        </p>
        <h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
          حالة عملية الدفع
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">
          هذه الصفحة تعرض حالة عملية الدفع بعد إنشاء checkout. عند نجاح webhook يتم تفعيل الاشتراك وإصدار الفاتورة تلقائيًا.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            الحالة
          </p>
          <p className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
            {getStatusLabel(transaction.status)}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            المبلغ
          </p>
          <p className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
            {formatAmount(transaction.amount, transaction.currency)}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            المزود
          </p>
          <p className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
            {transaction.provider?.name || "—"}
          </p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <h2 className="text-lg font-black text-slate-950 dark:text-white">
          بيانات الربط
        </h2>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
            <p className="text-xs font-bold text-slate-500">Transaction ID</p>
            <p className="mt-2 break-all text-sm font-black text-slate-950 dark:text-white" dir="ltr">
              {transaction.id}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
            <p className="text-xs font-bold text-slate-500">External Ref</p>
            <p className="mt-2 break-all text-sm font-black text-slate-950 dark:text-white" dir="ltr">
              {transaction.externalRef || "—"}
            </p>
          </div>
        </div>

        {transaction.invoice ? (
          <Link
            href={`/dashboard/admin/payments/invoices/${transaction.invoice.id}`}
            className="mt-5 inline-flex rounded-2xl border border-emerald-200 px-5 py-3 text-sm font-black text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-900/60 dark:text-emerald-200 dark:hover:bg-emerald-950/30"
          >
            فتح الفاتورة {transaction.invoice.invoiceNumber}
          </Link>
        ) : null}
      </section>
    </div>
  );
}