"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Crown,
  Eye,
  KeyRound,
  Layers3,
  Loader2,
  PackagePlus,
  PauseCircle,
  Rocket,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Users,
} from "lucide-react";

type ServiceItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: string;
};

type PlanFeature = {
  id: string;
  key: string;
  label: string;
  value: string | null;
};

type PlanItem = {
  id: string;
  name: string;
  slug: string;
  priceMonthly: number;
  priceYearly: number;
  isActive: boolean;
  features: PlanFeature[];
};

type SchoolItem = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  profile: {
    schoolName: string | null;
    educationDepartment: string | null;
  } | null;
};

type SubscriptionItem = {
  id: string;
  status: string;
  startsAt: string;
  endsAt: string | null;
  schoolAccount: SchoolItem;
  plan: {
    id: string;
    name: string;
    slug: string;
  };
};

type ServiceAccessItem = {
  id: string;
  isEnabled: boolean;
  isPaid: boolean;
  service: ServiceItem;
  schoolAccount: {
    id: string;
    name: string;
  };
};

type AdminSubscriptionData = {
  plans: PlanItem[];
  services: ServiceItem[];
  schools: SchoolItem[];
  subscriptions: SubscriptionItem[];
  serviceAccess: ServiceAccessItem[];
};

function featureValue(plan: PlanItem, key: string, fallback = "0") {
  return plan.features.find((feature) => feature.key === key)?.value || fallback;
}

function getPlanServices(plan: PlanItem) {
  return plan.features
    .filter((feature) => feature.key.startsWith("service:") && feature.value === "enabled")
    .map((feature) => feature.key.replace("service:", ""));
}

function getStatusLabel(status: string) {
  if (status === "TRIAL") return "تجربة";
  if (status === "ACTIVE") return "نشط";
  if (status === "CANCELED") return "متوقف";
  if (status === "EXPIRED") return "منتهي";
  if (status === "PAST_DUE") return "بانتظار الدفع";
  return status;
}

