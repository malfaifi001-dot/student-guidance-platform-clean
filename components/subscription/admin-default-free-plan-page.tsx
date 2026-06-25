"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";

type ServiceItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: string;
};

type DefaultFreePlanAccount = {
  schoolAccountId: string;
  accountName: string;
  accountSlug: string;
  schoolName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerRole: string | null;
  subscriptionStatus: string;
  startsAt: string | null;
  endsAt: string | null;
  remainingDays: number | null;
  usersCount: number;
  studentsCount: number;
  sessionsCount: number;
  activeDaysCount: number;
  reportsCount: number;
};

type DefaultFreePlanConfig = {
  planId: string;
  planName: string;
  slug: string;
  enabled: boolean;
  durationDays: number;
  accessMode: "ALL_SERVICES" | "CUSTOM_SERVICES";
  enabledServiceSlugs: string[];
  metrics: {
    currentAccountsCount: number;
    convertedAccountsCount: number;
    averageDaysBeforeConversion: number | null;
    sessionCount: number;
    activeDaysCount: number;
    reportCount: number;
  };
  accounts: DefaultFreePlanAccount[];
};

type DefaultFreePageData = {
  defaultFreePlan: DefaultFreePlanConfig;
  services: ServiceItem[];
};

type StatusFilter = "ALL" | "ACTIVE" | "EXPIRED" | "NEAR_EXPIRY" | "STABLE";
type RemainingFilter = "ALL" | "UNDER_7" | "UNDER_15" | "OVER_15";
type ActivityFilter =
  | "ALL"
  | "HAS_SESSIONS"
  | "NO_SESSIONS"
  | "HAS_REPORTS"
  | "NO_REPORTS";
type AccountStatusToken = Exclude<StatusFilter, "ALL">;

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "مدير النظام",
  SCHOOL_OWNER: "مالك المدرسة",
  COUNSELOR: "موجه طلابي",
  ACTIVITY_LEADER: "رائد النشاط",
  TEACHER: "معلم",
  STAFF: "موظف",
};

function roleLabel(role: string | null) {
  if (!role) return "غير محدد";
  return ROLE_LABELS[role] || role;
}

function statusLabel(status: AccountStatusToken) {
  if (status === "ACTIVE") return "نشط";
  if (status === "EXPIRED") return "منتهي";
  if (status === "NEAR_EXPIRY") return "قريب الانتهاء";
  return "مستقر";
}

function statusClasses(status: AccountStatusToken) {
  if (status === "ACTIVE") return "bg-emerald-50 text-emerald-700";
  if (status === "EXPIRED") return "bg-rose-50 text-rose-700";
  if (status === "NEAR_EXPIRY") return "bg-amber-50 text-amber-700";
  return "bg-sky-50 text-sky-700";
}

function getAccountStatusTokens(account: DefaultFreePlanAccount): AccountStatusToken[] {
  if (account.remainingDays !== null && account.remainingDays <= 0) {
    return ["EXPIRED"];
  }

  const tokens: AccountStatusToken[] = [];

  if (account.subscriptionStatus === "ACTIVE") {
    tokens.push("ACTIVE");
  }

  if (account.remainingDays !== null && account.remainingDays <= 7) {
    tokens.push("NEAR_EXPIRY");
  } else {
    tokens.push("STABLE");
  }

  return Array.from(new Set(tokens));
}

