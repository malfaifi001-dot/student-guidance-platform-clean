"use client";

import { Check, CreditCard, Landmark, Loader2, X } from "lucide-react";
import { MoyasarCheckoutForm } from "./moyasar-checkout-form";
import { TEACHIX_WHATSAPP_URL } from "@/lib/marketing/contact-details";
import { openExternalUrl } from "@/lib/native/external-url-handler";

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

type CouponSummary = {
  couponCode: string;
  promotionName: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  originalAmount: number;
  discountAmount: number;
};

export function PlanPaymentModal({
  planName,
  billingLabel,
  total,
  couponCode,
  coupon,
  couponLoading,
  couponError,
  transaction,
  mode,
  isCreatingTransaction,
  isSubmittingBankTransfer,
  errorMessage,
  bankTransfer,
  onBankTransferChange,
  onSwitchMode,
  onSubmitBankTransfer,
  onCouponCodeChange,
  onApplyCoupon,
  onRemoveCoupon,
  isFreeActivation = false,
  isActivatingFreePlan = false,
  isBagMode = false,
  onActivateFreePlan,
  onClose,
}: {
  planName: string;
  billingLabel: string;
  total: number;
  couponCode: string;
  coupon: CouponSummary | null;
  couponLoading: boolean;
  couponError: string;
  transaction: PaymentTransactionSummary | null;
  mode: "online" | "bank";
  isCreatingTransaction: boolean;
  isSubmittingBankTransfer: boolean;
  errorMessage: string;
  bankTransfer: BankTransferFields;
  onBankTransferChange: (patch: Partial<BankTransferFields>) => void;
  onSwitchMode: (mode: "online" | "bank") => void;
  onSubmitBankTransfer: () => void;
  onCouponCodeChange: (value: string) => void;
  onApplyCoupon: () => void;
  onRemoveCoupon: () => void;
  isFreeActivation?: boolean;
  isActivatingFreePlan?: boolean;
  isBagMode?: boolean;
  onActivateFreePlan?: () => void;
  onClose: () => void;
}) {
  const hasDiscount = Boolean(
    coupon && coupon.discountAmount > 0 && coupon.originalAmount !== total,
  );

  function openTabbyWhatsApp() {
    const message = [
      "مرحبًا، أرغب في الدفع عبر Tabby.",
      `${isBagMode ? "الحقيبة" : "الباقة"}: ${planName}`,
      `المدة: ${billingLabel}`,
      `المبلغ: ${total.toLocaleString("ar-SA")} ريال`,
      "أرجو إرسال رابط الدفع عبر Tabby.",
    ].join("\n");

    void openExternalUrl(`${TEACHIX_WHATSAPP_URL}?text=${encodeURIComponent(message)}`);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
      dir="rtl"
    >
      <section className="relative grid max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] border border-sky-100 bg-white shadow-2xl shadow-sky-950/20 lg:grid-cols-[0.95fr_1.05fr]">
        <button
          type="button"
          onClick={onClose}
          className="absolute left-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
          aria-label="إغلاق نافذة الدفع"
        >
          <X className="h-5 w-5" />
        </button>

        <aside className="order-1 flex flex-col justify-center border-t border-sky-100 bg-gradient-to-br from-sky-700 via-sky-600 to-cyan-600 p-6 text-white sm:p-7 lg:order-1 lg:border-l lg:border-t-0">
          <p className="text-xs font-black text-sky-100">{isBagMode ? "ملخص الحقيبة" : "ملخص الاشتراك"}</p>
          <h2 className="mt-3 text-2xl font-black">{planName}</h2>
          <p className="mt-2 text-sm font-bold text-sky-100">{billingLabel}</p>

          <div className="mt-6 flex items-center gap-2 border-y border-white/20 py-4 text-sm font-bold text-sky-50">
            <Check className="h-4 w-4 shrink-0 text-cyan-200" />
            <span>{isBagMode ? "أدوات ومواد تعليمية" : "شاملة جميع الخدمات"}</span>
          </div>

          <div className="mt-5 rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-sm font-black text-white">هل لديك كوبون خصم؟</p>
            <div className="mt-3 flex gap-2">
              <input
                value={couponCode}
                onChange={(event) => onCouponCodeChange(event.target.value.toUpperCase())}
                disabled={couponLoading || Boolean(coupon)}
                placeholder="أدخل الكود"
                dir="ltr"
                aria-label="رمز كوبون الخصم"
                className="h-11 min-w-0 flex-1 rounded-2xl border border-white/30 bg-white px-3 text-sm font-black uppercase text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-200 focus:ring-2 focus:ring-cyan-200/40 disabled:bg-sky-50"
              />
              {coupon ? (
                <button type="button" onClick={onRemoveCoupon} disabled={couponLoading || isActivatingFreePlan} className="h-11 shrink-0 rounded-2xl border border-white/30 bg-white/15 px-4 text-xs font-black text-white transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60">
                  إزالة
                </button>
              ) : (
                <button type="button" onClick={onApplyCoupon} disabled={couponLoading || !couponCode.trim()} className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-xs font-black text-sky-700 shadow-sm transition hover:bg-sky-50 disabled:opacity-60">
                  {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  تطبيق
                </button>
              )}
            </div>
            {couponError ? <p className="mt-2 text-xs font-bold text-rose-100">{couponError}</p> : null}
            {coupon ? (
              <div className="mt-3 rounded-2xl bg-white/15 p-3 text-xs font-bold text-sky-50">
                <p className="font-black text-white">الكود المطبق: {coupon.couponCode}</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span>السعر قبل الخصم</span>
                  <span>{coupon.originalAmount.toLocaleString("ar-SA")} ريال</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <span>الخصم</span>
                  <span>-{coupon.discountAmount.toLocaleString("ar-SA")} ريال</span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-5 border-t border-white/20 pt-5">
            <p className="text-xs font-bold text-sky-100">الإجمالي</p>
            {hasDiscount && coupon ? (
              <div className="mt-2 flex flex-wrap items-center gap-3" aria-live="polite">
                <span className="relative text-lg font-black text-sky-100/80">
                  {coupon.originalAmount.toLocaleString("ar-SA")} ريال
                  <span className="absolute inset-x-[-0.2rem] top-1/2 h-0.5 -rotate-6 animate-in fade-in slide-in-from-right-full bg-rose-300 duration-300 motion-reduce:animate-none" aria-hidden="true" />
                </span>
                <span className="animate-in fade-in slide-in-from-bottom-1 zoom-in-95 text-3xl font-black text-white duration-300 motion-reduce:animate-none">
                  {total.toLocaleString("ar-SA")} ريال
                </span>
              </div>
            ) : (
              <p className="mt-1 text-3xl font-black">
                {total.toLocaleString("ar-SA")} ريال
              </p>
            )}
          </div>
        </aside>

        <div className="order-2 p-6 pt-16 sm:p-7 sm:pt-16 lg:order-2">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-50 text-sky-700">
              {mode === "online" ? (
                <CreditCard className="h-5 w-5" />
              ) : (
                <Landmark className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="text-xs font-black text-sky-700">{isBagMode ? "إتمام شراء الحقيبة" : "إتمام الاشتراك"}</p>
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

          {isFreeActivation ? (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
              {isActivatingFreePlan ? (
                <>
                  <Loader2 className="mx-auto h-7 w-7 animate-spin text-emerald-600" />
                  <p className="mt-3 text-sm font-black text-emerald-800">
                    {isBagMode ? "جاري تجهيز شراء الحقيبة والتحقق من الكوبون..." : "جاري تفعيل الباقة والتحقق من الكوبون..."}
                  </p>
                </>
              ) : errorMessage ? (
                <>
                  <p className="text-sm font-black text-rose-700">{isBagMode ? "تعذر تجهيز شراء الحقيبة." : "تعذر تفعيل الباقة."}</p>
                  {onActivateFreePlan ? (
                    <button
                      type="button"
                      onClick={onActivateFreePlan}
                      className="mt-4 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-800"
                    >
                      إعادة المحاولة
                    </button>
                  ) : null}
                </>
              ) : (
                <p className="text-sm font-black text-emerald-800">
                  {isBagMode ? "تم التحقق من الكوبون. جاري تجهيز شراء الحقيبة..." : "تم التحقق من الكوبون. جاري تفعيل الباقة..."}
                </p>
              )}
            </div>
          ) : mode === "online" ? (
            <>
              {isCreatingTransaction ? (
                <div className="mt-6 grid min-h-48 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-center">
                  <div>
                    <Loader2 className="mx-auto h-7 w-7 animate-spin text-sky-600" />
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
                    description={`${isBagMode ? "شراء الحقيبة الشاملة" : "اشتراك"} ${planName}`}
                  />
                </div>
              ) : null}

              <div className="mx-auto mt-5 border-t border-slate-100 pt-4 text-center">
                <p className="text-xs font-black text-slate-500">الدفع بواسطة</p>
                <button
                  type="button"
                  onClick={openTabbyWhatsApp}
                  className="mx-auto mt-2 flex min-h-12 min-w-28 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm transition hover:border-sky-300 hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2"
                  aria-label="الدفع بواسطة Tabby عبر واتساب"
                >
                  <img
                    src="/brand/payments/tabby.svg"
                    alt="Tabby"
                    className="h-7 w-auto max-w-24 object-contain"
                  />
                </button>
                <p className="mt-2 text-[11px] font-bold text-slate-400">
                  اطلب رابط الدفع عبر واتساب
                </p>
              </div>
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
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-sky-400"
                />
                <input
                  value={bankTransfer.phone}
                  onChange={(event) =>
                    onBankTransferChange({ phone: event.target.value })
                  }
                  placeholder="رقم الجوال"
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-sky-400"
                />
                <input
                  value={bankTransfer.receiptUrl}
                  onChange={(event) =>
                    onBankTransferChange({ receiptUrl: event.target.value })
                  }
                  placeholder="رقم المرجع أو رابط الإيصال"
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-sky-400 sm:col-span-2"
                />
                <textarea
                  value={bankTransfer.note}
                  onChange={(event) =>
                    onBankTransferChange({ note: event.target.value })
                  }
                  placeholder="ملاحظة اختيارية"
                  className="min-h-24 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-sky-400 sm:col-span-2"
                />
              </div>

              <button
                type="button"
                onClick={onSubmitBankTransfer}
                disabled={isSubmittingBankTransfer}
                className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-sky-700 text-sm font-black text-white transition hover:bg-sky-800 disabled:opacity-60"
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
                className="mx-auto mt-4 block text-sm font-black text-sky-700 underline decoration-sky-200 underline-offset-4"
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
