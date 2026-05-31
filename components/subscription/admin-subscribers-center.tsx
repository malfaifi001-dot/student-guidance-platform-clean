"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Crown,
  FileText,
  Loader2,
  PauseCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TimerReset,
  UserCheck,
  Users,
  WalletCards,
  XCircle,
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

  async function load() {
    setLoading(true);

    const response = await fetch("/api/dashboard/admin/subscribers");
    const result = await response.json();

    if (response.ok) {
      setData(result);
    } else {
      setMessage(result.error || "تعذر تحميل المشتركين.");
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

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

      const matchesPlan =
        planId === "ALL" ? true : item.subscription?.planId === planId;

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

  async function runAction(input: {
    type: "extend" | "year" | "cancel";
    subscriber: Subscriber;
  }) {
    if (!input.subscriber.subscription?.id) {
      setMessage("هذا الحساب لا يملك اشتراكًا بعد. فعّله من صفحة إدارة الاشتراكات.");
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
    <main className="space-y-5" dir="rtl">
      <section className="relative overflow-hidden rounded-[1.7rem] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-blue-50 p-5 shadow-sm">
        <div className="absolute -left-16 -top-16 h-52 w-52 rounded-full bg-sky-100/70 blur-3xl" />

        <div className="relative z-10 flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12px] font-black text-sky-700 shadow-sm">
              <UserCheck className="h-4 w-4" />
              Admin Subscribers Center
            </div>

            <h1 className="mt-3 text-3xl font-black text-slate-950">
              المشتركين والحسابات
            </h1>

            <p className="mt-2 max-w-3xl text-[14px] font-bold leading-7 text-slate-600">
              راقب الحسابات، الاشتراكات، الأيام المتبقية، طلبات التحويل،
              والحسابات التي تحتاج متابعة من مكان واحد.
            </p>
          </div>

          <Link
            href="/dashboard/admin/subscriptions"
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800"
          >
            إدارة الباقات
          </Link>
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
        <StatCard title="تحتاج متابعة" value={stats?.needsAttention || 0} icon={<AlertTriangle />} tone="amber" />
        <StatCard title="طلبات معلقة" value={stats?.pendingRequests || 0} icon={<WalletCards />} tone="violet" />
      </section>

      <section className="rounded-[1.45rem] border border-slate-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px_180px_180px]">
          <div className="relative">
            <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث باسم الحساب، المدرسة، الإيميل، الباقة..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-12 text-sm font-bold outline-none focus:border-sky-200 focus:ring-4 focus:ring-sky-50"
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
            {data?.plans.map((plan) => (
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

      <section className="overflow-hidden rounded-[1.45rem] border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">
              قائمة المشتركين
            </h2>
            <p className="mt-1 text-[12px] font-bold text-slate-400">
              النتائج: {filteredSubscribers.length}
            </p>
          </div>

          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-100"
          >
            <RefreshCw className="h-4 w-4" />
            تحديث
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-right text-sm">
            <thead className="bg-slate-50 text-xs font-black text-slate-500">
              <tr>
                <th className="p-4">الحساب</th>
                <th className="p-4">المسؤول</th>
                <th className="p-4">الباقة</th>
                <th className="p-4">الحالة</th>
                <th className="p-4">ينتهي</th>
                <th className="p-4">المستخدمون</th>
                <th className="p-4">الطلاب</th>
                <th className="p-4">طلبات معلقة</th>
                <th className="p-4">إجراءات</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredSubscribers.map((item) => (
                <tr
                  key={item.schoolAccountId}
                  className={item.needsAttention ? "bg-amber-50/25" : "bg-white"}
                >
                  <td className="p-4">
                    <p className="font-black text-slate-950">{item.schoolName}</p>
                    <p className="mt-1 text-xs font-bold text-slate-400">
                      {item.slug}
                    </p>
                  </td>

                  <td className="p-4">
                    <p className="font-bold text-slate-700">{item.ownerName}</p>
                    <p className="mt-1 text-xs font-bold text-slate-400">
                      {item.ownerEmail || "—"}
                    </p>
                  </td>

                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
                      <Crown className="h-3.5 w-3.5" />
                      {item.subscription?.planName || "بدون باقة"}
                    </span>
                  </td>

                  <td className="p-4">
                    <span
                      className={[
                        "inline-flex rounded-full px-3 py-1 text-xs font-black",
                        statusClasses(item.computedStatus),
                      ].join(" ")}
                    >
                      {statusLabel(item.computedStatus)}
                    </span>
                  </td>

                  <td className="p-4 text-xs font-bold text-slate-500">
                    {item.subscription?.endsAt ? (
                      <div>
                        <p>
                          {new Date(item.subscription.endsAt).toLocaleDateString(
                            "ar-SA"
                          )}
                        </p>
                        <p className="mt-1">
                          {item.subscription.remainingDays !== null
                            ? `${item.subscription.remainingDays} يوم`
                            : "غير محدد"}
                        </p>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td className="p-4 font-black text-slate-700">
                    {item.usersCount}
                  </td>

                  <td className="p-4 font-black text-slate-700">
                    {item.studentsCount}
                  </td>

                  <td className="p-4">
                    {item.pendingRequestsCount > 0 ? (
                      <Link
                        href="/dashboard/admin/activations"
                        className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700"
                      >
                        {item.pendingRequestsCount} طلب
                      </Link>
                    ) : (
                      <span className="text-xs font-bold text-slate-300">لا يوجد</span>
                    )}
                  </td>

                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={processingId === item.schoolAccountId}
                        onClick={() => runAction({ type: "extend", subscriber: item })}
                        className="rounded-xl bg-sky-600 px-3 py-2 text-xs font-black text-white transition hover:bg-sky-700 disabled:opacity-60"
                      >
                        +30
                      </button>

                      <button
                        type="button"
                        disabled={processingId === item.schoolAccountId}
                        onClick={() => runAction({ type: "year", subscriber: item })}
                        className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-700 disabled:opacity-60"
                      >
                        سنة
                      </button>

                      <button
                        type="button"
                        disabled={processingId === item.schoolAccountId}
                        onClick={() => runAction({ type: "cancel", subscriber: item })}
                        className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 transition hover:bg-amber-100 disabled:opacity-60"
                      >
                        إلغاء
                      </button>

                      <Link
                        href="/dashboard/admin/subscriptions"
                        className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-100"
                      >
                        إدارة
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredSubscribers.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="p-10 text-center text-sm font-bold text-slate-400"
                  >
                    لا توجد نتائج مطابقة للفلاتر الحالية.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
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
    <article className="rounded-[1.3rem] border border-slate-100 bg-white p-4 shadow-sm">
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
