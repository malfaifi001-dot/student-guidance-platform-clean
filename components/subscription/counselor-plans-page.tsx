"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Crown,
  Loader2,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  WalletCards,
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

function formatLimit(value: string, suffix: string) {
  if (!value || value === "0") return "مفتوح";
  return `${value} ${suffix}`;
}

function statusLabel(status?: string) {
  if (status === "ACTIVE") return "مفعل";
  if (status === "TRIAL") return "تجربة";
  if (status === "CANCELED") return "متوقف";
  if (status === "EXPIRED") return "منتهي";
  if (status === "PAST_DUE") return "بانتظار تأكيد الدفع";
  return "غير مفعل";
}

export function CounselorPlansPage() {
  const [data, setData] = useState<PlansPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<CounselorPlan | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const [senderName, setSenderName] = useState("");
  const [phone, setPhone] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  async function load() {
    setLoading(true);

    const response = await fetch("/api/dashboard/plans");
    const result = await response.json();

    if (response.ok) {
      setData(result);
      if (!selectedPlan && result.plans?.length) {
        setSelectedPlan(result.plans[0]);
      }
    } else {
      setMessage({
        type: "error",
        text: result.error || "تعذر تحميل الباقات.",
      });
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedPrice = useMemo(() => {
    if (!selectedPlan) return 0;
    return billingCycle === "yearly"
      ? selectedPlan.priceYearly
      : selectedPlan.priceMonthly;
  }, [billingCycle, selectedPlan]);

  const yearlySaving = useMemo(() => {
    if (!selectedPlan) return 0;
    const monthlyYearTotal = selectedPlan.priceMonthly * 12;
    return Math.max(monthlyYearTotal - selectedPlan.priceYearly, 0);
  }, [selectedPlan]);

  async function submitOrder() {
    if (!selectedPlan) return;

    setSubmitting(true);
    setMessage(null);

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

    const result = await response.json();

    if (response.ok) {
      setMessage({
        type: "success",
        text: result.message || "تم إرسال الطلب.",
      });
      setSenderName("");
      setPhone("");
      setReceiptUrl("");
      setNote("");
      await load();
    } else {
      setMessage({
        type: "error",
        text: result.error || "تعذر إرسال الطلب.",
      });
    }

    setSubmitting(false);
  }

  if (loading) {
    return (
      <main className="grid min-h-[50vh] place-items-center">
        <div className="flex items-center gap-3 rounded-3xl border border-slate-100 bg-white px-5 py-4 text-sm font-black text-slate-500 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
          جار تحميل الباقات...
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-5" dir="rtl">
      <section className="relative overflow-hidden rounded-[1.7rem] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-blue-50 p-5 shadow-sm">
        <div className="absolute -left-16 -top-16 h-52 w-52 rounded-full bg-sky-100/70 blur-3xl" />

        <div className="relative z-10 grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12px] font-black text-sky-700 shadow-sm">
              <Crown className="h-4 w-4" />
              الباقات والتفعيل
            </div>

            <h1 className="mt-3 text-3xl font-black text-slate-950">
              اختر الباقة المناسبة لعملك اليومي
            </h1>

            <p className="mt-2 max-w-3xl text-[14px] font-bold leading-7 text-slate-600">
              اختر الباقة، أرسل طلب التحويل، وبعد مراجعة الأدمن يتم تفعيل
              الخدمات تلقائيًا. لا تحتاج خطوات معقدة.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Badge icon={<ShieldCheck className="h-4 w-4" />} text="تفعيل من الأدمن" />
              <Badge icon={<PackageCheck className="h-4 w-4" />} text="خدمات حسب الباقة" />
              <Badge icon={<ReceiptText className="h-4 w-4" />} text="طلب تحويل واضح" />
            </div>
          </div>

          <div className="rounded-[1.45rem] border border-slate-100 bg-white p-4 shadow-sm">
            <p className="text-[12px] font-black text-slate-400">
              حالة حسابك الآن
            </p>

            <div className="mt-3 flex items-center gap-3">
              <div
                className={[
                  "grid h-12 w-12 place-items-center rounded-2xl",
                  data?.subscription?.usable
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-amber-50 text-amber-700",
                ].join(" ")}
              >
                {data?.subscription?.usable ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <AlertCircle className="h-6 w-6" />
                )}
              </div>

              <div>
                <h2 className="text-xl font-black text-slate-950">
                  {statusLabel(data?.subscription?.status)}
                </h2>
                <p className="mt-1 text-[13px] font-bold text-slate-500">
                  {data?.subscription?.planName || "لا توجد باقة حالية"}
                </p>
              </div>
            </div>

            {data?.subscription?.remainingDays !== null &&
            data?.subscription?.remainingDays !== undefined ? (
              <div className="mt-4 rounded-2xl bg-sky-50 p-3 text-[13px] font-black text-sky-700">
                متبقي {data.subscription.remainingDays} يوم
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {message ? (
        <div
          className={[
            "rounded-2xl border px-4 py-3 text-[14px] font-bold",
            message.type === "success"
              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
              : message.type === "error"
                ? "border-rose-100 bg-rose-50 text-rose-700"
                : "border-sky-100 bg-sky-50 text-sky-700",
          ].join(" ")}
        >
          {message.text}
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-slate-950">
                الباقات المتاحة
              </h2>
              <p className="mt-1 text-[13px] font-bold text-slate-500">
                هذه الباقات ينشئها الأدمن ويتحكم في خدماتها ومدتها.
              </p>
            </div>

            <div className="flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={[
                  "rounded-xl px-4 py-2 text-[13px] font-black transition",
                  billingCycle === "monthly"
                    ? "bg-sky-600 text-white"
                    : "text-slate-500 hover:bg-slate-50",
                ].join(" ")}
              >
                شهري
              </button>

              <button
                type="button"
                onClick={() => setBillingCycle("yearly")}
                className={[
                  "rounded-xl px-4 py-2 text-[13px] font-black transition",
                  billingCycle === "yearly"
                    ? "bg-sky-600 text-white"
                    : "text-slate-500 hover:bg-slate-50",
                ].join(" ")}
              >
                سنوي
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data?.plans.map((plan, index) => {
              const active = selectedPlan?.id === plan.id;
              const price =
                billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly;

              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlan(plan)}
                  className={[
                    "group relative overflow-hidden rounded-[1.55rem] border bg-white p-5 text-right shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                    active
                      ? "border-sky-200 ring-4 ring-sky-50"
                      : "border-slate-100",
                  ].join(" ")}
                >
                  {index === 0 ? (
                    <div className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black text-amber-700">
                      <Star className="h-3.5 w-3.5" />
                      الأنسب للبداية
                    </div>
                  ) : null}

                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 text-sky-600">
                    <Crown className="h-6 w-6" />
                  </div>

                  <h3 className="mt-4 text-xl font-black text-slate-950">
                    {plan.name}
                  </h3>

                  <div className="mt-3 flex items-end gap-1">
                    <p className="text-4xl font-black text-slate-950">
                      {price}
                    </p>
                    <span className="pb-1 text-[13px] font-black text-slate-400">
                      ريال / {billingCycle === "yearly" ? "سنة" : "شهر"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-2 text-[13px] font-bold text-slate-600">
                    <PlanPoint text={`${plan.durationDays} يوم للباقة الشهرية`} />
                    <PlanPoint text={formatLimit(plan.maxStudents, "طالب/طالبة")} />
                    <PlanPoint text={formatLimit(plan.maxReports, "تقرير")} />
                    <PlanPoint text={formatLimit(plan.maxUsers, "مستخدم")} />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {plan.services.slice(0, 4).map((service) => (
                      <span
                        key={service.id}
                        className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-600"
                      >
                        {service.name}
                      </span>
                    ))}

                    {plan.services.length > 4 ? (
                      <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-500">
                        +{plan.services.length - 4}
                      </span>
                    ) : null}
                  </div>

                  <div
                    className={[
                      "mt-5 flex h-11 items-center justify-center rounded-2xl text-[13px] font-black transition",
                      active
                        ? "bg-sky-600 text-white"
                        : "bg-slate-50 text-slate-600 group-hover:bg-sky-50 group-hover:text-sky-700",
                    ].join(" ")}
                  >
                    {active ? "مضافة للسلة" : "اختيار الباقة"}
                  </div>
                </button>
              );
            })}

            {data?.plans.length === 0 ? (
              <div className="rounded-[1.45rem] border border-amber-100 bg-amber-50 p-5 text-[14px] font-bold leading-7 text-amber-800 md:col-span-2 xl:col-span-3">
                لا توجد باقات مفعلة حاليًا. يستطيع الأدمن إنشاء الباقات من صفحة
                إدارة الاشتراكات.
              </div>
            ) : null}
          </div>
        </div>

        <aside className="space-y-4">
          <section className="sticky top-24 rounded-[1.55rem] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 text-sky-600">
                <ShoppingCart className="h-6 w-6" />
              </div>

              <div>
                <h2 className="text-xl font-black text-slate-950">
                  سلة الاشتراك
                </h2>
                <p className="mt-1 text-[12px] font-bold text-slate-400">
                  راجع الباقة قبل إرسال الطلب.
                </p>
              </div>
            </div>

            {selectedPlan ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[13px] font-black text-slate-500">
                    الباقة المختارة
                  </p>

                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="text-lg font-black text-slate-950">
                      {selectedPlan.name}
                    </p>
                    <p className="text-lg font-black text-sky-700">
                      {selectedPrice} ريال
                    </p>
                  </div>

                  {billingCycle === "yearly" && yearlySaving > 0 ? (
                    <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-[12px] font-black text-emerald-700">
                      توفر {yearlySaving} ريال عند الاشتراك السنوي.
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-3">
                  <input
                    value={senderName}
                    onChange={(event) => setSenderName(event.target.value)}
                    placeholder="اسم المحوّل"
                    className="input"
                  />

                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="رقم الجوال"
                    className="input"
                  />

                  <input
                    value={receiptUrl}
                    onChange={(event) => setReceiptUrl(event.target.value)}
                    placeholder="رقم المرجع أو رابط الإيصال"
                    className="input"
                  />

                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="ملاحظة اختيارية"
                    className="min-h-24 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-sky-200 focus:ring-4 focus:ring-sky-50"
                  />
                </div>

                <button
                  type="button"
                  onClick={submitOrder}
                  disabled={submitting}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 text-sm font-black text-white shadow-lg shadow-sky-100 transition hover:bg-sky-700 disabled:opacity-60"
                >
                  <WalletCards className="h-5 w-5" />
                  {submitting
                    ? "جار إرسال الطلب..."
                    : selectedPrice <= 0
                      ? "تفعيل الباقة"
                      : "إرسال طلب الاشتراك"}
                </button>

                <p className="text-center text-[12px] font-bold leading-6 text-slate-400">
                  بعد الإرسال، يظهر الطلب للأدمن في إدارة التفعيلات، وعند القبول
                  يتم تفعيل نفس الباقة والخدمات.
                </p>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-[13px] font-bold text-slate-500">
                اختر باقة من القائمة لتظهر هنا.
              </div>
            )}
          </section>
        </aside>
      </section>

      <style jsx>{`
        .input {
          height: 3rem;
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgb(226 232 240);
          background: rgb(248 250 252);
          padding: 0 1rem;
          font-size: 0.875rem;
          font-weight: 700;
          outline: none;
        }

        .input:focus {
          border-color: rgb(186 230 253);
          box-shadow: 0 0 0 4px rgb(240 249 255);
        }
      `}</style>
    </main>
  );
}

function Badge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12px] font-black text-sky-700 shadow-sm">
      {icon}
      {text}
    </span>
  );
}

function PlanPoint({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      <span>{text}</span>
    </div>
  );
}
