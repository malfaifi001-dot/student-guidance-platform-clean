"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, CheckCircle2, Loader2, ShieldCheck, X } from "lucide-react";
import { PlanPaymentModal } from "@/components/payments/plan-payment-modal";

const DEFAULT_FREE_PLAN_SLUG = "default-free-auto";

type CounselorPlan = {
  id: string;
  name: string;
  slug: string;
  priceMonthly: number;
  priceYearly: number;
  durationDays: number;
  maxStudents: string;
  maxUsers: string;
  maxReports: string;
  targetAudience: string;
  services: Array<{
    id: string;
    slug: string;
    name: string;
  }>;
};

type PlansPayload = {
  plans: CounselorPlan[];
  subscription: {
    status: string;
    planName: string;
    planSlug?: string;
    endsAt: string | null;
    remainingDays: number | null;
    usable: boolean;
  } | null;
};

type BillingCycle = "monthly" | "yearly";

type EntryNotice = {
  title: string;
  message: string;
  serviceSlug?: string | null;
  actionLabel?: string;
};

type CheckoutTransaction = {
  id: string;
  amount: number;
  currency: string;
  publicKey: string;
  planId: string;
  billingCycle: BillingCycle;
};

type BankTransferFields = {
  senderName: string;
  phone: string;
  receiptUrl: string;
  note: string;
};

const emptyBankTransfer: BankTransferFields = {
  senderName: "",
  phone: "",
  receiptUrl: "",
  note: "",
};

function getPlanPrice(plan: CounselorPlan, billingCycle: BillingCycle) {
  return billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
}

function getBillingLabel(billingCycle: BillingCycle) {
  return billingCycle === "yearly" ? "سنوي" : "شهري";
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("ar-SA", {
    maximumFractionDigits: 2,
  }).format(value || 0);
}