export function AdminSubscriptionsControlCenter() {
  const [data, setData] = useState<AdminSubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const [planName, setPlanName] = useState("باقة الموجه الشهرية");
  const [planSlug, setPlanSlug] = useState("counselor-monthly");
  const [priceMonthly, setPriceMonthly] = useState("99");
  const [priceYearly, setPriceYearly] = useState("799");
  const [durationDays, setDurationDays] = useState("30");
  const [maxStudents, setMaxStudents] = useState("500");
  const [maxUsers, setMaxUsers] = useState("1");
  const [maxReports, setMaxReports] = useState("100");
  const [enabledServiceSlugs, setEnabledServiceSlugs] = useState<string[]>([]);

  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [assignDays, setAssignDays] = useState("");
  const [assignStatus, setAssignStatus] = useState("ACTIVE");

  const [search, setSearch] = useState("");
  const [serviceSchoolId, setServiceSchoolId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [serviceEnabled, setServiceEnabled] = useState(true);
  const [servicePaid, setServicePaid] = useState(true);

  async function load() {
    setLoading(true);

    const response = await fetch("/api/dashboard/admin/subscriptions");
    const result = await response.json();

    if (response.ok) {
      setData(result);
      if (result.services?.length && enabledServiceSlugs.length === 0) {
        setEnabledServiceSlugs(result.services.map((service: ServiceItem) => service.slug));
      }
    } else {
      setMessage({
        type: "error",
        text: result.error || "تعذر تحميل إدارة الاشتراكات.",
      });
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredSubscriptions = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return data?.subscriptions || [];

    return (data?.subscriptions || []).filter((item) => {
      const text = [
        item.schoolAccount.name,
        item.schoolAccount.slug,
        item.schoolAccount.profile?.schoolName,
        item.plan.name,
        item.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(query);
    });
  }, [data?.subscriptions, search]);

  async function runAction(payload: Record<string, unknown>) {
    setMessage(null);

    const response = await fetch("/api/dashboard/admin/subscriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (response.ok) {
      setMessage({
        type: "success",
        text: result.message || "تم تنفيذ العملية.",
      });
      await load();
    } else {
      setMessage({
        type: "error",
        text: result.error || "تعذر تنفيذ العملية.",
      });
    }
  }

  function toggleServiceSlug(slug: string) {
    setEnabledServiceSlugs((current) =>
      current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug]
    );
  }

  async function createPlan() {
    await runAction({
      action: "create-plan",
      name: planName,
      slug: planSlug,
      priceMonthly,
      priceYearly,
      durationDays,
      maxStudents,
      maxUsers,
      maxReports,
      enabledServiceSlugs,
    });
  }

  async function assignPlan() {
    await runAction({
      action: "assign-plan",
      schoolAccountId: selectedSchoolId,
      planId: selectedPlanId,
      days: assignDays,
      status: assignStatus,
    });
  }

  async function togglePlan(plan: PlanItem) {
    await runAction({
      action: "toggle-plan",
      planId: plan.id,
      isActive: !plan.isActive,
    });
  }

  async function extendSubscription(subscriptionId: string, days: number) {
    await runAction({
      action: "extend-subscription",
      subscriptionId,
      days,
    });
  }

  async function cancelSubscription(subscriptionId: string) {
    await runAction({
      action: "cancel-subscription",
      subscriptionId,
    });
  }

  async function updateServiceAccess() {
    await runAction({
      action: "toggle-service-access",
      schoolAccountId: serviceSchoolId,
      serviceId,
      isEnabled: serviceEnabled,
      isPaid: servicePaid,
    });
  }

  if (loading) {
    return (
      <main className="grid min-h-[50vh] place-items-center">
        <div className="flex items-center gap-3 rounded-3xl border border-slate-100 bg-white px-5 py-4 text-sm font-black text-slate-500 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
          جار تحميل مركز الاشتراكات...
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-5" dir="rtl">
      <section className="relative overflow-hidden rounded-[1.7rem] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-blue-50 p-5 shadow-sm">
        <div className="absolute -left-16 -top-16 h-52 w-52 rounded-full bg-sky-100/70 blur-3xl" />

        <div className="relative z-10 flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12px] font-black text-sky-700 shadow-sm">
              <Crown className="h-4 w-4" />
              Admin Subscription Control
            </div>

            <h1 className="mt-3 text-3xl font-black text-slate-950">
              التحكم الكامل في الباقات والاشتراكات
            </h1>

            <p className="mt-2 max-w-3xl text-[14px] font-bold leading-7 text-slate-600">
              أنشئ فكرة الباقة، حدّد مدتها وسعرها وخدماتها، ثم فعّلها لأي حساب.
              الموجه يرى الأمر ببساطة: حساب مفعل أو يحتاج تفعيل.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <SmallStat label="الباقات" value={data?.plans.length || 0} />
            <SmallStat label="الحسابات" value={data?.schools.length || 0} />
            <SmallStat label="الاشتراكات" value={data?.subscriptions.length || 0} />
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

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-5">
          <section className="rounded-[1.45rem] border border-slate-100 bg-white p-5 shadow-sm">
            <SectionHeader
              icon={<PackagePlus className="h-6 w-6" />}
              title="إنشاء باقة اشتراك"
              subtitle="عرّف الباقة مرة واحدة ثم اربطها بأي حساب من الأدمن."
            />

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Field label="اسم الباقة">
                <input
                  value={planName}
                  onChange={(event) => setPlanName(event.target.value)}
                  className="input"
                />
              </Field>

              <Field label="معرف الباقة">
                <input
                  value={planSlug}
                  onChange={(event) => setPlanSlug(event.target.value)}
                  className="input"
                />
              </Field>

              <Field label="السعر الشهري">
                <input
                  value={priceMonthly}
                  onChange={(event) => setPriceMonthly(event.target.value)}
                  className="input"
                />
              </Field>

              <Field label="السعر السنوي">
                <input
                  value={priceYearly}
                  onChange={(event) => setPriceYearly(event.target.value)}
                  className="input"
                />
              </Field>

              <Field label="مدة الباقة بالأيام">
                <input
                  value={durationDays}
                  onChange={(event) => setDurationDays(event.target.value)}
                  className="input"
                />
              </Field>

              <Field label="حد الطلاب">
                <input
                  value={maxStudents}
                  onChange={(event) => setMaxStudents(event.target.value)}
                  className="input"
                />
              </Field>

              <Field label="حد المستخدمين">
                <input
                  value={maxUsers}
                  onChange={(event) => setMaxUsers(event.target.value)}
                  className="input"
                />
              </Field>

              <Field label="حد التقارير">
                <input
                  value={maxReports}
                  onChange={(event) => setMaxReports(event.target.value)}
                  className="input"
                />
              </Field>
            </div>

            <div className="mt-5">
              <p className="text-[13px] font-black text-slate-700">
                الخدمات المشمولة في الباقة
              </p>

              <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {data?.services.map((service) => {
                  const active = enabledServiceSlugs.includes(service.slug);

                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => toggleServiceSlug(service.slug)}
                      className={[
                        "flex items-center justify-between gap-3 rounded-2xl border p-3 text-right transition",
                        active
                          ? "border-sky-100 bg-sky-50 text-sky-700"
                          : "border-slate-100 bg-slate-50 text-slate-500 hover:bg-white",
                      ].join(" ")}
                    >
                      <span>
                        <span className="block text-[14px] font-black">
                          {service.name}
                        </span>
                        <span className="mt-1 block text-[11px] font-bold opacity-70">
                          {service.slug}
                        </span>
                      </span>

                      {active ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={createPlan}
              className="mt-5 h-12 w-full rounded-2xl bg-sky-600 text-sm font-black text-white shadow-lg shadow-sky-100 transition hover:bg-sky-700"
            >
              إنشاء الباقة
            </button>
          </section>

          <section className="rounded-[1.45rem] border border-slate-100 bg-white p-5 shadow-sm">
            <SectionHeader
              icon={<Layers3 className="h-6 w-6" />}
              title="الباقات الحالية"
              subtitle="إيقاف أو مراجعة الباقات الموجودة."
            />

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data?.plans.map((plan) => {
                const services = getPlanServices(plan);

                return (
                  <article
                    key={plan.id}
                    className="rounded-[1.35rem] border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-[16px] font-black text-slate-950">
                          {plan.name}
                        </h3>
                        <p className="mt-1 text-[12px] font-bold text-slate-400">
                          {plan.slug}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => togglePlan(plan)}
                        className={[
                          "grid h-10 w-10 place-items-center rounded-2xl",
                          plan.isActive
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-slate-200 text-slate-500",
                        ].join(" ")}
                      >
                        {plan.isActive ? (
                          <ToggleRight className="h-6 w-6" />
                        ) : (
                          <ToggleLeft className="h-6 w-6" />
                        )}
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-[12px] font-bold text-slate-600">
                      <PlanMini label="شهري" value={`${plan.priceMonthly} ريال`} />
                      <PlanMini label="سنوي" value={`${plan.priceYearly} ريال`} />
                      <PlanMini label="المدة" value={`${featureValue(plan, "durationDays")} يوم`} />
                      <PlanMini label="الطلاب" value={featureValue(plan, "maxStudents", "مفتوح")} />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {services.slice(0, 4).map((slug) => (
                        <span
                          key={slug}
                          className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-sky-700"
                        >
                          {slug}
                        </span>
                      ))}
                      {services.length > 4 ? (
                        <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-500">
                          +{services.length - 4}
                        </span>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="rounded-[1.45rem] border border-slate-100 bg-white p-5 shadow-sm">
            <SectionHeader
              icon={<ClipboardList className="h-6 w-6" />}
              title="الاشتراكات الحالية"
              subtitle="بحث، تمديد، أو إيقاف أي اشتراك."
            />

            <div className="relative mt-4">
              <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ابحث باسم الحساب أو الباقة أو الحالة..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-12 text-sm font-bold outline-none focus:border-sky-200 focus:ring-4 focus:ring-sky-50"
              />
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 text-xs font-black text-slate-500">
                  <tr>
                    <th className="p-3">الحساب</th>
                    <th className="p-3">الباقة</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3">ينتهي</th>
                    <th className="p-3">إجراءات</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredSubscriptions.map((subscription) => (
                    <tr key={subscription.id}>
                      <td className="p-3">
                        <p className="font-black text-slate-900">
                          {subscription.schoolAccount.name}
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-400">
                          {subscription.schoolAccount.slug}
                        </p>
                      </td>

                      <td className="p-3 font-bold text-slate-600">
                        {subscription.plan.name}
                      </td>

                      <td className="p-3">
                        <span
                          className={[
                            "rounded-full px-3 py-1 text-xs font-black",
                            subscription.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700"
                              : subscription.status === "TRIAL"
                                ? "bg-sky-50 text-sky-700"
                                : "bg-amber-50 text-amber-700",
                          ].join(" ")}
                        >
                          {getStatusLabel(subscription.status)}
                        </span>
                      </td>

                      <td className="p-3 text-xs font-bold text-slate-500">
                        {subscription.endsAt
                          ? new Date(subscription.endsAt).toLocaleDateString("ar-SA")
                          : "غير محدد"}
                      </td>

                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => extendSubscription(subscription.id, 30)}
                            className="rounded-xl bg-sky-600 px-3 py-2 text-xs font-black text-white"
                          >
                            +30 يوم
                          </button>
                          <button
                            type="button"
                            onClick={() => extendSubscription(subscription.id, 365)}
                            className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white"
                          >
                            سنة
                          </button>
                          <button
                            type="button"
                            onClick={() => cancelSubscription(subscription.id)}
                            className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-black text-white"
                          >
                            إيقاف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredSubscriptions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-8 text-center text-sm font-bold text-slate-400"
                      >
                        لا توجد اشتراكات مطابقة.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-[1.45rem] border border-slate-100 bg-white p-5 shadow-sm">
            <SectionHeader
              icon={<Rocket className="h-6 w-6" />}
              title="إسناد باقة لحساب"
              subtitle="اختر الحساب، الباقة، والمدة."
            />

            <div className="mt-5 space-y-3">
              <select
                value={selectedSchoolId}
                onChange={(event) => setSelectedSchoolId(event.target.value)}
                className="input"
              >
                <option value="">اختر الحساب</option>
                {data?.schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedPlanId}
                onChange={(event) => setSelectedPlanId(event.target.value)}
                className="input"
              >
                <option value="">اختر الباقة</option>
                {data?.plans
                  .filter((plan) => plan.isActive)
                  .map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
              </select>

              <select
                value={assignStatus}
                onChange={(event) => setAssignStatus(event.target.value)}
                className="input"
              >
                <option value="ACTIVE">نشط</option>
                <option value="TRIAL">تجربة</option>
                <option value="PAST_DUE">بانتظار الدفع</option>
              </select>

              <input
                value={assignDays}
                onChange={(event) => setAssignDays(event.target.value)}
                placeholder="مدة مخصصة بالأيام، اتركها فارغة لاستخدام مدة الباقة"
                className="input"
              />

              <button
                type="button"
                onClick={assignPlan}
                className="h-12 w-full rounded-2xl bg-sky-600 text-sm font-black text-white shadow-lg shadow-sky-100 transition hover:bg-sky-700"
              >
                إسناد وتفعيل
              </button>
            </div>
          </section>

          <section className="rounded-[1.45rem] border border-slate-100 bg-white p-5 shadow-sm">
            <SectionHeader
              icon={<Settings2 className="h-6 w-6" />}
              title="تحكم خدمة لحساب"
              subtitle="فتح أو إغلاق خدمة معينة لحساب معين."
            />

            <div className="mt-5 space-y-3">
              <select
                value={serviceSchoolId}
                onChange={(event) => setServiceSchoolId(event.target.value)}
                className="input"
              >
                <option value="">اختر الحساب</option>
                {data?.schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>

              <select
                value={serviceId}
                onChange={(event) => setServiceId(event.target.value)}
                className="input"
              >
                <option value="">اختر الخدمة</option>
                {data?.services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>

              <label className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 text-sm font-black text-slate-700">
                الخدمة مفعلة
                <input
                  type="checkbox"
                  checked={serviceEnabled}
                  onChange={(event) => setServiceEnabled(event.target.checked)}
                />
              </label>

              <label className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 text-sm font-black text-slate-700">
                خدمة مدفوعة
                <input
                  type="checkbox"
                  checked={servicePaid}
                  onChange={(event) => setServicePaid(event.target.checked)}
                />
              </label>

              <button
                type="button"
                onClick={updateServiceAccess}
                className="h-12 w-full rounded-2xl bg-slate-950 text-sm font-black text-white transition hover:bg-slate-800"
              >
                حفظ صلاحية الخدمة
              </button>
            </div>
          </section>

          <section className="rounded-[1.45rem] border border-amber-100 bg-amber-50 p-5 shadow-sm">
            <div className="flex gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-amber-700 shadow-sm">
                <AlertTriangle className="h-5 w-5" />
              </div>

              <div>
                <h3 className="text-[15px] font-black text-amber-950">
                  قاعدة مهمة
                </h3>
                <p className="mt-2 text-[13px] font-bold leading-6 text-amber-800">
                  الباقة تحدد الخدمات تلقائيًا، لكن يمكنك من هنا فتح أو إغلاق
                  خدمة لحساب معيّن عند الحاجة.
                </p>
              </div>
            </div>
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

function SmallStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 text-center shadow-sm">
      <p className="text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-[11px] font-black text-slate-400">{label}</p>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-600">
        {icon}
      </div>

      <div>
        <h2 className="text-xl font-black text-slate-950">{title}</h2>
        <p className="mt-1 text-[13px] font-bold leading-6 text-slate-500">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="mb-2 block text-[12px] font-black text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function PlanMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-2">
      <p className="text-[10px] font-black text-slate-400">{label}</p>
      <p className="mt-1 font-black text-slate-800">{value}</p>
    </div>
  );
}



