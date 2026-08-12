"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { PlanAudience } from "@/lib/subscription/plan-audience";
import { getSubscriptionPeriodLabel } from "@/lib/subscription/subscription-presentation";
import { getActivityProgramsBillingServiceSlugs } from "@/lib/activity-programs/activity-program-catalog";
import {
  filterServicesByPlanAudience,
  getDefaultVisibleRolesForAudience,
  getPlanAudience,
  getPlanAudienceLabel,
  getPlanRoleLabel,
  getPlanVisibilityRoles,
  OPERATIONAL_PLAN_ROLES,
  type PlanVisibleRole,
} from "@/lib/subscription/plan-audience";
import {
  ArrowUpRight,
  CheckCircle2,
  Crown,
  Eye,
  Layers3,
  Loader2,
  PackagePlus,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Users,
} from "lucide-react";

const DEFAULT_FREE_PLAN_SLUG = "default-free-auto";

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
  isPublic: boolean;
  isArchived: boolean;
  visibleRoles: PlanVisibleRole[] | null;
  features: PlanFeature[];
};

type AdminPlansData = {
  plans: PlanItem[];
  services: ServiceItem[];
};

function getPlanFeatureValue(plan: PlanItem, key: string, fallback = "0") {
  return plan.features.find((feature) => feature.key === key)?.value || fallback;
}

function getPlanServices(plan: PlanItem) {
  return getActivityProgramsBillingServiceSlugs(
    plan.features
      .filter((feature) => feature.key.startsWith("service:") && feature.value === "enabled")
      .map((feature) => feature.key.replace("service:", "")),
  );
}

function getRoleVisibilityLabel(role: PlanVisibleRole) {
  if (role === "COUNSELOR") return "يظهر للموجه";
  if (role === "ACTIVITY_LEADER") return "يظهر لرائد النشاط";
  if (role === "TEACHER") return "يظهر للمعلم";
  if (role === "SCHOOL_OWNER") return "يظهر لمالك المدرسة";
  return "يظهر للموظف";
}

async function readApiResponse(response: Response) {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {
      error: response.ok
        ? "تم تنفيذ العملية لكن تعذر قراءة استجابة الخادم."
        : "تعذر تنفيذ العملية. راجع سجل الخادم للتفاصيل.",
    };
  }
}