async function readApiResponse(response: Response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

function getEntryNoticeFromUrl(): EntryNotice | null {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const reason = params.get("reason");
  const serviceSlug = params.get("service");

  if (reason === "service-not-in-plan") {
    return {
      title: "اختر باقة تشمل الخدمة المطلوبة",
      message: "الخدمة غير مشمولة في اشتراكك الحالي. اختر باقة مناسبة للمتابعة.",
      serviceSlug,
      actionLabel: "عرض الباقات",
    };
  }

  if (reason === "activation-required") {
    return {
      title: "يلزم تفعيل باقة",
      message: "اختر الباقة المناسبة ثم أكمل التفعيل أو الدفع للوصول إلى الخدمة.",
      serviceSlug,
      actionLabel: "اختيار باقة",
    };
  }

  return null;
}

export function CounselorPlansPage() {
  const [data, setData] = useState<PlansPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<CounselorPlan | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [entryNotice, setEntryNotice] = useState<EntryNotice | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [bankTransfer, setBankTransfer] = useState<BankTransferFields>(emptyBankTransfer);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"online" | "bank">("online");
  const [checkoutTransaction, setCheckoutTransaction] = useState<CheckoutTransaction | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [submittingBankTransfer, setSubmittingBankTransfer] = useState(false);
  const [activatingFreePlan, setActivatingFreePlan] = useState(false);

  async function loadPlans() {
    setLoading(true);

    try {
      const response = await fetch("/api/dashboard/plans", { cache: "no-store" });
      const result = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(result.error || "تعذر تحميل الباقات.");
      }

      setData(result);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "تعذر تحميل الباقات.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setEntryNotice(getEntryNoticeFromUrl());
    void loadPlans();
  }, []);

  const visiblePlans = useMemo(
    () => (data?.plans || []).filter((plan) => plan.slug !== DEFAULT_FREE_PLAN_SLUG),
    [data?.plans],
  );

  const selectedPrice = selectedPlan
    ? getPlanPrice(selectedPlan, billingCycle)
    : 0;
  const selectedPlanIsFree = Boolean(selectedPlan && selectedPrice <= 0);

  function selectPlan(plan: CounselorPlan) {
    setSelectedPlan(plan);
    setMessage(null);
    setCheckoutError("");
    setCheckoutTransaction(null);
    setPaymentMode("online");
    document.getElementById("selected-plan-summary")?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }

  function changeBillingCycle(nextCycle: BillingCycle) {
    setBillingCycle(nextCycle);
    setCheckoutTransaction(null);
    setCheckoutError("");
  }

  async function activateFreePlan() {
    if (!selectedPlan || !selectedPlanIsFree) return;

    setActivatingFreePlan(true);
    setMessage(null);

    try {
      const response = await fetch("/api/dashboard/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan.id,
          billingCycle,
          senderName: "",
          phone: "",
          receiptUrl: "",
          note: "",
        }),
      });
      const result = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(result.error || "تعذر تفعيل الباقة.");
      }

      await loadPlans();
      setSelectedPlan(null);
      setMessage({ type: "success", text: result.message || "تم تفعيل الباقة بنجاح." });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "تعذر تفعيل الباقة.",
      });
    } finally {
      setActivatingFreePlan(false);
    }
  }

  async function openOnlineCheckout() {
    if (!selectedPlan || selectedPlanIsFree) return;

    setPaymentModalOpen(true);
    setPaymentMode("online");
    setCheckoutError("");

    if (
      checkoutTransaction?.planId === selectedPlan.id &&
      checkoutTransaction.billingCycle === billingCycle
    ) {
      return;
    }

    setCheckoutLoading(true);

    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan.id,
          billingCycle: billingCycle === "yearly" ? "YEARLY" : "MONTHLY",
          providerSlug: "moyasar",
        }),
      });
      const result = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(result.error || "تعذر إنشاء عملية الدفع.");
      }

      const publicKey = String(result.paymentConfig?.publicKey || "");

      if (!result.transaction?.id || !publicKey) {
        throw new Error("بوابة Moyasar غير مهيأة للدفع حاليًا.");
      }

      setCheckoutTransaction({
        id: String(result.transaction.id),
        amount: Number(result.transaction.amount || selectedPrice),
        currency: String(result.transaction.currency || "SAR"),
        publicKey,
        planId: selectedPlan.id,
        billingCycle,
      });
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : "حدث خطأ أثناء إنشاء عملية الدفع.",
      );
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function submitBankTransfer() {
    if (!selectedPlan) return;

    if (!bankTransfer.senderName.trim() || !bankTransfer.phone.trim()) {
      setCheckoutError("اكتب اسم المحوّل ورقم الجوال.");
      return;
    }

    setSubmittingBankTransfer(true);
    setCheckoutError("");

    try {
      const response = await fetch("/api/dashboard/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan.id,
          billingCycle,
          ...bankTransfer,
        }),
      });
      const result = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(result.error || "تعذر إرسال طلب الاشتراك.");
      }

      await loadPlans();
      setPaymentModalOpen(false);
      setSelectedPlan(null);
      setBankTransfer(emptyBankTransfer);
      setMessage({
        type: "success",
        text: result.message || "تم إرسال طلب التحويل البنكي بنجاح.",
      });
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : "تعذر إرسال طلب الاشتراك.",
      );
    } finally {
      setSubmittingBankTransfer(false);
    }
  }

  if (loading) {
    return (
      <main className="grid min-h-[50vh] place-items-center" dir="rtl">
        <div className="text-center">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-emerald-600" />
          <p className="mt-3 text-sm font-black text-slate-500">جارٍ تحميل الباقات...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6" dir="rtl">
      {entryNotice ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <section className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl" role="dialog" aria-modal="true">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black text-emerald-700">تنبيه الاشتراك</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">{entryNotice.title}</h2>
              </div>
              <button type="button" onClick={() => setEntryNotice(null)} className="grid h-10 w-10 place-items-center rounded-full bg-slate-50 text-slate-500" aria-label="إغلاق">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-4 text-sm font-bold leading-7 text-slate-600">{entryNotice.message}</p>
            <button
              type="button"
              onClick={() => {
                setEntryNotice(null);
                document.getElementById("plans-list")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="mt-5 w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
            >
              {entryNotice.actionLabel || "عرض الباقات"}
            </button>
          </section>
        </div>
      ) : null}

      {message ? (
        <div className={[
          "rounded-2xl border px-4 py-3 text-sm font-bold",
          message.type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-rose-200 bg-rose-50 text-rose-700",
        ].join(" ")}>
          {message.text}
        </div>
      ) : null}

      <header className="flex flex-col gap-4 rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-950">اختر الباقة المناسبة</h1>
          <p className="mt-2 text-sm font-bold text-slate-500">
            اختر خطتك ثم راجع السعر وانتقل مباشرة إلى الدفع الآمن.
          </p>
        </div>

        <div className="flex w-fit rounded-2xl border border-slate-200 bg-slate-50 p-1" aria-label="دورة الفوترة">
          {(["monthly", "yearly"] as const).map((cycle) => (
            <button
              key={cycle}
              type="button"
              onClick={() => changeBillingCycle(cycle)}
              className={[
                "rounded-xl px-5 py-2 text-sm font-black transition",
                billingCycle === cycle
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-800",
              ].join(" ")}
            >
              {cycle === "monthly" ? "شهري" : "سنوي"}
            </button>
          ))}
        </div>
      </header>

      <section id="plans-list" className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visiblePlans.map((plan) => {
          const active = selectedPlan?.id === plan.id;
          const price = getPlanPrice(plan, billingCycle);
          const benefits = plan.services.slice(0, 4);

          return (
            <article
              key={plan.id}
              className={[
                "flex min-h-[350px] flex-col rounded-[1.75rem] border bg-white p-5 transition",
                active
                  ? "border-emerald-400 bg-emerald-50/30 shadow-sm"
                  : "border-slate-200 hover:border-slate-300",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-black text-slate-950">{plan.name}</h2>
                {active ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : null}
              </div>

              <div className="mt-5 flex items-end gap-2">
                <strong className="text-4xl font-black text-slate-950">{formatPrice(price)}</strong>
                <span className="pb-1 text-sm font-bold text-slate-500">ريال / {getBillingLabel(billingCycle)}</span>
              </div>

              <div className="mt-6 flex-1 space-y-3 text-sm font-bold text-slate-600">
                {benefits.map((service) => (
                  <div key={service.id} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{service.name}</span>
                  </div>
                ))}
                {benefits.length === 0 ? (
                  <div className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>الخدمات الأساسية للمنصة</span>
                  </div>
                ) : null}
              </div>

              {plan.services.length > 0 ? (
                <p className="mt-5 text-xs font-bold text-slate-400">
                  {plan.services.length} خدمات مشمولة
                </p>
              ) : null}

              <button
                type="button"
                onClick={() => selectPlan(plan)}
                className={[
                  "mt-4 h-11 rounded-2xl text-sm font-black transition",
                  active
                    ? "bg-emerald-700 text-white"
                    : "bg-slate-950 text-white hover:bg-slate-800",
                ].join(" ")}
              >
                اختيار الباقة
              </button>
            </article>
          );
        })}

        {visiblePlans.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500 md:col-span-2 xl:col-span-3">
            لا توجد باقات متاحة حاليًا.
          </div>
        ) : null}
      </section>

      {selectedPlan ? (
        <section
          id="selected-plan-summary"
          className="flex flex-col gap-4 rounded-[1.75rem] border border-emerald-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black text-emerald-700">الباقة المختارة</p>
              <h2 className="mt-1 text-lg font-black text-slate-950">{selectedPlan.name}</h2>
              <p className="mt-1 text-sm font-bold text-slate-500">
                {getBillingLabel(billingCycle)} · {formatPrice(selectedPrice)} ريال
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={selectedPlanIsFree ? () => void activateFreePlan() : () => void openOnlineCheckout()}
              disabled={activatingFreePlan || checkoutLoading}
              className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-6 text-sm font-black text-white transition hover:bg-emerald-800 disabled:opacity-60"
            >
              {activatingFreePlan || checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {selectedPlanIsFree ? "تفعيل الباقة الآن" : "المتابعة للدفع"}
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedPlan(null);
                setCheckoutTransaction(null);
              }}
              className="px-3 py-2 text-sm font-black text-slate-500 transition hover:text-slate-900"
            >
              تغيير الباقة
            </button>
          </div>
        </section>
      ) : null}

      {paymentModalOpen && selectedPlan && !selectedPlanIsFree ? (
        <PlanPaymentModal
          planName={selectedPlan.name}
          billingLabel={getBillingLabel(billingCycle)}
          services={selectedPlan.services.map((service) => service.name)}
          total={selectedPrice}
          transaction={checkoutTransaction}
          mode={paymentMode}
          isCreatingTransaction={checkoutLoading}
          isSubmittingBankTransfer={submittingBankTransfer}
          errorMessage={checkoutError}
          bankTransfer={bankTransfer}
          onBankTransferChange={(patch) => setBankTransfer((current) => ({ ...current, ...patch }))}
          onSwitchMode={(mode) => {
            setPaymentMode(mode);
            setCheckoutError("");
          }}
          onSubmitBankTransfer={() => void submitBankTransfer()}
          onClose={() => setPaymentModalOpen(false)}
        />
      ) : null}
    </main>
  );
}
