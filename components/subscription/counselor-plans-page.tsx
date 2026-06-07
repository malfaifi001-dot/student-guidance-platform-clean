"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Landmark,
  Loader2,
  ShieldCheck,
  Sparkles,
  WalletCards,
  X,
} from "lucide-react";

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
    endsAt: string | null;
    remainingDays: number | null;
    usable: boolean;
  } | null;
};

type BillingCycle = "monthly" | "yearly";
type PaymentMethod = "bank" | "online";

type EntryNotice = {
  title: string;
  message: string;
  serviceSlug?: string | null;
  actionLabel?: string;
  variant?: "warning" | "success" | "info";
};

function formatLimit(value: string, suffix: string) {
  if (!value || value === "0") return "مفتوح";
  return `${value} ${suffix}`;
}

function getPlanPrice(plan: CounselorPlan, billingCycle: BillingCycle) {
  return billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
}

function getBillingLabel(billingCycle: BillingCycle) {
  return billingCycle === "yearly" ? "عام دراسي" : "ترم دراسي";
}

function subscriptionStatusLabel(status?: string | null) {
  if (status === "TRIAL") return "تجربة مجانية";
  if (status === "ACTIVE") return "نشط";
  if (status === "PAST_DUE") return "بانتظار الدفع";
  if (status === "CANCELED") return "ملغي";
  if (status === "EXPIRED") return "منتهي";
  return "بدون اشتراك";
}
function getServiceDisplayName(slug?: string | null) {
  if (!slug) return null;

  const labels: Record<string, string> = {
    "guidance-programs": "البرامج الإرشادية",
    "committees-meetings": "اللجان والاجتماعات",
    "student-follow-up": "متابعة الطلاب",
    "student-guidance-services": "الخدمات الإرشادية المقدمة للطلاب",
    "family-school-communication": "التواصل بين الأسرة والمدرسة",
    "results-analysis": "تحليل النتائج",
    "comprehensive-reference": "المرجع الشامل للموجه الطلابي",
    reports: "التقارير",
  };

  return labels[slug] || slug;
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
  const service = params.get("service");

  if (!reason) return null;

  if (reason === "service-not-in-plan") {
    return {
      title: "الخدمة تحتاج باقة تشملها",
      message:
        "اشتراكك الحالي نشط، لكن هذه الخدمة غير موجودة ضمن باقتك الحالية. اختر باقة مناسبة تشمل الخدمة، وبعد التفعيل ستفتح لك مباشرة.",
      serviceSlug: service,
      actionLabel: "استعراض الباقات المناسبة",
      variant: "warning",
    };
  }

  if (reason === "activation-required") {
    return {
      title: "فعّل حسابك للوصول للخدمة",
      message:
        "حسابك لا يملك اشتراكًا نشطًا حاليًا. اختر باقة مناسبة، ثم أكمل طلب الاشتراك ليتم فتح الخدمات لك بعد التفعيل.",
      serviceSlug: service,
      actionLabel: "اختيار باقة الآن",
      variant: "warning",
    };
  }

  return {
    title: "اختر الباقة المناسبة لك",
    message:
      "للوصول إلى الخدمات المدفوعة، اختر الباقة التي تناسب احتياجك ثم أكمل طلب الاشتراك بخطوات بسيطة.",
    serviceSlug: service,
    actionLabel: "تصفح الباقات",
    variant: "info",
  };
}


function PlanMini({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white/80 px-3 py-3 shadow-sm">
      <p className="text-[11px] font-black text-slate-400">{label}</p>
      <p className="mt-1 truncate text-xs font-black text-slate-800">{value}</p>
    </div>
  );
}