function formatRemainingDays(remainingDays: number | null) {
  if (remainingDays === null || Number.isNaN(remainingDays)) {
    return "—";
  }

  return `${remainingDays} يوم`;
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
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

export function AdminDefaultFreePlanPage() {
  const [data, setData] = useState<DefaultFreePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [planName, setPlanName] = useState("الباقة التلقائية");
  const [enabled, setEnabled] = useState(true);
  const [durationDays, setDurationDays] = useState("14");
  const [accessMode, setAccessMode] = useState<"ALL_SERVICES" | "CUSTOM_SERVICES">(
    "ALL_SERVICES",
  );
  const [enabledServiceSlugs, setEnabledServiceSlugs] = useState<string[]>([]);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [remainingFilter, setRemainingFilter] = useState<RemainingFilter>("ALL");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("ALL");

  async function load() {
    setLoading(true);

    const response = await fetch("/api/dashboard/admin/subscriptions", {
      cache: "no-store",
    });
    const result = await readApiResponse(response);

    if (response.ok) {
      const nextData = {
        defaultFreePlan: result.defaultFreePlan as DefaultFreePlanConfig,
        services: Array.isArray(result.services) ? (result.services as ServiceItem[]) : [],
      };

      setData(nextData);
      setPlanName(nextData.defaultFreePlan.planName || "الباقة التلقائية");
      setEnabled(Boolean(nextData.defaultFreePlan.enabled));
      setDurationDays(String(nextData.defaultFreePlan.durationDays || 14));
      setAccessMode(
        nextData.defaultFreePlan.accessMode === "CUSTOM_SERVICES"
          ? "CUSTOM_SERVICES"
          : "ALL_SERVICES",
      );
      setEnabledServiceSlugs(nextData.defaultFreePlan.enabledServiceSlugs || []);
    } else {
      setMessage({
        type: "error",
        text:
          typeof result.error === "string"
            ? result.error
            : "تعذر تحميل إعدادات الباقة التلقائية.",
      });
    }

    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const selectedServicesCount = useMemo(
    () => enabledServiceSlugs.length,
    [enabledServiceSlugs],
  );

  const accounts = data?.defaultFreePlan.accounts ?? [];

  const filteredAccounts = useMemo(() => {
    const normalizedQuery = normalizeText(query);

    return accounts.filter((account) => {
      if (normalizedQuery) {
        const searchText = normalizeText(
          [
            account.accountName,
            account.accountSlug,
            account.schoolName,
            account.ownerName,
            account.ownerEmail,
            account.ownerPhone,
          ]
            .filter(Boolean)
            .join(" "),
        );

        if (!searchText.includes(normalizedQuery)) {
          return false;
        }
      }

      if (statusFilter !== "ALL") {
        const statusTokens = getAccountStatusTokens(account);

        if (!statusTokens.includes(statusFilter)) {
          return false;
        }
      }

      if (remainingFilter === "UNDER_7") {
        if (account.remainingDays === null || account.remainingDays >= 7) {
          return false;
        }
      }

      if (remainingFilter === "UNDER_15") {
        if (account.remainingDays === null || account.remainingDays >= 15) {
          return false;
        }
      }

      if (remainingFilter === "OVER_15") {
        if (account.remainingDays === null || account.remainingDays <= 15) {
          return false;
        }
      }

      if (activityFilter === "HAS_SESSIONS" && account.sessionsCount <= 0) {
        return false;
      }

      if (activityFilter === "NO_SESSIONS" && account.sessionsCount > 0) {
        return false;
      }

      if (activityFilter === "HAS_REPORTS" && account.reportsCount <= 0) {
        return false;
      }

      if (activityFilter === "NO_REPORTS" && account.reportsCount > 0) {
        return false;
      }

      return true;
    });
  }, [accounts, activityFilter, query, remainingFilter, statusFilter]);

  function toggleServiceSlug(slug: string) {
    setEnabledServiceSlugs((current) =>
      current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug],
    );
  }

  function resetFilters() {
    setQuery("");
    setStatusFilter("ALL");
    setRemainingFilter("ALL");
    setActivityFilter("ALL");
  }

  async function save() {
    setMessage(null);

    const response = await fetch("/api/dashboard/admin/subscriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "save-default-free-plan",
        planName,
        enabled,
        durationDays,
        accessMode,
        enabledServiceSlugs,
      }),
    });

    const result = await readApiResponse(response);

    if (response.ok) {
      setMessage({
        type: "success",
        text:
          typeof result.message === "string"
            ? result.message
            : "تم حفظ إعدادات الباقة التلقائية.",
      });
      await load();
    } else {
      setMessage({
        type: "error",
        text:
          typeof result.error === "string"
            ? result.error
            : "تعذر حفظ إعدادات الباقة التلقائية.",
      });
    }
  }

  if (loading) {
    return (
      <main className="grid min-h-[50vh] place-items-center">
        <div className="flex items-center gap-3 rounded-3xl border border-slate-100 bg-white px-5 py-4 text-sm font-black text-slate-500 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
          جاري تحميل الباقة التلقائية...
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
              <ShieldCheck className="h-4 w-4" />
              الباقة التلقائية
            </div>

            <h1 className="mt-3 text-3xl font-black text-slate-950">الباقة التلقائية</h1>

            <p className="mt-2 max-w-3xl text-[14px] font-bold leading-7 text-slate-600">
              تُفعّل تلقائيًا للحسابات الجديدة أو الحسابات التي لا تملك اشتراكًا صالحًا.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/admin/subscriptions"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowRight className="h-4 w-4" />
              العودة إلى الباقات
            </Link>

            <Link
              href="/dashboard/admin/subscribers"
              className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-100 transition hover:bg-sky-700"
            >
              الانتقال إلى المشتركين
              <Users className="h-4 w-4" />
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
              : "border-rose-100 bg-rose-50 text-rose-700",
          ].join(" ")}
        >
          {message.text}
        </div>
      ) : null}

      <section className="rounded-[1.45rem] border border-slate-100 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
          <div className="space-y-4">
            <label className="rounded-[1.25rem] border border-slate-100 bg-slate-50 p-4">
              <span className="mb-2 block text-[12px] font-black text-slate-500">
                اسم الباقة
              </span>
              <input
                value={planName}
                onChange={(event) => setPlanName(event.target.value)}
                placeholder="الباقة التلقائية"
                className="input"
              />
            </label>

            <label className="rounded-[1.25rem] border border-slate-100 bg-slate-50 p-4">
              <span className="mb-2 block text-[12px] font-black text-slate-500">
                مدة الباقة بالأيام
              </span>
              <input
                type="number"
                min="1"
                value={durationDays}
                onChange={(event) => setDurationDays(event.target.value)}
                className="input"
              />
            </label>

            <div>
              <p className="text-[13px] font-black text-slate-700">اختيار الصلاحيات</p>

              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setAccessMode("ALL_SERVICES")}
                  className={[
                    "rounded-2xl border p-3 text-right text-sm font-black transition",
                    accessMode === "ALL_SERVICES"
                      ? "border-sky-100 bg-sky-50 text-sky-700 shadow-sm"
                      : "border-slate-100 bg-slate-50 text-slate-500 hover:bg-white",
                  ].join(" ")}
                >
                  كل الخدمات
                </button>

                <button
                  type="button"
                  onClick={() => setAccessMode("CUSTOM_SERVICES")}
                  className={[
                    "rounded-2xl border p-3 text-right text-sm font-black transition",
                    accessMode === "CUSTOM_SERVICES"
                      ? "border-sky-100 bg-sky-50 text-sky-700 shadow-sm"
                      : "border-slate-100 bg-slate-50 text-slate-500 hover:bg-white",
                  ].join(" ")}
                >
                  خدمات محددة
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setEnabled((value) => !value)}
            className={[
              "rounded-[1.25rem] border p-4 text-right transition",
              enabled
                ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-slate-50 text-slate-500",
            ].join(" ")}
          >
            <span className="block text-[12px] font-black">تفعيل الباقة التلقائية</span>
            <span className="mt-2 block text-[16px] font-black">
              {enabled ? "مفعلة" : "متوقفة"}
            </span>
            <span className="mt-1 block text-[12px] font-bold opacity-80">
              {enabled
                ? "سيتم تطبيقها تلقائيًا عند الأهلية."
                : "لن يتم تطبيقها حتى بعد تسجيل الدخول."}
            </span>
          </button>
        </div>

        {accessMode === "CUSTOM_SERVICES" ? (
          <div className="mt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[13px] font-black text-slate-700">الخدمات المحددة</p>
              <span className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-black text-sky-700">
                {selectedServicesCount} خدمة
              </span>
            </div>

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
                      <span className="block text-[14px] font-black">{service.name}</span>
                      <span className="mt-1 block text-[11px] font-bold opacity-70">
                        {service.slug}
                      </span>
                    </span>

                    {active ? <CheckCircle2 className="h-5 w-5" /> : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-[1.25rem] border border-emerald-100 bg-emerald-50 p-4 text-[13px] font-bold leading-7 text-emerald-800">
            سيتم تفعيل كل الخدمات الفعالة داخل الباقة التلقائية.
          </div>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="الحسابات الحالية على الباقة التلقائية"
            value={String(data?.defaultFreePlan.metrics.currentAccountsCount ?? 0)}
          />
          <MetricCard
            label="الحسابات التي انتقلت إلى باقة أخرى"
            value={String(data?.defaultFreePlan.metrics.convertedAccountsCount ?? 0)}
          />
          <MetricCard
            label="متوسط مدة البقاء على الباقة التلقائية"
            value={
              data?.defaultFreePlan.metrics.averageDaysBeforeConversion == null
                ? "—"
                : `${data.defaultFreePlan.metrics.averageDaysBeforeConversion} يوم`
            }
          />
          <MetricCard
            label="عدد الجلسات / أيام النشاط التقريبية"
            value={`${data?.defaultFreePlan.metrics.sessionCount ?? 0} / ${
              data?.defaultFreePlan.metrics.activeDaysCount ?? 0
            }`}
          />
          <MetricCard
            label="عدد التقارير الصادرة"
            value={String(data?.defaultFreePlan.metrics.reportCount ?? 0)}
          />
        </div>

        <button
          type="button"
          onClick={save}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 text-sm font-black text-white shadow-lg shadow-sky-100 transition hover:bg-sky-700"
        >
          <Save className="h-4 w-4" />
          حفظ إعدادات الباقة التلقائية
        </button>
      </section>

      <section className="rounded-[1.45rem] border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-950">الحسابات على الباقة التلقائية</h2>
            <p className="mt-2 text-[13px] font-bold leading-6 text-slate-500">
              اعرف الحسابات التي تعمل على الباقة التلقائية وراعي كل حساب ومؤشرات الاستخدام.
            </p>
          </div>

          <div className="rounded-full bg-sky-50 px-3 py-1.5 text-[12px] font-black text-sky-700">
            {filteredAccounts.length} من {accounts.length} حساب
          </div>
        </div>

        <div className="mt-4 rounded-[1.25rem] border border-slate-100 bg-slate-50 p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2 xl:col-span-2">
              <span className="block text-[12px] font-black text-slate-500">بحث نصي</span>
              <div className="relative">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="ابحث باسم الحساب، المدرسة، راعي الحساب، البريد أو الجوال..."
                  className="input pr-10"
                />
              </div>
            </label>

            <label className="space-y-2">
              <span className="block text-[12px] font-black text-slate-500">فلتر الحالة</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="select"
              >
                <option value="ALL">الكل</option>
                <option value="ACTIVE">نشط</option>
                <option value="EXPIRED">منتهي</option>
                <option value="NEAR_EXPIRY">قريب الانتهاء</option>
                <option value="STABLE">مستقر</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="block text-[12px] font-black text-slate-500">فلتر المتبقي</span>
              <select
                value={remainingFilter}
                onChange={(event) => setRemainingFilter(event.target.value as RemainingFilter)}
                className="select"
              >
                <option value="ALL">الكل</option>
                <option value="UNDER_7">أقل من 7 أيام</option>
                <option value="UNDER_15">أقل من 15 يوم</option>
                <option value="OVER_15">أكثر من 15 يوم</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="block text-[12px] font-black text-slate-500">فلتر النشاط</span>
              <select
                value={activityFilter}
                onChange={(event) => setActivityFilter(event.target.value as ActivityFilter)}
                className="select"
              >
                <option value="ALL">الكل</option>
                <option value="HAS_SESSIONS">لديه جلسات</option>
                <option value="NO_SESSIONS">بدون جلسات</option>
                <option value="HAS_REPORTS">لديه تقارير</option>
                <option value="NO_REPORTS">بدون تقارير</option>
              </select>
            </label>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 transition hover:bg-slate-100"
            >
              <RotateCcw className="h-4 w-4" />
              تصفير الفلاتر
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[1180px] w-full divide-y divide-slate-100 text-right">
            <thead>
              <tr className="text-[12px] font-black text-slate-500">
                <th className="px-4 py-3">الحساب / المدرسة</th>
                <th className="px-4 py-3">راعي الحساب</th>
                <th className="px-4 py-3">الحالة</th>
                <th className="px-4 py-3">المتبقي</th>
                <th className="px-4 py-3">المستخدمون</th>
                <th className="px-4 py-3">الطلاب</th>
                <th className="px-4 py-3">النشاط</th>
                <th className="px-4 py-3">التقارير</th>
                <th className="px-4 py-3">إجراءات</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredAccounts.length ? (
                filteredAccounts.map((account) => (
                  <tr key={account.schoolAccountId} className="bg-white">
                    <td className="px-4 py-4 align-top">
                      <div className="min-w-[220px]">
                        <p className="text-sm font-black text-slate-950">{account.accountName}</p>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          {account.schoolName || "لا يوجد اسم مدرسة"}
                        </p>
                        <p className="mt-1 text-[11px] font-black text-slate-400">
                          {account.accountSlug}
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <div className="min-w-[220px]">
                        <p className="text-sm font-black text-slate-950">
                          {account.ownerName || "غير محدد"}
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          {account.ownerEmail || "بدون بريد"}
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-500" dir="ltr">
                          {account.ownerPhone || "—"}
                        </p>
                        <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">
                          {roleLabel(account.ownerRole)}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <div className="flex min-w-[160px] flex-wrap gap-2">
                        {getAccountStatusTokens(account).map((status) => (
                          <span
                            key={`${account.schoolAccountId}-${status}`}
                            className={`rounded-full px-3 py-1 text-[11px] font-black ${statusClasses(status)}`}
                          >
                            {statusLabel(status)}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <div className="min-w-[90px]">
                        <p className="text-sm font-black text-slate-950">
                          {formatRemainingDays(account.remainingDays)}
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-4 align-top text-sm font-black text-slate-800">
                      {account.usersCount}
                    </td>

                    <td className="px-4 py-4 align-top text-sm font-black text-slate-800">
                      {account.studentsCount}
                    </td>

                    <td className="px-4 py-4 align-top">
                      <div className="min-w-[110px]">
                        <p className="text-sm font-black text-slate-950">
                          {account.sessionsCount} جلسة
                        </p>
                        <p className="mt-1 text-[11px] font-bold text-slate-500">
                          {account.activeDaysCount} يوم نشاط
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-4 align-top text-sm font-black text-slate-800">
                      {account.reportsCount}
                    </td>

                    <td className="px-4 py-4 align-top">
                      <Link
                        href={`/dashboard/admin/subscribers?accountId=${account.schoolAccountId}`}
                        className="inline-flex items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-black text-sky-700 transition hover:bg-sky-100"
                      >
                        فتح في المشتركين
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-10 text-center text-sm font-bold text-slate-500"
                  >
                    لا توجد حسابات مطابقة للفلاتر الحالية.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <style jsx>{`
        .input,
        .select {
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

        .select {
          appearance: none;
        }

        .input:focus,
        .select:focus {
          border-color: rgb(186 230 253);
          box-shadow: 0 0 0 4px rgb(240 249 255);
        }
      `}</style>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
      <p className="text-lg font-black text-slate-950">{value}</p>
      <p className="mt-1 text-[11px] font-black leading-5 text-slate-400">{label}</p>
    </div>
  );
}
