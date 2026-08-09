"use client";

import { CreditCard, Landmark, Loader2, X } from "lucide-react";
import { MoyasarCheckoutForm } from "./moyasar-checkout-form";

type PaymentTransactionSummary = {
  id: string;
  amount: number;
  currency: string;
  publicKey: string;
};

type BankTransferFields = {
  senderName: string;
  phone: string;
  receiptUrl: string;
  note: string;
};

export function PlanPaymentModal({
  planName,
  billingLabel,
  services,
  total,
  transaction,
  mode,
  isCreatingTransaction,
  isSubmittingBankTransfer,
  errorMessage,
  bankTransfer,
  onBankTransferChange,
  onSwitchMode,
  onSubmitBankTransfer,
  onClose,
}: {
  planName: string;
  billingLabel: string;
  services: string[];
  total: number;
  transaction: PaymentTransactionSummary | null;
  mode: "online" | "bank";
  isCreatingTransaction: boolean;
  isSubmittingBankTransfer: boolean;
  errorMessage: string;
  bankTransfer: BankTransferFields;
  onBankTransferChange: (patch: Partial<BankTransferFields>) => void;
  onSwitchMode: (mode: "online" | "bank") => void;
  onSubmitBankTransfer: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
      dir="rtl"
    >
      <section className="relative grid max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-white/70 bg-white shadow-2xl lg:grid-cols-[0.9fr_1.1fr]">
        <button
          type="button"
          onClick={onClose}
          className="absolute left-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
          aria-label="إغلاق نافذة الدفع"
        >
          <X className="h-5 w-5" />
        </button>

        <aside className="order-2 flex flex-col justify-center bg-slate-950 p-6 text-white sm:p-7 lg:order-1">
          <p className="text-xs font-black text-emerald-300">ملخص الاشتراك</p>
          <h2 className="mt-3 text-2xl font-black">{planName}</h2>
          <p className="mt-2 text-sm font-bold text-slate-300">{billingLabel}</p>

          <div className="mt-6 space-y-2.5 border-y border-white/10 py-4">
            {services.slice(0, 4).map((service, index) => (
              <div
                key={`${service}-${index}`}
                className="flex items-center gap-2 text-sm font-bold text-slate-200"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                <span>{service}</span>
              </div>
            ))}
            {services.length === 0 ? (
              <p className="text-sm font-bold text-slate-300">
                تشمل خدمات الباقة المحددة.
              </p>
            ) : null}
          </div>

          <div className="mt-5">
            <p className="text-xs font-bold text-slate-400">الإجمالي</p>
            <p className="mt-1 text-3xl font-black">
              {total.toLocaleString("ar-SA")} ريال
            </p>
          </div>
        </aside>

        <div className="order-1 p-6 pt-16 sm:p-7 sm:pt-16 lg:order-2">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
              {mode === "online" ? (
                <CreditCard className="h-5 w-5" />
              ) : (
                <Landmark className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="text-xs font-black text-emerald-700">إتمام الاشتراك</p>
              <h2
                id="payment-modal-title"
                className="mt-1 text-xl font-black text-slate-950"
              >
                {mode === "online" ? "الدفع الإلكتروني" : "التحويل البنكي"}
              </h2>
            </div>
          </div>

          {errorMessage ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          {mode === "online" ? (
            <>
              {isCreatingTransaction ? (
                <div className="mt-6 grid min-h-48 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-center">
                  <div>
                    <Loader2 className="mx-auto h-7 w-7 animate-spin text-emerald-600" />
                    <p className="mt-3 text-sm font-black text-slate-600">
                      جارٍ تجهيز عملية الدفع...
                    </p>
                  </div>
                </div>
              ) : transaction?.publicKey ? (
                <div className="mt-5">
                  <MoyasarCheckoutForm
                    amount={transaction.amount}
                    currency={transaction.currency}
                    publicKey={transaction.publicKey}
                    transactionId={transaction.id}
                    description={`اشتراك ${planName}`}
                  />
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => onSwitchMode("bank")}
                className="mx-auto mt-4 block text-sm font-black text-slate-500 underline decoration-slate-300 underline-offset-4 transition hover:text-slate-900"
              >
                أفضل التحويل البنكي
              </button>
            </>
          ) : (
            <>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <input
                  value={bankTransfer.senderName}
                  onChange={(event) =>
                    onBankTransferChange({ senderName: event.target.value })
                  }
                  placeholder="اسم المحوّل"
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-emerald-400"
                />
                <input
                  value={bankTransfer.phone}
                  onChange={(event) =>
                    onBankTransferChange({ phone: event.target.value })
                  }
                  placeholder="رقم الجوال"
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-emerald-400"
                />
                <input
                  value={bankTransfer.receiptUrl}
                  onChange={(event) =>
                    onBankTransferChange({ receiptUrl: event.target.value })
                  }
                  placeholder="رقم المرجع أو رابط الإيصال"
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-emerald-400 sm:col-span-2"
                />
                <textarea
                  value={bankTransfer.note}
                  onChange={(event) =>
                    onBankTransferChange({ note: event.target.value })
                  }
                  placeholder="ملاحظة اختيارية"
                  className="min-h-24 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-emerald-400 sm:col-span-2"
                />
              </div>

              <button
                type="button"
                onClick={onSubmitBankTransfer}
                disabled={isSubmittingBankTransfer}
                className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {isSubmittingBankTransfer ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Landmark className="h-5 w-5" />
                )}
                {isSubmittingBankTransfer
                  ? "جارٍ إرسال الطلب..."
                  : "إرسال طلب التحويل"}
              </button>

              <button
                type="button"
                onClick={() => onSwitchMode("online")}
                className="mx-auto mt-4 block text-sm font-black text-emerald-700 underline decoration-emerald-200 underline-offset-4"
              >
                العودة للدفع الإلكتروني
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
