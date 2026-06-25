"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Loader2,
  PackagePlus,
  PauseCircle,
  RefreshCw,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  TimerReset,
  UserCheck,
  Users,
  WalletCards,
} from "lucide-react";

type SubscriberStatus =
  | "ACTIVE"
  | "TRIAL"
  | "CANCELED"
  | "EXPIRED"
  | "PAST_DUE"
  | "NO_SUBSCRIPTION";

type Subscriber = {
  schoolAccountId: string;
  accountName: string;
  slug: string;
  isActive: boolean;
  schoolName: string;
  educationDepartment: string;
  ownerName: string;
  ownerEmail: string;
  usersCount: number;
  studentsCount: number;
  pendingRequestsCount: number;
  computedStatus: SubscriberStatus;
  needsAttention: boolean;
  subscription: null | {
    id: string;
    status: string;
    computedStatus: SubscriberStatus;
    startsAt: string;
    endsAt: string | null;
    remainingDays: number | null;
    usable: boolean;
    planId: string;
    planName: string;
    planSlug: string;
  };
};

type Plan = {
  id: string;
  name: string;
  slug: string;
};

type Service = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: string;
};

type ServiceAccess = {
  schoolAccountId: string;
  serviceId: string;
  isEnabled: boolean;
  isPaid: boolean;
};

type SubscribersPayload = {
  stats: {
    total: number;
    active: number;
    trial: number;
    canceled: number;
    expired: number;
    noSubscription: number;
    needsAttention: number;
    pendingRequests: number;
    totalUsers: number;
    totalStudents: number;
  };
  plans: Plan[];
  services: Service[];
  serviceAccess: ServiceAccess[];
  subscribers: Subscriber[];
};

type FilterStatus =
  | "ALL"
  | "ACTIVE"
  | "TRIAL"
  | "CANCELED"
  | "EXPIRED"
  | "NO_SUBSCRIPTION"
  | "NEEDS_ATTENTION";

function statusLabel(status: SubscriberStatus) {
  if (status === "ACTIVE") return "نشط";
  if (status === "TRIAL") return "تجربة";
  if (status === "CANCELED") return "ملغي";
  if (status === "EXPIRED") return "منتهي";
  if (status === "PAST_DUE") return "بانتظار الدفع";
  if (status === "NO_SUBSCRIPTION") return "بدون اشتراك";
  return status;
}

function statusClasses(status: SubscriberStatus) {
  if (status === "ACTIVE") return "bg-emerald-50 text-emerald-700";
  if (status === "TRIAL") return "bg-sky-50 text-sky-700";
  if (status === "CANCELED") return "bg-slate-100 text-slate-600";
  if (status === "EXPIRED") return "bg-rose-50 text-rose-700";
  if (status === "PAST_DUE") return "bg-amber-50 text-amber-700";
  return "bg-slate-50 text-slate-500";
}

function decisionLabel(item: Subscriber) {
  if (item.pendingRequestsCount > 0) return "راجع طلبات التحويل";
  if (item.computedStatus === "NO_SUBSCRIPTION") return "فعّل باقة للحساب";
  if (item.computedStatus === "EXPIRED") return "مدّد الاشتراك";
  if (item.computedStatus === "CANCELED") return "راجع سبب الإلغاء";
  if (item.computedStatus === "PAST_DUE") return "متابعة الدفع";
  if ((item.subscription?.remainingDays ?? 999) <= 7) return "قريب الانتهاء";
  return "مستقر";
}

function decisionClass(item: Subscriber) {
  if (item.pendingRequestsCount > 0) return "bg-violet-50 text-violet-700";
  if (item.needsAttention) return "bg-amber-50 text-amber-700";
  return "bg-emerald-50 text-emerald-700";
}

