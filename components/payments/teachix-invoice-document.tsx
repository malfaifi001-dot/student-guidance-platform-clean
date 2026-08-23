export type TeachixInvoiceData = {
  invoice: {
    invoiceNumber: string;
    issueDate: string | Date;
    status: string;
    note: string;
    seller: {
      name: string;
      domain: string;
      country: string;
      address: string;
      commercialRegistration: string;
      taxNumber: string;
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
    createdAt: string | Date;
    updatedAt: string | Date;
  };
};

function formatAmount(value: number, currency: string) {
  return `${new Intl.NumberFormat("ar-SA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0)} ${currency || "SAR"}`;
}

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function paymentMethodLabel(value: string) {
  const labels: Record<string, string> = {
    MOYASAR: "الدفع الإلكتروني",
    TABBY: "Tabby",
    BANK_TRANSFER: "تحويل بنكي",
  };
  return labels[value] || value || "—";
}

export function TeachixInvoiceDocument({ data }: { data: TeachixInvoiceData }) {
  const { invoice, transaction } = data;
  const currency = invoice.amounts.currency || transaction.currency || "SAR";

  return (
    <article className="teachix-invoice-page mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white p-7 text-slate-900 shadow-xl print:min-h-0 print:max-w-none print:shadow-none sm:p-10">
      <header className="flex items-start justify-between gap-6 border-b-2 border-sky-700 pb-6">
        <div>
          <p className="text-2xl font-black tracking-tight text-sky-800">Teachix</p>
          <p className="mt-1 text-xs font-bold text-slate-500">{invoice.seller.name}</p>
        </div>
        <div className="text-left">
          <p className="text-2xl font-black">فاتورة</p>
          <p className="mt-2 text-sm font-bold text-slate-500">
            رقم الفاتورة: <span className="text-slate-900">{invoice.invoiceNumber}</span>
          </p>
          <p className="mt-1 text-sm font-bold text-slate-500">
            تاريخ الإصدار: <span className="text-slate-900">{formatDate(invoice.issueDate)}</span>
          </p>
        </div>
      </header>

      <section className="mt-7 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-xs font-black uppercase text-sky-800">البائع</h2>
          <p className="mt-3 font-black">{invoice.seller.name}</p>
          <p className="mt-1 text-sm text-slate-600">{invoice.seller.address}</p>
          <p className="mt-1 text-sm text-slate-600">السجل التجاري: {invoice.seller.commercialRegistration}</p>
          <p className="mt-1 text-sm text-slate-600">الرقم الضريبي: {invoice.seller.taxNumber}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-xs font-black uppercase text-sky-800">العميل</h2>
          <p className="mt-3 font-black">{invoice.buyer.schoolName}</p>
          <p className="mt-1 text-sm text-slate-600">{invoice.buyer.accountName}</p>
          <p className="mt-1 text-sm text-slate-600">{invoice.buyer.counselorName}</p>
          <p className="mt-1 text-sm text-slate-600">{invoice.buyer.counselorEmail}</p>
        </div>
      </section>

      <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200">
        <table className="w-full border-collapse text-right text-sm">
          <thead className="bg-sky-800 text-white">
            <tr>
              <th className="p-3">الوصف</th>
              <th className="p-3 text-center">الكمية</th>
              <th className="p-3 text-center">سعر الوحدة</th>
              <th className="p-3 text-center">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="p-3 font-black">{invoice.item.title}</td>
              <td className="p-3 text-center">{invoice.item.quantity}</td>
              <td className="p-3 text-center">{formatAmount(invoice.item.unitPrice, currency)}</td>
              <td className="p-3 text-center font-black">{formatAmount(invoice.item.total, currency)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mt-6 flex justify-end">
        <dl className="w-full max-w-sm space-y-2 text-sm">
          <div className="flex justify-between gap-6"><dt>المبلغ قبل الضريبة</dt><dd className="font-bold">{formatAmount(invoice.amounts.subtotalAmount, currency)}</dd></div>
          <div className="flex justify-between gap-6"><dt>الضريبة ({invoice.amounts.taxRate}%)</dt><dd className="font-bold">{formatAmount(invoice.amounts.taxAmount, currency)}</dd></div>
          <div className="flex justify-between gap-6 border-t-2 border-slate-900 pt-3 text-lg font-black"><dt>الإجمالي</dt><dd>{formatAmount(invoice.amounts.totalAmount, currency)}</dd></div>
        </dl>
      </section>

      <section className="mt-8 grid gap-4 rounded-2xl border border-slate-200 p-4 text-sm sm:grid-cols-2">
        <div><span className="font-black">حالة الدفع:</span> مدفوعة</div>
        <div><span className="font-black">طريقة الدفع:</span> {paymentMethodLabel(transaction.method)}</div>
        <div><span className="font-black">مرجع العملية:</span> {transaction.externalRef || transaction.id}</div>
        <div><span className="font-black">تاريخ الدفع:</span> {formatDate(transaction.updatedAt)}</div>
      </section>

      <footer className="mt-10 border-t border-slate-200 pt-5 text-center text-xs font-bold text-slate-500">
        {invoice.note}
      </footer>
    </article>
  );
}
