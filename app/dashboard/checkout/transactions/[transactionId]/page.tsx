import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MoyasarCheckoutForm } from "@/components/payments/moyasar-checkout-form";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { getPublicProviderConfig } from "@/lib/payments/electronic-payments";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{
    transactionId: string;
  }>;
  searchParams: Promise<{
    payment?: string;
  }>;
};

function formatAmount(
  amount: number,
  currency = "SAR"
) {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

function getObject(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
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

function getPaymentMessage(
  payment: string | undefined
) {
  if (payment === "success") {
    return {
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200",
      text: "تم التحقق من عملية الدفع وتفعيل الاشتراك بنجاح.",
    };
  }

  if (payment === "failed") {
    return {
      className:
        "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200",
      text: "لم تكتمل عملية الدفع. يمكنك المحاولة مرة أخرى.",
    };
  }

  if (payment === "pending") {
    return {
      className:
        "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200",
      text: "عملية الدفع ما زالت قيد المعالجة.",
    };
  }

  return null;
}

export default async function CheckoutTransactionRoutePage({
  params,
  searchParams,
}: PageProps) {
  const current = await getCurrentSessionUser();

  if (!current?.user) {
    redirect("/login");
  }

  const { transactionId } = await params;
  const query = await searchParams;

  const transaction =
    await prisma.paymentTransaction.findUnique({
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

  const metadata = getObject(
    transaction.metadataJson
  );

  const ownerSchoolAccountId =
    typeof metadata.schoolAccountId === "string"
      ? metadata.schoolAccountId
      : null;

  if (
    current.user.role !== "ADMIN" &&
    ownerSchoolAccountId &&
    ownerSchoolAccountId !==
      current.user.schoolAccountId
  ) {
    redirect("/dashboard");
  }

  const providerConfig =
    getPublicProviderConfig(
      transaction.provider?.configJson
    );

  const isMoyasar =
    transaction.provider?.slug === "moyasar";

  const planName =
    typeof metadata.planName === "string"
      ? metadata.planName
      : "اشتراك منصة التوجيه الطلابي";

  const paymentMessage =
    getPaymentMessage(query.payment);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-300">
          الدفع الإلكتروني
        </p>

        <h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
          إتمام عملية الدفع
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">
          أكمل عملية الدفع، وبعد العودة سيتم التحقق من العملية من الخادم قبل تفعيل الاشتراك.
        </p>
      </section>

      {paymentMessage ? (
        <div
          className={`rounded-3xl border p-5 text-sm font-bold ${paymentMessage.className}`}
        >
          {paymentMessage.text}
        </div>
      ) : null}

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
            {formatAmount(
              transaction.amount,
              transaction.currency
            )}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            مزود الدفع
          </p>

          <p className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
            {transaction.provider?.name || "—"}
          </p>
        </div>
      </section>

      {transaction.status === "PENDING" &&
      isMoyasar &&
      providerConfig.publicKey ? (
        <MoyasarCheckoutForm
          amount={transaction.amount}
          currency={transaction.currency}
          publicKey={providerConfig.publicKey}
          transactionId={transaction.id}
          description={`اشتراك ${planName}`}
        />
      ) : null}

      {transaction.status === "PENDING" &&
      isMoyasar &&
      !providerConfig.publicKey ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          مفتاح Moyasar العام غير مضبوط. راجع إعدادات مزود الدفع.
        </div>
      ) : null}

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <h2 className="text-lg font-black text-slate-950 dark:text-white">
          بيانات العملية
        </h2>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
            <p className="text-xs font-bold text-slate-500">
              Transaction ID
            </p>

            <p
              className="mt-2 break-all text-sm font-black text-slate-950 dark:text-white"
              dir="ltr"
            >
              {transaction.id}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
            <p className="text-xs font-bold text-slate-500">
              External Ref
            </p>

            <p
              className="mt-2 break-all text-sm font-black text-slate-950 dark:text-white"
              dir="ltr"
            >
              {transaction.externalRef || "—"}
            </p>
          </div>
        </div>

        {transaction.invoice ? (
          <Link
            href={`/dashboard/admin/payments/invoices/${transaction.invoice.id}`}
            className="mt-5 inline-flex rounded-2xl border border-emerald-200 px-5 py-3 text-sm font-black text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-900/60 dark:text-emerald-200 dark:hover:bg-emerald-950/30"
          >
            فتح الفاتورة{" "}
            {transaction.invoice.invoiceNumber}
          </Link>
        ) : null}
      </section>
    </div>
  );
}