export function AdminSubscriptionsControlCenter() {
  const [data, setData] = useState<AdminPlansData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const [planAudience, setPlanAudience] = useState<PlanAudience>("ALL");
  const [planName, setPlanName] = useState("باقة الموجه لفصل دراسي");
  const [planSlug, setPlanSlug] = useState("counselor-monthly");
  const [priceMonthly, setPriceMonthly] = useState("99");
  const [priceYearly, setPriceYearly] = useState("799");
  const [durationDays, setDurationDays] = useState("30");
  const [maxStudents, setMaxStudents] = useState("500");
  const [maxUsers, setMaxUsers] = useState("1");
  const [maxReports, setMaxReports] = useState("100");
  const [enabledServiceSlugs, setEnabledServiceSlugs] = useState<string[]>([]);
  const [planIsPublic, setPlanIsPublic] = useState(true);
  const [planVisibleRoles, setPlanVisibleRoles] = useState<PlanVisibleRole[]>(
    getDefaultVisibleRolesForAudience("ALL"),
  );

  async function load() {
    setLoading(true);

    const response = await fetch("/api/dashboard/admin/subscriptions", {
      cache: "no-store",
    });
    const result = await readApiResponse(response);

    if (response.ok) {
      const nextData = {
        plans: Array.isArray(result.plans) ? (result.plans as PlanItem[]) : [],
        services: Array.isArray(result.services) ? (result.services as ServiceItem[]) : [],
      };

      setData(nextData);

      if (nextData.services.length && enabledServiceSlugs.length === 0) {
        setEnabledServiceSlugs(nextData.services.map((service) => service.slug));
      }
    } else {
      setMessage({
        type: "error",
        text:
          typeof result.error === "string"
            ? result.error
            : "تعذر تحميل إدارة الباقات.",
      });
    }

    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const regularPlans = useMemo(
    () => (data?.plans || []).filter((plan) => plan.slug !== DEFAULT_FREE_PLAN_SLUG),
    [data?.plans],
  );

  const visibleServices = useMemo(() => {
    if (!data?.services) return [];
    return filterServicesByPlanAudience(data.services, planAudience);
  }, [data?.services, planAudience]);

  const activePlansCount = useMemo(
    () => regularPlans.filter((plan) => plan.isActive).length,
    [regularPlans],
  );

  const publicPlansCount = useMemo(
    () => regularPlans.filter((plan) => plan.isPublic && !plan.isArchived).length,
    [regularPlans],
  );

  async function runAction(payload: Record<string, unknown>) {
    setMessage(null);

    const response = await fetch("/api/dashboard/admin/subscriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await readApiResponse(response);

    if (response.ok) {
      setMessage({
        type: "success",
        text:
          typeof result.message === "string" ? result.message : "تم تنفيذ العملية.",
      });
      await load();
    } else {
      setMessage({
        type: "error",
        text:
          typeof result.error === "string" ? result.error : "تعذر تنفيذ العملية.",
      });
    }
  }

  function toggleServiceSlug(slug: string) {
    setEnabledServiceSlugs((current) =>
      current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug],
    );
  }

  function handleAudienceChange(audience: PlanAudience) {
    setPlanAudience(audience);
    setPlanVisibleRoles(getDefaultVisibleRolesForAudience(audience));

    if (data?.services) {
      const filtered = filterServicesByPlanAudience(data.services, audience);
      setEnabledServiceSlugs(filtered.map((service) => service.slug));
    }
  }

  function toggleCreateVisibleRole(role: PlanVisibleRole) {
    setPlanVisibleRoles((current) =>
      current.includes(role)
        ? current.filter((item) => item !== role)
        : [...current, role],
    );
  }

  function togglePlanVisibleRole(plan: PlanItem, role: PlanVisibleRole) {
    const currentRoles = getPlanVisibilityRoles(plan);
    const nextRoles = currentRoles.includes(role)
      ? currentRoles.filter((item) => item !== role)
      : [...currentRoles, role];

    void updatePlanVisibility(plan, { visibleRoles: nextRoles });
  }

  async function createPlan() {
    await runAction({
      action: "create-plan",
      targetAudience: planAudience,
      name: planName,
      slug: planSlug,
      priceMonthly,
      priceYearly,
      durationDays,
      maxStudents,
      maxUsers,
      maxReports,
      enabledServiceSlugs,
      isPublic: planIsPublic,
      visibleRoles: planVisibleRoles,
    });
  }

  async function togglePlan(plan: PlanItem) {
    await runAction({
      action: "toggle-plan",
      planId: plan.id,
      isActive: !plan.isActive,
    });
  }

  async function updatePlanVisibility(
    plan: PlanItem,
    patch: {
      isPublic?: boolean;
      isArchived?: boolean;
      visibleRoles?: PlanVisibleRole[];
    },
  ) {
    await runAction({
      action: "update-plan-visibility",
      planId: plan.id,
      isPublic: patch.isPublic ?? plan.isPublic,
      isArchived: patch.isArchived ?? plan.isArchived,
      visibleRoles: patch.visibleRoles ?? getPlanVisibilityRoles(plan),
    });
  }

  if (loading) {
    return (
      <main className="grid min-h-[50vh] place-items-center">
        <div className="flex items-center gap-3 rounded-3xl border border-slate-100 bg-white px-5 py-4 text-sm font-black text-slate-500 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
          جار تحميل إدارة الباقات...
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
              إدارة الباقات
            </div>

            <h1 className="mt-3 text-3xl font-black text-slate-950">إدارة الباقات</h1>

            <p className="mt-2 max-w-3xl text-[14px] font-bold leading-7 text-slate-600">
              أنشئ الباقات وعدّل ظهورها وخدماتها. إسناد الباقات وإدارة خدمات الحسابات تتم من
              صفحة المشتركين.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/admin/subscriptions/default-free"
              className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-100 transition hover:bg-sky-700"
            >
              إدارة الباقة التلقائية
              <ShieldCheck className="h-4 w-4" />
            </Link>

            <Link
              href="/dashboard/admin/subscribers"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              الانتقال إلى المشتركين
              <ArrowUpRight className="h-4 w-4" />
            </Link>
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

      <section className="grid gap-3 md:grid-cols-3">
        <StatCard label="إجمالي الباقات" value={regularPlans.length} icon={<Layers3 className="h-5 w-5" />} />
        <StatCard label="الباقات المفعلة" value={activePlansCount} icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard label="الباقات الظاهرة" value={publicPlansCount} icon={<Users className="h-5 w-5" />} />
      </section>

      <section className="space-y-5">
        <section className="rounded-[1.45rem] border border-slate-100 bg-white p-5 shadow-sm">
          <SectionHeader
            icon={<PackagePlus className="h-6 w-6" />}
            title="إنشاء باقة اشتراك"
            subtitle="عرّف الباقة مرة واحدة ثم اضبط جمهورها وخدماتها وظهورها."
          />

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Field label="اسم الباقة">
              <input value={planName} onChange={(event) => setPlanName(event.target.value)} className="input" />
            </Field>

            <Field label="معرف الباقة">
              <input value={planSlug} onChange={(event) => setPlanSlug(event.target.value)} className="input" />
            </Field>

            <Field label={`سعر ${getSubscriptionPeriodLabel("MONTHLY")}`}>
              <input value={priceMonthly} onChange={(event) => setPriceMonthly(event.target.value)} className="input" />
            </Field>

            <Field label={`سعر ${getSubscriptionPeriodLabel("YEARLY")}`}>
              <input value={priceYearly} onChange={(event) => setPriceYearly(event.target.value)} className="input" />
            </Field>

            <Field label="مدة الباقة بالأيام">
              <input value={durationDays} onChange={(event) => setDurationDays(event.target.value)} className="input" />
            </Field>

            <Field label="حد الطلاب">
              <input value={maxStudents} onChange={(event) => setMaxStudents(event.target.value)} className="input" />
            </Field>

            <Field label="حد المستخدمين">
              <input value={maxUsers} onChange={(event) => setMaxUsers(event.target.value)} className="input" />
            </Field>

            <Field label="حد التقارير">
              <input value={maxReports} onChange={(event) => setMaxReports(event.target.value)} className="input" />
            </Field>
          </div>

          <div className="mt-5">
            <p className="text-[13px] font-black text-slate-700">الجمهور المستهدف</p>

            <div className="mt-2 flex gap-2">
              {(["GUIDANCE", "ACTIVITY", "ALL"] as PlanAudience[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleAudienceChange(value)}
                  className={[
                    "flex-1 rounded-2xl border p-3 text-center text-sm font-black transition",
                    planAudience === value
                      ? "border-sky-100 bg-sky-50 text-sky-700 shadow-sm"
                      : "border-slate-100 bg-slate-50 text-slate-500 hover:bg-white",
                  ].join(" ")}
                >
                  {getPlanAudienceLabel(value)}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-[1.25rem] border border-slate-100 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[13px] font-black text-slate-700">ظهور الباقة للمستخدمين</p>

              <button
                type="button"
                onClick={() => setPlanIsPublic((value) => !value)}
                className={[
                  "rounded-full px-3 py-1.5 text-[12px] font-black",
                  planIsPublic
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-200 text-slate-600",
                ].join(" ")}
              >
                {planIsPublic ? "ظاهرة للمستخدمين" : "مخفية من المستخدمين"}
              </button>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {OPERATIONAL_PLAN_ROLES.map((role) => {
                const active = planVisibleRoles.includes(role);

                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleCreateVisibleRole(role)}
                    className={[
                      "rounded-2xl border px-3 py-2 text-right text-[12px] font-black transition",
                      active
                        ? "border-sky-100 bg-white text-sky-700 shadow-sm"
                        : "border-slate-200 bg-slate-100 text-slate-500",
                    ].join(" ")}
                  >
                    {getRoleVisibilityLabel(role)}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setPlanVisibleRoles([...OPERATIONAL_PLAN_ROLES])}
              className="mt-3 rounded-full bg-white px-3 py-1.5 text-[12px] font-black text-slate-600 ring-1 ring-slate-100"
            >
              ظاهر لكل الأدوار التشغيلية
            </button>
          </div>

          <div className="mt-5">
            <p className="text-[13px] font-black text-slate-700">الخدمات المشمولة في الباقة</p>

            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {visibleServices.map((service) => {
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
                      <span className="block text-[14px] font-black">{service.name}</span>
                      <span className="mt-1 block text-[11px] font-bold opacity-70">
                        {service.slug}
                      </span>
                    </span>

                    {active ? <CheckCircle2 className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
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
            subtitle="راجع الباقات الحالية وعدّل ظهورها وأرشفتها وخدماتها."
          />

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {regularPlans.map((plan) => {
              const services = getPlanServices(plan);
              const audience = getPlanAudience(plan.features);
              const visibilityRoles = getPlanVisibilityRoles(plan);

              return (
                <article
                  key={plan.id}
                  className="rounded-[1.35rem] border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-[16px] font-black text-slate-950">{plan.name}</h3>
                      <p className="mt-1 text-[12px] font-bold text-slate-400">{plan.slug}</p>

                      {audience !== "ALL" ? (
                        <span className="mt-2 inline-block rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-black text-sky-700">
                          {getPlanAudienceLabel(audience)}
                        </span>
                      ) : null}

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span
                          className={[
                            "rounded-full px-2 py-0.5 text-[10px] font-black",
                            plan.isPublic
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-200 text-slate-600",
                          ].join(" ")}
                        >
                          {plan.isPublic ? "ظاهرة للمستخدمين" : "مخفية من المستخدمين"}
                        </span>

                        {plan.isArchived ? (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700">
                            مؤرشفة
                          </span>
                        ) : null}
                      </div>
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
                      {plan.isActive ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-[12px] font-bold text-slate-600">
                    <PlanMini
                      label={getSubscriptionPeriodLabel("MONTHLY")}
                      value={`${plan.priceMonthly} ريال`}
                    />
                    <PlanMini
                      label={getSubscriptionPeriodLabel("YEARLY")}
                      value={`${plan.priceYearly} ريال`}
                    />
                    <PlanMini label="المدة" value={`${getPlanFeatureValue(plan, "durationDays")} يوم`} />
                    <PlanMini label="الطلاب" value={getPlanFeatureValue(plan, "maxStudents", "مفتوح")} />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {visibilityRoles.map((role) => (
                      <span
                        key={role}
                        className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600"
                      >
                        {getPlanRoleLabel(role)}
                      </span>
                    ))}

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

                  <div className="mt-4 grid gap-2">
                    <button
                      type="button"
                      onClick={() => updatePlanVisibility(plan, { isPublic: !plan.isPublic })}
                      className="rounded-2xl bg-white px-3 py-2 text-[12px] font-black text-slate-700 ring-1 ring-slate-100"
                    >
                      {plan.isPublic ? "إخفاء من المستخدمين" : "إظهار للمستخدمين"}
                    </button>

                    <button
                      type="button"
                      onClick={() => updatePlanVisibility(plan, { isArchived: !plan.isArchived })}
                      className={[
                        "rounded-2xl px-3 py-2 text-[12px] font-black",
                        plan.isArchived
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700",
                      ].join(" ")}
                    >
                      {plan.isArchived ? "إلغاء الأرشفة" : "أرشفة الباقة"}
                    </button>

                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {OPERATIONAL_PLAN_ROLES.map((role) => {
                        const active = visibilityRoles.includes(role);

                        return (
                          <button
                            key={role}
                            type="button"
                            onClick={() => togglePlanVisibleRole(plan, role)}
                            className={[
                              "rounded-xl border px-2 py-1.5 text-[11px] font-black",
                              active
                                ? "border-sky-100 bg-sky-50 text-sky-700"
                                : "border-slate-200 bg-white text-slate-400",
                            ].join(" ")}
                          >
                            {getRoleVisibilityLabel(role)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
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

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-2xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-[11px] font-black text-slate-400">{label}</p>
        </div>

        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-50 text-sky-600">
          {icon}
        </div>
      </div>
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
        <p className="mt-1 text-[13px] font-bold leading-6 text-slate-500">{subtitle}</p>
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
      <span className="mb-2 block text-[12px] font-black text-slate-500">{label}</span>
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
