"use client";

import { useMemo, useState } from "react";
import { getSubscriptionPeriodLabel } from "@/lib/subscription/subscription-presentation";

type Plan = {
  id: string;
  name: string;
  slug: string;
  priceMonthly: number;
  priceYearly: number;
  isActive: boolean;
};

type Provider = {
  id: string;
  name: string;
  slug: string;
};

function formatAmount(amount: number) {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export function CheckoutPlanPage({
  plan,
  providers,
  userHasSchoolAccount,
}: {
  plan: Plan;
  providers: Provider[];
  userHasSchoolAccount: boolean;
}) {
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [providerSlug, setProviderSlug] = useState(providers[0]?.slug || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const amount = useMemo(
    () => (billingCycle === "YEARLY" ? plan.priceYearly : plan.priceMonthly),
    [billingCycle, plan.priceMonthly, plan.priceYearly]
  );

  async function startCheckout() {
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId: plan.id,
          billingCycle,
          providerSlug,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر إنشاء عملية الدفع.");
      }

      window.location.href = payload.checkoutUrl;
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "حدث خطأ أثناء إنشاء عملية الدفع."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-300">
          إتمام الاشتراك
        </p>
        <h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
          {plan.name}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">
          اختر دورة الفوترة ومزود الدفع، ثم ابدأ عملية الدفع الإلكتروني.
        </p>
      </section>

      {!userHasSchoolAccount ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
          لا يوجد حساب مدرسة مرتبط بمستخدمك الحالي، لذلك لا يمكن إنشاء checkout.
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
          {errorMessage}
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <h2 className="text-lg font-black text-slate-950 dark:text-white">
            خيارات الدفع
          </h2>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setBillingCycle("MONTHLY")}
              className={
                billingCycle === "MONTHLY"
                  ? "rounded-3xl border border-emerald-300 bg-emerald-50 p-5 text-right dark:border-emerald-900/60 dark:bg-emerald-950/30"
                  : "rounded-3xl border border-slate-200 bg-white p-5 text-right dark:border-slate-800 dark:bg-slate-950"
              }
            >
              <p className="font-black text-slate-950 dark:text-white">
                {getSubscriptionPeriodLabel("MONTHLY")}
              </p>
              <p className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-200">
                {formatAmount(plan.priceMonthly)}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setBillingCycle("YEARLY")}
              className={
                billingCycle === "YEARLY"
                  ? "rounded-3xl border border-emerald-300 bg-emerald-50 p-5 text-right dark:border-emerald-900/60 dark:bg-emerald-950/30"
                  : "rounded-3xl border border-slate-200 bg-white p-5 text-right dark:border-slate-800 dark:bg-slate-950"
              }
            >
              <p className="font-black text-slate-950 dark:text-white">
                {getSubscriptionPeriodLabel("YEARLY")}
              </p>
              <p className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-200">
                {formatAmount(plan.priceYearly)}
              </p>
            </button>
          </div>

          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
              مزود الدفع
            </span>
            <select
              value={providerSlug}
              onChange={(event) => setProviderSlug(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              {providers.length === 0 ? (
                <option value="">لا يوجد مزود دفع مفعل</option>
              ) : (
                providers.map((provider) => (
                  <option key={provider.id} value={provider.slug}>
                    {provider.name}
                  </option>
                ))
              )}
            </select>
          </label>
        </div>

        <aside className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <h2 className="text-lg font-black text-slate-950 dark:text-white">
            ملخص الطلب
          </h2>

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">الباقة</span>
              <strong className="text-slate-950 dark:text-white">{plan.name}</strong>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">الفوترة</span>
              <strong className="text-slate-950 dark:text-white">
                {getSubscriptionPeriodLabel(billingCycle)}
              </strong>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">الإجمالي</span>
              <strong className="text-2xl text-emerald-700 dark:text-emerald-200">
                {formatAmount(amount)}
              </strong>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void startCheckout()}
            disabled={
              isSubmitting ||
              !userHasSchoolAccount ||
              providers.length === 0 ||
              !providerSlug ||
              amount <= 0
            }
            className="mt-6 w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            {isSubmitting ? "جارٍ إنشاء العملية..." : "بدء الدفع"}
          </button>
        </aside>
      </section>
    </div>
  );
}