export function CounselorPlansPage() {
  const [data, setData] = useState<PlansPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<CounselorPlan | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank");

  const [senderName, setSenderName] = useState("");
  const [phone, setPhone] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [note, setNote] = useState("");

  const [entryNotice, setEntryNotice] = useState<EntryNotice | null>(null);
  const [noticeOpen, setNoticeOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  async function load() {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/dashboard/plans", {
        cache: "no-store",
      });

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
    const notice = getEntryNoticeFromUrl();

    if (notice) {
      setEntryNotice(notice);
      setNoticeOpen(true);
    }

    load();
  }, []);

  const selectedPrice = useMemo(() => {
    if (!selectedPlan) return 0;
    return getPlanPrice(selectedPlan, billingCycle);
  }, [billingCycle, selectedPlan]);

  const isSelectedPlanFree = selectedPlan ? selectedPrice <= 0 : false;

  const currentSubscriptionPlan = data?.subscription
    ? data.plans.find((plan) => plan.name === data.subscription?.planName) ?? null
    : null;

  const currentSubscriptionServicesCount =
    currentSubscriptionPlan?.services.length ?? 0;

  async function submitOrder() {
    if (!selectedPlan) {
      setMessage({
        type: "error",
        text: "اختر الباقة أولًا.",
      });
      return;
    }

    if (!isSelectedPlanFree && !senderName.trim()) {
      setMessage({
        type: "error",
        text: "اكتب اسم المحوّل.",
      });
      return;
    }

    if (!isSelectedPlanFree && !phone.trim()) {
      setMessage({
        type: "error",
        text: "اكتب رقم الجوال.",
      });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/dashboard/plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId: selectedPlan.id,
          billingCycle,
          senderName,
          phone,
          receiptUrl,
          note,
        }),
      });

      const result = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(result.error || "تعذر إرسال طلب الاشتراك.");
      }

      const activatedImmediately = Boolean(result.activated) || isSelectedPlanFree;

      setMessage({
        type: "success",
        text:
          result.message ||
          (activatedImmediately
            ? "تم تفعيل الباقة بنجاح."
            : "تم إرسال طلب الاشتراك بنجاح."),
      });

      setSenderName("");
      setPhone("");
      setReceiptUrl("");
      setNote("");

      if (activatedImmediately) {
        setEntryNotice({
          title: "تم تفعيل الباقة بنجاح",
          message: `تم تفعيل ${selectedPlan.name} مباشرة، ويمكنك الآن استخدام الخدمات المشمولة في الباقة.`,
          actionLabel: "متابعة",
        });
        setNoticeOpen(true);
        setSelectedPlan(null);
      }

      await load();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "تعذر إرسال طلب الاشتراك.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="grid min-h-[50vh] place-items-center" dir="rtl">
        <div className="text-center">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-sky-600" />
          <p className="mt-3 text-sm font-black text-slate-500">
            جار تحميل الباقات...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6" dir="rtl">
      {noticeOpen && entryNotice ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="subscription-notice-title"
            className="relative w-full max-w-xl overflow-hidden rounded-[2.25rem] border border-white/70 bg-white shadow-2xl shadow-slate-950/20"
          >
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-l from-sky-400 via-cyan-300 to-emerald-300" />

            <div className="p-6 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div
                  className={[
                    "grid h-14 w-14 shrink-0 place-items-center rounded-3xl ring-1",
                    entryNotice.variant === "success" ||
                    entryNotice.actionLabel === "متابعة"
                      ? "bg-emerald-50 text-emerald-600 ring-emerald-100"
                      : "bg-sky-50 text-sky-600 ring-sky-100",
                  ].join(" ")}
                >
                  {entryNotice.variant === "success" ||
                  entryNotice.actionLabel === "متابعة" ? (
                    <ShieldCheck className="h-7 w-7" />
                  ) : (
                    <AlertCircle className="h-7 w-7" />
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setNoticeOpen(false)}
                  className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-50 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="إغلاق"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-6 text-center sm:text-right">
                <p className="text-xs font-black text-sky-600">
                  تنبيه اشتراك
                </p>

                <h2
                  id="subscription-notice-title"
                  className="mt-2 text-3xl font-black leading-[1.35] text-slate-950"
                >
                  {entryNotice.title}
                </h2>

                <p className="mx-auto mt-4 max-w-lg text-base font-bold leading-8 text-slate-600 sm:mx-0">
                  {entryNotice.message}
                </p>

                {entryNotice.serviceSlug ? (
                  <div className="mt-5 rounded-3xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-black text-slate-400">
                      الخدمة المطلوبة
                    </p>
                    <p className="mt-1 text-sm font-black text-slate-700">
                      {getServiceDisplayName(entryNotice.serviceSlug)}
                    </p>
                  </div>
                ) : null}

                <div className="mt-5 rounded-3xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm font-bold leading-7 text-sky-800">
                  لا تقلق، بياناتك محفوظة. بعد اختيار الباقة المناسبة سيتم فتح الخدمة تلقائيًا عند اكتمال التفعيل.
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <button
                    type="button"
                    onClick={() => {
                      setNoticeOpen(false);
                      document
                        .getElementById("plans-list")
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className="h-13 rounded-2xl bg-sky-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-sky-100 transition hover:bg-sky-700"
                  >
                    {entryNotice.actionLabel || "تصفح الباقات"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setNoticeOpen(false)}
                    className="h-13 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50"
                  >
                    لاحقًا
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {message ? (
        <section
          className={[
            "rounded-3xl border px-5 py-4 text-sm font-bold",
            message.type === "success"
              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
              : message.type === "error"
                ? "border-rose-100 bg-rose-50 text-rose-700"
                : "border-sky-100 bg-sky-50 text-sky-700",
          ].join(" ")}
        >
          {message.text}
        </section>
      ) : null}

      <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-black text-sky-700">الباقات</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">
              اختر الباقة المناسبة
            </h1>
            <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-500">
              لا يتم تركيب باقة فوق باقة. عند اختيار باقة جديدة سيتم التعامل معها كطلب اشتراك أو ترقية، وبعد قبولها تبدأ مدة الباقة من تاريخ التفعيل.
            </p>
          </div>

                    {data?.subscription ? (
            <div className="relative min-w-[330px] overflow-hidden rounded-[1.75rem] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-5 shadow-sm">
              <div className="absolute -left-10 -top-10 h-28 w-28 rounded-full bg-sky-100/70 blur-2xl" />

              <div className="relative z-10">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-sky-600 shadow-sm">
                    <WalletCards className="h-6 w-6" />
                  </div>

                  <span
                    className={[
                      "rounded-full px-3 py-1 text-[11px] font-black",
                      data.subscription.usable
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700",
                    ].join(" ")}
                  >
                    {subscriptionStatusLabel(data.subscription.status)}
                  </span>
                </div>

                <p className="mt-4 text-xs font-black text-sky-700">
                  اشتراكك الحالي
                </p>

                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  {data.subscription.planName}
                </h2>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <PlanMini
                    label="الحالة"
                    value={subscriptionStatusLabel(data.subscription.status)}
                  />
                  <PlanMini
                    label="المتبقي"
                    value={`${data.subscription.remainingDays ?? 0} يوم`}
                  />
                  <PlanMini
                    label="الخدمات"
                    value={
                      currentSubscriptionServicesCount > 0
                        ? `${currentSubscriptionServicesCount} خدمة`
                        : "حسب الباقة"
                    }
                  />
                </div>

                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById("plans-list")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                  className="mt-4 h-11 w-full rounded-2xl bg-sky-600 text-sm font-black text-white shadow-lg shadow-sky-100 transition hover:bg-sky-700"
                >
                  اختيار أو تغيير الباقة
                </button>
              </div>
            </div>
          ) : (
            <div className="min-w-[330px] rounded-[1.75rem] border border-amber-100 bg-amber-50 p-5 shadow-sm">
              <p className="text-xs font-black text-amber-700">لا يوجد اشتراك نشط</p>
              <h2 className="mt-2 text-xl font-black text-amber-950">
                اختر باقة لبدء استخدام الخدمات
              </h2>
              <p className="mt-2 text-xs font-bold leading-6 text-amber-800">
                بعد قبول الطلب سيتم تفعيل الباقة وفتح الخدمات المشمولة.
              </p>
            </div>
          )}
        </div>

        <div className="mt-5 flex w-fit rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className={[
              "rounded-xl px-5 py-2 text-sm font-black transition",
              billingCycle === "monthly"
                ? "bg-sky-600 text-white"
                : "text-slate-500 hover:bg-slate-50",
            ].join(" ")}
          >
            ترم دراسي
          </button>

          <button
            type="button"
            onClick={() => setBillingCycle("yearly")}
            className={[
              "rounded-xl px-5 py-2 text-sm font-black transition",
              billingCycle === "yearly"
                ? "bg-sky-600 text-white"
                : "text-slate-500 hover:bg-slate-50",
            ].join(" ")}
          >
            عام دراسي
          </button>
        </div>
      </section>

      <section id="plans-list" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data?.plans.map((plan, index) => {
          const active = selectedPlan?.id === plan.id;
          const price = getPlanPrice(plan, billingCycle);
          const period = getBillingLabel(billingCycle);

          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => {
                setSelectedPlan(plan);
                setPaymentMethod("bank");
                setMessage({
                  type: "info",
                  text:
                    price <= 0
                      ? "هذه الباقة مجانية. اضغط زر تفعيل الباقة الآن لتفعيلها مباشرة."
                      : "تم اختيار الباقة. أكمل طريقة الدفع في الأسفل.",
                });
              }}
              className={[
                "group relative overflow-hidden rounded-[2rem] border bg-white p-6 text-right shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                active
                  ? "border-sky-300 ring-4 ring-sky-50"
                  : "border-slate-100",
              ].join(" ")}
            >
              {index === 0 ? (
                <div className="absolute left-5 top-5 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                  الأنسب للبداية
                </div>
              ) : null}

              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-sky-50 text-sky-600">
                <Sparkles className="h-7 w-7" />
              </div>

              <h2 className="mt-5 text-2xl font-black text-slate-950">
                {plan.name}
              </h2>

              <div className="mt-4 flex items-end gap-2">
                <p className="text-5xl font-black text-slate-950">{price}</p>
                <span className="pb-2 text-sm font-black text-slate-400">
                  ريال / {period}
                </span>
              </div>

              <div className="mt-5 grid gap-3 text-sm font-bold text-slate-600">
                <PlanPoint text={`مدة الباقة: ${plan.durationDays} يوم`} />
                <PlanPoint text={formatLimit(plan.maxStudents, "طالب/طالبة")} />
                <PlanPoint text={formatLimit(plan.maxReports, "تقرير")} />
                <PlanPoint text={formatLimit(plan.maxUsers, "مستخدم")} />
              </div>

              {plan.services.length ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {plan.services.slice(0, 5).map((service) => (
                    <span
                      key={service.id}
                      className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-600"
                    >
                      {service.name}
                    </span>
                  ))}

                  {plan.services.length > 5 ? (
                    <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-500">
                      +{plan.services.length - 5}
                    </span>
                  ) : null}
                </div>
              ) : null}

              <div
                className={[
                  "mt-6 flex h-12 items-center justify-center rounded-2xl text-sm font-black transition",
                  active
                    ? "bg-sky-600 text-white"
                    : "bg-slate-50 text-slate-600 group-hover:bg-sky-50 group-hover:text-sky-700",
                ].join(" ")}
              >
                {active ? "تم اختيار الباقة" : "اختيار الباقة"}
              </div>
            </button>
          );
        })}

        {data?.plans.length === 0 ? (
          <div className="rounded-[2rem] border border-amber-100 bg-amber-50 p-6 text-sm font-bold leading-7 text-amber-800 md:col-span-2 xl:col-span-3">
            لا توجد باقات مفعلة حاليًا.
          </div>
        ) : null}
      </section>

      {selectedPlan ? (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-black text-sky-700">
                {isSelectedPlanFree ? "تفعيل مجاني" : "طريقة الدفع"}
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                {isSelectedPlanFree
                  ? `تفعيل ${selectedPlan.name}`
                  : `إكمال طلب ${selectedPlan.name}`}
              </h2>
              <p className="mt-2 text-sm font-bold text-slate-500">
                المبلغ: {selectedPrice} ريال / {getBillingLabel(billingCycle)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedPlan(null);
                setMessage(null);
              }}
              className="w-fit rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 hover:bg-slate-50"
            >
              تغيير الباقة
            </button>
          </div>

          {!isSelectedPlanFree ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
            <PaymentCard
              active={paymentMethod === "bank"}
              icon={<Landmark className="h-7 w-7" />}
              title="تحويل بنكي"
              description="حوّل المبلغ ثم أرسل بيانات التحويل للمراجعة والتفعيل."
              onClick={() => setPaymentMethod("bank")}
            />

            <PaymentCard
              active={paymentMethod === "online"}
              disabled
              icon={<CreditCard className="h-7 w-7" />}
              title="الدفع الإلكتروني"
              description="Apple Pay ومدى قريبًا."
              onClick={() => setPaymentMethod("online")}
              footer={
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                    Apple Pay
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                    مدى
                  </span>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                    قريبًا
                  </span>
                </div>
              }
            />
            </div>
          ) : (
            <div className="mt-6 rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-5">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-emerald-600">
                  <ShieldCheck className="h-6 w-6" />
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-950">
                    تفعيل مباشر
                  </h3>
                  <p className="mt-2 text-sm font-bold leading-7 text-slate-600">
                    هذه الباقة مجانية، وسيتم تفعيلها مباشرة دون تحويل بنكي أو انتظار مراجعة من الأدمن.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={submitOrder}
                disabled={submitting}
                className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-sm font-black text-white shadow-lg shadow-emerald-100 transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ShieldCheck className="h-5 w-5" />
                )}
                {submitting ? "جار التفعيل..." : "تفعيل الباقة الآن"}
              </button>
            </div>
          )}

          {!isSelectedPlanFree && paymentMethod === "bank" ? (
            <div className="mt-6 rounded-[1.5rem] border border-sky-100 bg-sky-50/60 p-5">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-sky-600">
                  <WalletCards className="h-6 w-6" />
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-950">
                    خطوات التحويل البنكي
                  </h3>
                  <ol className="mt-3 list-inside list-decimal space-y-2 text-sm font-bold leading-7 text-slate-600">
                    <li>حوّل مبلغ الباقة إلى حساب المنصة.</li>
                    <li>اكتب اسم المحوّل ورقم الجوال.</li>
                    <li>ضع رقم المرجع أو رابط الإيصال إن وجد.</li>
                    <li>أرسل الطلب، وسيتم تفعيله بعد المراجعة.</li>
                  </ol>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <input
                  value={senderName}
                  onChange={(event) => setSenderName(event.target.value)}
                  placeholder="اسم المحوّل"
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-sky-300"
                />

                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="رقم الجوال"
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-sky-300"
                />

                <input
                  value={receiptUrl}
                  onChange={(event) => setReceiptUrl(event.target.value)}
                  placeholder="رقم المرجع أو رابط الإيصال"
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-sky-300 md:col-span-2"
                />

                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="ملاحظة اختيارية"
                  className="min-h-24 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-sky-300 md:col-span-2"
                />
              </div>

              <button
                type="button"
                onClick={submitOrder}
                disabled={submitting}
                className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 text-sm font-black text-white shadow-lg shadow-sky-100 transition hover:bg-sky-700 disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ShieldCheck className="h-5 w-5" />
                )}
                {submitting ? "جار إرسال الطلب..." : "إرسال طلب الاشتراك"}
              </button>
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}

function PaymentCard({
  active,
  disabled,
  icon,
  title,
  description,
  footer,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  icon: ReactNode;
  title: string;
  description: string;
  footer?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "rounded-[1.5rem] border bg-white p-5 text-right transition",
        active ? "border-sky-300 ring-4 ring-sky-50" : "border-slate-100",
        disabled
          ? "cursor-not-allowed opacity-80"
          : "hover:-translate-y-0.5 hover:shadow-md",
      ].join(" ")}
    >
      <div className="flex items-start gap-4">
        <div
          className={[
            "grid h-14 w-14 place-items-center rounded-2xl",
            active ? "bg-sky-50 text-sky-600" : "bg-slate-50 text-slate-500",
          ].join(" ")}
        >
          {icon}
        </div>

        <div>
          <h3 className="text-xl font-black text-slate-950">{title}</h3>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
            {description}
          </p>
          {footer}
        </div>
      </div>
    </button>
  );
}

function PlanPoint({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
      <span>{text}</span>
    </div>
  );
}