export function AdminSubscribersCenter() {
  const [data, setData] = useState<SubscribersPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<FilterStatus>("ALL");
  const [planId, setPlanId] = useState("ALL");
  const [sortBy, setSortBy] = useState<
    "attention" | "remaining" | "students" | "newest"
  >("attention");
  const [message, setMessage] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ACTIVE");
  const [selectedDays, setSelectedDays] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [serviceEnabled, setServiceEnabled] = useState(true);
  const [servicePaid, setServicePaid] = useState(true);

  async function load() {
    setLoading(true);

    const response = await fetch("/api/dashboard/admin/subscribers", {
      cache: "no-store",
    });
    const result = await response.json();

    if (response.ok) {
      setData(result);
      setSelectedId((current) => current || result.subscribers?.[0]?.schoolAccountId || null);
    } else {
      setMessage(result.error || "تعذر تحميل المشتركين.");
    }

    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const availablePlans = useMemo(() => data?.plans || [], [data?.plans]);
  const availableServices = useMemo(() => data?.services || [], [data?.services]);

  const filteredSubscribers = useMemo(() => {
    const search = query.trim().toLowerCase();

    const list = [...(data?.subscribers || [])].filter((item) => {
      const matchesSearch =
        !search ||
        [
          item.schoolName,
          item.accountName,
          item.slug,
          item.ownerName,
          item.ownerEmail,
          item.educationDepartment,
          item.subscription?.planName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(search);

      const matchesStatus =
        status === "ALL"
          ? true
          : status === "NEEDS_ATTENTION"
            ? item.needsAttention
            : item.computedStatus === status;

      const matchesPlan = planId === "ALL" ? true : item.subscription?.planId === planId;

      return matchesSearch && matchesStatus && matchesPlan;
    });

    list.sort((a, b) => {
      if (sortBy === "attention") {
        return Number(b.needsAttention) - Number(a.needsAttention);
      }

      if (sortBy === "remaining") {
        return (
          (a.subscription?.remainingDays ?? 99999) -
          (b.subscription?.remainingDays ?? 99999)
        );
      }

      if (sortBy === "students") {
        return b.studentsCount - a.studentsCount;
      }

      return a.schoolName.localeCompare(b.schoolName, "ar");
    });

    return list;
  }, [data?.subscribers, planId, query, sortBy, status]);

  const selectedSubscriber =
    filteredSubscribers.find((item) => item.schoolAccountId === selectedId) ||
    filteredSubscribers[0] ||
    null;

  const selectedServiceAccess = useMemo(() => {
    if (!selectedSubscriber?.schoolAccountId || !selectedServiceId) return null;

    return (
      data?.serviceAccess.find(
        (item) =>
          item.schoolAccountId === selectedSubscriber.schoolAccountId &&
          item.serviceId === selectedServiceId,
      ) || null
    );
  }, [data?.serviceAccess, selectedServiceId, selectedSubscriber?.schoolAccountId]);

  const priorityItems = useMemo(() => {
    return [...(data?.subscribers || [])]
      .filter((item) => item.needsAttention)
      .sort((a, b) => {
        if (b.pendingRequestsCount !== a.pendingRequestsCount) {
          return b.pendingRequestsCount - a.pendingRequestsCount;
        }

        return (
          (a.subscription?.remainingDays ?? 99999) -
          (b.subscription?.remainingDays ?? 99999)
        );
      })
      .slice(0, 3);
  }, [data?.subscribers]);

  useEffect(() => {
    if (!selectedSubscriber) return;

    setSelectedPlanId(selectedSubscriber.subscription?.planId || availablePlans[0]?.id || "");
    setSelectedStatus(
      selectedSubscriber.subscription?.status === "TRIAL" ||
        selectedSubscriber.subscription?.status === "PAST_DUE"
        ? selectedSubscriber.subscription.status
        : "ACTIVE",
    );
    setSelectedDays("");
  }, [
    availablePlans,
    selectedSubscriber?.schoolAccountId,
    selectedSubscriber?.subscription?.planId,
    selectedSubscriber?.subscription?.status,
  ]);

  useEffect(() => {
    if (availableServices.length === 0) {
      setSelectedServiceId("");
      return;
    }

    setSelectedServiceId((current) =>
      current && availableServices.some((service) => service.id === current)
        ? current
        : availableServices[0]?.id || "",
    );
  }, [availableServices]);

  useEffect(() => {
    if (!selectedSubscriber?.schoolAccountId || !selectedServiceId) {
      setServiceEnabled(true);
      setServicePaid(true);
      return;
    }

    if (selectedServiceAccess) {
      setServiceEnabled(selectedServiceAccess.isEnabled);
      setServicePaid(selectedServiceAccess.isPaid);
      return;
    }

    setServiceEnabled(true);
    setServicePaid(false);
  }, [selectedServiceAccess, selectedServiceId, selectedSubscriber?.schoolAccountId]);

  async function runSubscriptionAction(input: {
    type: "extend" | "year" | "cancel";
    subscriber: Subscriber;
  }) {
    if (!input.subscriber.subscription?.id) {
      setMessage("هذا الحساب لا يملك اشتراكًا بعد. فعّله من القسم المخصص أسفل البطاقة.");
      return;
    }

    setProcessingId(input.subscriber.schoolAccountId);
    setMessage(null);

    const endpoint =
      input.type === "cancel"
        ? "/api/dashboard/admin/activations/cancel"
        : "/api/dashboard/admin/subscriptions";

    const body =
      input.type === "cancel"
        ? {
            subscriptionId: input.subscriber.subscription.id,
          }
        : {
            action: "extend-subscription",
            subscriptionId: input.subscriber.subscription.id,
            days: input.type === "year" ? 365 : 30,
          };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();
    setMessage(result.message || result.error || "تم تنفيذ العملية.");
    setProcessingId(null);

    await load();
  }

  async function assignPlanToSubscriber() {
    if (!selectedSubscriber) {
      setMessage("اختر الحساب من القائمة ثم نفّذ الإجراء المناسب.");
      return;
    }

    if (!selectedPlanId) {
      setMessage("اختر باقة للحساب أولًا.");
      return;
    }

    setProcessingId(selectedSubscriber.schoolAccountId);
    setMessage(null);

    const response = await fetch("/api/dashboard/admin/subscriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "assign-plan",
        schoolAccountId: selectedSubscriber.schoolAccountId,
        planId: selectedPlanId,
        status: selectedStatus,
        days: selectedDays,
      }),
    });

    const result = await response.json();
    setMessage(result.message || result.error || "تم تنفيذ العملية.");
    setProcessingId(null);

    await load();
  }

  async function saveServiceAccessForSubscriber() {
    if (!selectedSubscriber) {
      setMessage("اختر الحساب من القائمة ثم نفّذ الإجراء المناسب.");
      return;
    }

    if (!selectedServiceId) {
      setMessage("اختر خدمة أولًا.");
      return;
    }

    setProcessingId(selectedSubscriber.schoolAccountId);
    setMessage(null);

    const response = await fetch("/api/dashboard/admin/subscriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "toggle-service-access",
        schoolAccountId: selectedSubscriber.schoolAccountId,
        serviceId: selectedServiceId,
        isEnabled: serviceEnabled,
        isPaid: servicePaid,
      }),
    });

    const result = await response.json();
    setMessage(result.message || result.error || "تم تنفيذ العملية.");
    setProcessingId(null);

    await load();
  }

  if (loading) {
    return (
      <main className="grid min-h-[50vh] place-items-center">
        <div className="flex items-center gap-3 rounded-3xl border border-slate-100 bg-white px-5 py-4 text-sm font-black text-slate-500 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
          جار تحميل المشتركين...
        </div>
      </main>
    );
  }

  const stats = data?.stats;

  return (
    <main className="space-y-6 pb-24" dir="rtl">
      <section className="relative overflow-hidden rounded-[2.2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
        <div className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute -bottom-28 right-32 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative z-10 flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-black text-sky-100 ring-1 ring-white/10">
              <UserCheck className="h-4 w-4" />
              Admin Subscribers Decision Center
            </div>

            <h1 className="mt-4 text-4xl font-black tracking-tight">مركز قرارات المشتركين</h1>

            <p className="mt-3 max-w-3xl text-[14px] font-bold leading-7 text-slate-300">
              هذه الصفحة تساعدك تعرف من يحتاج متابعة الآن، ومن عنده اشتراك منتهي أو بدون
              باقة، وتمنحك نقطة واحدة لإدارة الاشتراك والخدمات للحساب المحدد.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-5 py-3 text-sm font-black text-white ring-1 ring-white/10 transition hover:bg-white/15"
            >
              <RefreshCw className="h-4 w-4" />
              تحديث
            </button>

            <Link
              href="/dashboard/admin/subscriptions"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-100"
            >
              إدارة الباقات
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {message ? (
        <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-[14px] font-bold text-sky-700">
          {message}
        </div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-4 xl:grid-cols-7">
        <StatCard title="إجمالي الحسابات" value={stats?.total || 0} icon={<Users />} />
        <StatCard title="نشطة" value={stats?.active || 0} icon={<CheckCircle2 />} tone="emerald" />
        <StatCard title="تجربة" value={stats?.trial || 0} icon={<Sparkles />} tone="sky" />
        <StatCard title="منتهية" value={stats?.expired || 0} icon={<TimerReset />} tone="rose" />
        <StatCard title="ملغية" value={stats?.canceled || 0} icon={<PauseCircle />} tone="slate" />
        <StatCard
          title="تحتاج متابعة"
          value={stats?.needsAttention || 0}
          icon={<AlertTriangle />}
          tone="amber"
        />
        <StatCard
          title="طلبات معلقة"
          value={stats?.pendingRequests || 0}
          icon={<WalletCards />}
          tone="violet"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px_180px_180px]">
              <div className="relative">
                <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="ابحث باسم الحساب، المدرسة، البريد، أو الباقة..."
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-12 text-sm font-bold outline-none transition focus:border-sky-200 focus:ring-4 focus:ring-sky-50"
                />
              </div>

              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as FilterStatus)}
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black outline-none focus:border-sky-200 focus:ring-4 focus:ring-sky-50"
              >
                <option value="ALL">كل الحالات</option>
                <option value="NEEDS_ATTENTION">تحتاج متابعة</option>
                <option value="ACTIVE">نشط</option>
                <option value="TRIAL">تجربة</option>
                <option value="EXPIRED">منتهي</option>
                <option value="CANCELED">ملغي</option>
                <option value="NO_SUBSCRIPTION">بدون اشتراك</option>
              </select>

              <select
                value={planId}
                onChange={(event) => setPlanId(event.target.value)}
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black outline-none focus:border-sky-200 focus:ring-4 focus:ring-sky-50"
              >
                <option value="ALL">كل الباقات</option>
                {availablePlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(event) =>
                  setSortBy(event.target.value as "attention" | "remaining" | "students" | "newest")
                }
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black outline-none focus:border-sky-200 focus:ring-4 focus:ring-sky-50"
              >
                <option value="attention">الأولوية</option>
                <option value="remaining">الأقرب انتهاء</option>
                <option value="students">الأكثر طلابًا</option>
                <option value="newest">ترتيب أبجدي</option>
              </select>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-xl font-black text-slate-950">الحسابات حسب الأولوية</h2>
                <p className="mt-1 text-[12px] font-bold text-slate-400">
                  النتائج: {filteredSubscribers.length}
                </p>
              </div>
            </div>

            <div className="grid gap-3 p-4">
              {filteredSubscribers.map((item) => (
                <button
                  key={item.schoolAccountId}
                  type="button"
                  onClick={() => setSelectedId(item.schoolAccountId)}
                  className={[
                    "rounded-[1.5rem] border p-4 text-right transition hover:bg-slate-50",
                    selectedSubscriber?.schoolAccountId === item.schoolAccountId
                      ? "border-sky-200 bg-sky-50/70 ring-1 ring-sky-100"
                      : "border-slate-100 bg-white",
                  ].join(" ")}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black text-slate-950">
                          {item.ownerName || item.accountName || item.schoolName}
                        </h3>

                        <span
                          className={[
                            "rounded-full px-3 py-1 text-xs font-black",
                            statusClasses(item.computedStatus),
                          ].join(" ")}
                        >
                          {statusLabel(item.computedStatus)}
                        </span>

                        <span
                          className={[
                            "rounded-full px-3 py-1 text-xs font-black",
                            decisionClass(item),
                          ].join(" ")}
                        >
                          {decisionLabel(item)}
                        </span>
                      </div>

                      <p className="mt-2 text-xs font-bold text-slate-400">
                        {item.ownerEmail || "بدون بريد"} · الحساب: {item.accountName || item.slug} ·
                        المدرسة: {item.schoolName} · {item.educationDepartment || "بدون إدارة تعليم"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs font-black">
                      <MiniMetric label="المستخدمون" value={item.usersCount} />
                      <MiniMetric label="الطلاب" value={item.studentsCount} />
                      <MiniMetric
                        label="المتبقي"
                        value={
                          item.subscription?.remainingDays !== null &&
                          item.subscription?.remainingDays !== undefined
                            ? item.subscription.remainingDays
                            : "—"
                        }
                      />
                    </div>
                  </div>
                </button>
              ))}

              {filteredSubscribers.length === 0 ? (
                <div className="rounded-3xl bg-slate-50 p-10 text-center text-sm font-bold text-slate-400">
                  لا توجد نتائج مطابقة للفلاتر الحالية.
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">ماذا أفعل الآن؟</h2>
            <p className="mt-1 text-sm font-bold text-slate-500">
              أعلى الحسابات التي تحتاج قرار سريع.
            </p>

            <div className="mt-4 space-y-3">
              {priorityItems.length > 0 ? (
                priorityItems.map((item) => (
                  <button
                    key={item.schoolAccountId}
                    type="button"
                    onClick={() => setSelectedId(item.schoolAccountId)}
                    className="w-full rounded-3xl bg-amber-50 p-4 text-right transition hover:bg-amber-100"
                  >
                    <p className="font-black text-amber-900">
                      {item.ownerName || item.accountName || item.schoolName}
                    </p>
                    <p className="mt-1 text-xs font-bold text-amber-700">{decisionLabel(item)}</p>
                  </button>
                ))
              ) : (
                <div className="rounded-3xl bg-emerald-50 p-4 text-sm font-black text-emerald-700">
                  لا توجد حسابات حرجة الآن.
                </div>
              )}
            </div>
          </section>

          {selectedSubscriber ? (
            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-sky-600">الحساب المحدد</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-950">
                    {selectedSubscriber.ownerName ||
                      selectedSubscriber.accountName ||
                      selectedSubscriber.schoolName}
                  </h2>
                  <p className="mt-1 text-xs font-bold text-slate-400">
                    {selectedSubscriber.ownerEmail || "بدون بريد"} · الحساب:{" "}
                    {selectedSubscriber.accountName || selectedSubscriber.slug} · المدرسة:{" "}
                    {selectedSubscriber.schoolName}
                  </p>
                </div>

                <span
                  className={[
                    "rounded-full px-3 py-1 text-xs font-black",
                    statusClasses(selectedSubscriber.computedStatus),
                  ].join(" ")}
                >
                  {statusLabel(selectedSubscriber.computedStatus)}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <InfoBox
                  label="الباقة"
                  value={selectedSubscriber.subscription?.planName || "بدون باقة"}
                />
                <InfoBox
                  label="المتبقي"
                  value={
                    selectedSubscriber.subscription?.remainingDays !== null &&
                    selectedSubscriber.subscription?.remainingDays !== undefined
                      ? `${selectedSubscriber.subscription.remainingDays} يوم`
                      : "غير محدد"
                  }
                />
                <InfoBox label="المستخدمون" value={String(selectedSubscriber.usersCount)} />
                <InfoBox label="الطلاب" value={String(selectedSubscriber.studentsCount)} />
              </div>

              <section className="mt-5 rounded-[1.6rem] border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-sky-600 shadow-sm">
                    <ShieldCheck className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-slate-950">إدارة الاشتراك والخدمات</h3>
                    <p className="mt-1 text-[13px] font-bold leading-6 text-slate-500">
                      اختر الحساب من القائمة ثم نفّذ الإجراء المناسب.
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  <div className="rounded-[1.35rem] border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2">
                      <PackagePlus className="h-5 w-5 text-sky-600" />
                      <h4 className="text-sm font-black text-slate-950">إسناد باقة</h4>
                    </div>

                    <div className="mt-4 space-y-3">
                      <select
                        value={selectedPlanId}
                        onChange={(event) => setSelectedPlanId(event.target.value)}
                        className="input"
                      >
                        <option value="">اختر الباقة</option>
                        {availablePlans.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name}
                          </option>
                        ))}
                      </select>

                      <select
                        value={selectedStatus}
                        onChange={(event) => setSelectedStatus(event.target.value)}
                        className="input"
                      >
                        <option value="ACTIVE">نشط</option>
                        <option value="TRIAL">تجربة</option>
                        <option value="PAST_DUE">بانتظار الدفع</option>
                      </select>

                      <input
                        value={selectedDays}
                        onChange={(event) => setSelectedDays(event.target.value)}
                        placeholder="مدة مخصصة بالأيام"
                        className="input"
                      />

                      <button
                        type="button"
                        disabled={processingId === selectedSubscriber.schoolAccountId}
                        onClick={assignPlanToSubscriber}
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 text-sm font-black text-white transition hover:bg-sky-700 disabled:opacity-60"
                      >
                        <Save className="h-4 w-4" />
                        إسناد وتفعيل
                      </button>
                    </div>
                  </div>

                  <div className="rounded-[1.35rem] border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2">
                      <Settings2 className="h-5 w-5 text-sky-600" />
                      <h4 className="text-sm font-black text-slate-950">صلاحيات الخدمات</h4>
                    </div>

                    <div className="mt-4 space-y-3">
                      <select
                        value={selectedServiceId}
                        onChange={(event) => setSelectedServiceId(event.target.value)}
                        className="input"
                      >
                        <option value="">اختر الخدمة</option>
                        {availableServices.map((service) => (
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

                      <p className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
                        {selectedServiceAccess
                          ? "تم تحميل الصلاحية الحالية لهذه الخدمة لهذا الحساب."
                          : "لا توجد صلاحية محفوظة سابقًا لهذه الخدمة على هذا الحساب."}
                      </p>

                      <button
                        type="button"
                        disabled={processingId === selectedSubscriber.schoolAccountId}
                        onClick={saveServiceAccessForSubscriber}
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
                      >
                        <Save className="h-4 w-4" />
                        حفظ صلاحية الخدمة
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <div className="mt-5 grid gap-2">
                <button
                  type="button"
                  disabled={processingId === selectedSubscriber.schoolAccountId}
                  onClick={() =>
                    void runSubscriptionAction({
                      type: "extend",
                      subscriber: selectedSubscriber,
                    })
                  }
                  className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-black text-white transition hover:bg-sky-700 disabled:opacity-60"
                >
                  تمديد 30 يوم
                </button>

                <button
                  type="button"
                  disabled={processingId === selectedSubscriber.schoolAccountId}
                  onClick={() =>
                    void runSubscriptionAction({
                      type: "year",
                      subscriber: selectedSubscriber,
                    })
                  }
                  className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  تمديد سنة
                </button>

                <button
                  type="button"
                  disabled={processingId === selectedSubscriber.schoolAccountId}
                  onClick={() =>
                    void runSubscriptionAction({
                      type: "cancel",
                      subscriber: selectedSubscriber,
                    })
                  }
                  className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-black text-amber-700 transition hover:bg-amber-100 disabled:opacity-60"
                >
                  إلغاء الاشتراك
                </button>

                {selectedSubscriber.pendingRequestsCount > 0 ? (
                  <Link
                    href="/dashboard/admin/activations"
                    className="rounded-2xl bg-violet-600 px-4 py-3 text-center text-sm font-black text-white transition hover:bg-violet-700"
                  >
                    مراجعة طلبات التحويل
                  </Link>
                ) : null}
              </div>
            </section>
          ) : null}
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

function StatCard({
  title,
  value,
  icon,
  tone = "slate",
}: {
  title: string;
  value: number;
  icon: React.ReactElement;
  tone?: "slate" | "emerald" | "sky" | "rose" | "amber" | "violet";
}) {
  const toneClass = {
    slate: "bg-slate-50 text-slate-700",
    emerald: "bg-emerald-50 text-emerald-700",
    sky: "bg-sky-50 text-sky-700",
    rose: "bg-rose-50 text-rose-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
  }[tone];

  return (
    <article className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-2xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-[12px] font-black text-slate-400">{title}</p>
        </div>

        <div className={["grid h-11 w-11 place-items-center rounded-2xl", toneClass].join(" ")}>
          {icon}
        </div>
      </div>
    </article>
  );
}

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return <span className="rounded-2xl bg-slate-50 px-3 py-2 text-slate-600">{label}: {value}</span>;
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xs font-black text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}
