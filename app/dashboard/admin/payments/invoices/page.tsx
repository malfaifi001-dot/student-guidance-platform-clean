import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/admin-page-guard";
import { prisma } from "@/lib/prisma";

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

export default async function AdminPaymentInvoicesPage() {
  await requireAdminPage();

  const invoices = await prisma.invoice.findMany({
    orderBy: {
      issuedAt: "desc",
    },
    take: 100,
    include: {
      paymentTransaction: {
        select: {
          id: true,
          amount: true,
          currency: true,
          method: true,
          status: true,
          externalRef: true,
          createdAt: true,
        },
      },
    },
  });

  const totalIssued = invoices.length;
  const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const totalTax = invoices.reduce((sum, invoice) => sum + invoice.taxAmount, 0);

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
              استعرض الفواتير الصادرة من عمليات الدفع المكتملة، وافتح أي فاتورة لإعادة تحميلها أو طباعتها.
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
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              إعدادات الفواتير
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">عدد الفواتير</p>
          <p className="mt-3 text-2xl font-black text-slate-950 dark:text-white">{totalIssued}</p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">آخر 100 فاتورة صادرة.</p>
        </div>

        <div className="rounded-3xl border border-emerald-100 bg-emerald-50/70 p-5 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">إجمالي الفواتير</p>
          <p className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
            {formatAmount(totalAmount)}
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">إجمالي المبالغ المفوترة.</p>
        </div>

        <div className="rounded-3xl border border-amber-100 bg-amber-50/70 p-5 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">إجمالي الضريبة</p>
          <p className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
            {formatAmount(totalTax)}
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">حسب إعدادات الضريبة وقت إصدار الفاتورة.</p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-5">
          <h2 className="text-lg font-black text-slate-950 dark:text-white">آخر الفواتير</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            الفاتورة تحفظ كرقم ثابت، ويمكن فتحها وإعادة تحميل PDF في أي وقت.
          </p>
        </div>

        {invoices.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-950">
            <p className="text-base font-black text-slate-900 dark:text-white">لا توجد فواتير حتى الآن</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              عند إصدار فاتورة من عملية دفع مكتملة ستظهر هنا.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-right text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="px-3 py-3 font-black">رقم الفاتورة</th>
                  <th className="px-3 py-3 font-black">تاريخ الإصدار</th>
                  <th className="px-3 py-3 font-black">الموجه/الموجهة</th>
                  <th className="px-3 py-3 font-black">المدرسة/الحساب</th>
                  <th className="px-3 py-3 font-black">المبلغ</th>
                  <th className="px-3 py-3 font-black">الضريبة</th>
                  <th className="px-3 py-3 font-black">الحالة</th>
                  <th className="px-3 py-3 font-black">الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                  >
                    <td className="px-3 py-4">
                      <div className="font-black text-slate-900 dark:text-white" dir="ltr">
                        {invoice.invoiceNumber}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400" dir="ltr">
                        {invoice.paymentTransactionId.slice(0, 12)}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(invoice.issuedAt)}
                    </td>
                    <td className="px-3 py-4 font-bold text-slate-800 dark:text-slate-100">
                      {invoice.buyerName}
                    </td>
                    <td className="px-3 py-4 text-slate-700 dark:text-slate-200">
                      {invoice.buyerSchoolName || invoice.buyerAccountName || "—"}
                    </td>
                    <td className="px-3 py-4 font-black text-slate-950 dark:text-white">
                      {formatAmount(invoice.totalAmount, invoice.currency)}
                    </td>
                    <td className="px-3 py-4 text-slate-700 dark:text-slate-200">
                      {formatAmount(invoice.taxAmount, invoice.currency)}
                    </td>
                    <td className="px-3 py-4">
                      <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                        {getStatusLabel(invoice.status)}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <Link
                        href={`/dashboard/admin/payments/${invoice.paymentTransactionId}/invoice`}
                        className="inline-flex rounded-2xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                      >
                        فتح الفاتورة
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}