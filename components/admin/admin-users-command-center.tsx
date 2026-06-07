"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Crown,
  Eye,
  FileText,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserCog,
  UserRound,
  Users,
  WalletCards,
  XCircle,
} from "lucide-react";

type AdminUserItem = {
  id: string;
  name: string | null;
  officialName: string | null;
  email: string;
  phone: string | null;
  role: string;
  gender: string;
  jobTitle: string | null;
  isActive: boolean;
  onboardingCompleted: boolean;
  createdAt: string;
  lastSeenAt: string | null;
  schoolAccountId: string | null;
  schoolName: string;
  schoolAccountName: string;
  educationDepartment: string;
  schoolUsersCount: number;
  studentsCount: number;
  casesCount: number;
  pendingTransfersCount: number;
  riskLevel:
    | "OK"
    | "DISABLED"
    | "NO_SUBSCRIPTION"
    | "SUBSCRIPTION_ISSUE"
    | "PENDING_PAYMENT"
  | "INACTIVE"
  | "VERY_ACTIVE"
  | "INCOMPLETE_ONBOARDING";
  subscription: null | {
    id: string;
    status: string;
    computedStatus: string;
    usable: boolean;
    planName: string;
    planId: string;
    endsAt: string | null;
    remainingDays: number | null;
  };
};

type ActivityLogItem = {
  id: string;
  actorUserId: string | null;
  targetUserId: string | null;
  schoolAccountId: string | null;
  category: string;
  action: string;
  severity: string;
  title: string;
  details: unknown;
  createdAt: string;
};

type UsersPayload = {
  stats: {
    totalUsers: number;
    counselors: number;
    admins: number;
    activeUsers: number;
    disabledUsers: number;
    subscribedUsers: number;
    withoutSubscription: number;
    needsAttention: number;
    pendingTransfers: number;
  };
  users: AdminUserItem[];
  logs: ActivityLogItem[];
};

type UserStatusFilter =
  | "ALL"
  | "ACTIVE"
  | "DISABLED"
  | "SUBSCRIBED"
  | "NO_SUBSCRIPTION"
  | "NEEDS_ATTENTION"
  | "PENDING_PAYMENT";

function roleLabel(role: string) {
  if (role === "ADMIN") return "أدمن";
  if (role === "COUNSELOR") return "موجه/موجهة";
  if (role === "SCHOOL_OWNER") return "مالك حساب";
  if (role === "STAFF") return "موظف";
  return role;
}

function subscriptionLabel(status?: string) {
  if (!status) return "بدون اشتراك";
  if (status === "ACTIVE") return "مشترك";
  if (status === "TRIAL") return "تجربة";
  if (status === "CANCELED") return "ملغي";
  if (status === "EXPIRED") return "منتهي";
  if (status === "PAST_DUE") return "بانتظار الدفع";
  return status;
}

function riskLabel(risk: AdminUserItem["riskLevel"]) {
  if (risk === "OK") return "سليم";
  if (risk === "DISABLED") return "موقوف";
  if (risk === "NO_SUBSCRIPTION") return "بدون اشتراك";
  if (risk === "SUBSCRIPTION_ISSUE") return "مشكلة اشتراك";
  if (risk === "PENDING_PAYMENT") return "طلب دفع معلق";
  return risk;
}

function riskClass(risk: AdminUserItem["riskLevel"]) {
  if (risk === "OK") return "bg-emerald-50 text-emerald-700";
  if (risk === "DISABLED") return "bg-slate-100 text-slate-600";
  if (risk === "PENDING_PAYMENT") return "bg-violet-50 text-violet-700";
  return "bg-amber-50 text-amber-700";
}

export function AdminUsersCommandCenter() {
  const [data, setData] = useState<UsersPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("ALL");
  const [status, setStatus] = useState<UserStatusFilter>("ALL");
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);

    const response = await fetch("/api/dashboard/admin/users");
    const result = await response.json();

    if (response.ok) {
      setData(result);
      setSelectedUser((current) => {
        if (!current) return result.users?.[0] || null;
        return result.users.find((user: AdminUserItem) => user.id === current.id) || result.users?.[0] || null;
      });
    } else {
      setMessage(result.error || "تعذر تحميل المستخدمين.");
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filteredUsers = useMemo(() => {
    const search = query.trim().toLowerCase();

    return [...(data?.users || [])]
      .filter((user) => {
        const matchesSearch =
          !search ||
          [
            user.name,
            user.officialName,
            user.email,
            user.phone,
            user.schoolName,
            user.schoolAccountName,
            user.educationDepartment,
            user.jobTitle,
            user.subscription?.planName,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(search);

        const matchesRole = role === "ALL" ? true : user.role === role;

        const matchesStatus =
          status === "ALL"
            ? true
            : status === "ACTIVE"
              ? user.isActive
              : status === "DISABLED"
                ? !user.isActive
                : status === "SUBSCRIBED"
                  ? Boolean(user.subscription?.usable)
                  : status === "NO_SUBSCRIPTION"
                    ? !user.subscription
                    : status === "PENDING_PAYMENT"
                      ? user.pendingTransfersCount > 0
                      : user.riskLevel !== "OK";

        return matchesSearch && matchesRole && matchesStatus;
      })
      .sort((a, b) => {
        const aRisk = a.riskLevel === "OK" ? 1 : 0;
        const bRisk = b.riskLevel === "OK" ? 1 : 0;

        if (aRisk !== bRisk) return aRisk - bRisk;

        const aLast = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0;
        const bLast = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0;

        return bLast - aLast;
      });
  }, [data?.users, query, role, status]);

  const selectedLogs = useMemo(() => {
    if (!selectedUser) return [];

    return (data?.logs || []).filter(
      (log) =>
        log.targetUserId === selectedUser.id ||
        log.actorUserId === selectedUser.id ||
        log.schoolAccountId === selectedUser.schoolAccountId
    );
  }, [data?.logs, selectedUser]);

  async function runAction(action: string, user: AdminUserItem, extra?: Record<string, unknown>) {
    setProcessingId(user.id);
    setMessage(null);

    const response = await fetch("/api/dashboard/admin/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action,
        userId: user.id,
        ...extra,
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
          جار تحميل مركز المستخدمين...
        </div>
      </main>
    );
  }

  const stats = data?.stats;

  return (
    <main className="space-y-6 pb-24" dir="rtl">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white via-sky-50 to-blue-50 p-6 shadow-sm">
        <div className="absolute -left-16 -top-16 h-52 w-52 rounded-full bg-sky-100/70 blur-3xl" />

        <div className="relative z-10 flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12px] font-black text-slate-700 shadow-sm">
              <UserCog className="h-4 w-4" />
              Admin Users Command Center
            </div>

            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
              إدارة المستخدمين والموجهين
            </h1>

            <p className="mt-2 max-w-3xl text-[14px] font-bold leading-7 text-slate-600">
              تحكم كامل في الموجهين، الحسابات، الاشتراكات، الجلسات، وسجل العمليات.
              مناسب لو عندك مئات أو آلاف المستخدمين.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/admin/subscribers"
              className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-sky-700"
            >
              المشتركين
            </Link>
<Link
              href="/dashboard/admin/subscriptions"
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800"
            >
              الباقات
            </Link>
          </div>
        </div>
      </section>

      {message ? (
        <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-[14px] font-bold text-sky-700">
          {message}
        </div>
      ) : null}

      
      {/* SMART_SELECTED_USER_BAR */}
      {selectedUser ? (
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 text-white shadow-sm">
          <div className="relative p-5">
            <div className="absolute -left-20 -top-20 h-56 w-56 rounded-full bg-sky-500/20 blur-3xl" />
            <div className="absolute -bottom-24 right-24 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />

            <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-3xl bg-white/10 ring-1 ring-white/10">
                  <UserRound className="h-6 w-6" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-black text-sky-200">
                    المستخدم المحدد الآن
                  </p>
                  <h2 className="mt-1 truncate text-2xl font-black">
                    {selectedUser.officialName || selectedUser.name || "بدون اسم"}
                  </h2>
                  <p className="mt-1 truncate text-xs font-bold text-slate-300">
                    {selectedUser.email} · {roleLabel(selectedUser.role)} · {selectedUser.schoolName || "بدون مدرسة"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/dashboard/admin/users/${selectedUser.id}`}
                  className="rounded-2xl bg-sky-500 px-5 py-3 text-sm font-black text-white transition hover:bg-sky-400"
                >
                  إدارة المستخدم
                </Link>

                <button
                  type="button"
                  disabled={processingId === selectedUser.id}
                  onClick={() => runAction("logout-user", selectedUser)}
                  className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-black text-white ring-1 ring-white/10 transition hover:bg-white/15 disabled:opacity-60"
                >
                  تسجيل خروجه
                </button>

                {selectedUser.isActive ? (
                  <button
                    type="button"
                    disabled={processingId === selectedUser.id}
                    onClick={() => runAction("disable-user", selectedUser)}
                    className="rounded-2xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-300 disabled:opacity-60"
                  >
                    إيقاف الحساب
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={processingId === selectedUser.id}
                    onClick={() => runAction("activate-user", selectedUser)}
                    className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
                  >
                    تفعيل الحساب
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard title="المستخدمون" value={stats?.totalUsers || 0} icon={<Users />} />
        <StatCard title="الموجهون" value={stats?.counselors || 0} icon={<UserRound />} tone="sky" />
        <StatCard title="النشطون" value={stats?.activeUsers || 0} icon={<CheckCircle2 />} tone="emerald" />
        <StatCard title="المشتركون" value={stats?.subscribedUsers || 0} icon={<Crown />} tone="violet" />
        <StatCard title="بدون اشتراك" value={stats?.withoutSubscription || 0} icon={<AlertTriangle />} tone="amber" />
        <StatCard title="تحتاج متابعة" value={stats?.needsAttention || 0} icon={<Activity />} tone="rose" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-4">
          <section className="rounded-[1.7rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_160px_180px]">
              <div className="relative">
                <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="ابحث بالاسم، الإيميل، المدرسة، الجوال، الباقة..."
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-12 text-sm font-bold outline-none focus:border-sky-200 focus:ring-4 focus:ring-sky-50"
                />
              </div>

              <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black outline-none focus:border-sky-200 focus:ring-4 focus:ring-sky-50"
              >
                <option value="ALL">كل الأدوار</option>
                <option value="COUNSELOR">الموجهون</option>
                <option value="ADMIN">الأدمن</option>
                <option value="SCHOOL_OWNER">ملاك الحسابات</option>
                <option value="STAFF">الموظفون</option>
              </select>

              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as UserStatusFilter)}
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black outline-none focus:border-sky-200 focus:ring-4 focus:ring-sky-50"
              >
                <option value="ALL">كل الحالات</option>
                <option value="NEEDS_ATTENTION">تحتاج متابعة</option>
                <option value="ACTIVE">نشط</option>
                <option value="DISABLED">موقوف</option>
                <option value="SUBSCRIBED">مشترك</option>
                <option value="NO_SUBSCRIPTION">بدون اشتراك</option>
                <option value="PENDING_PAYMENT">دفع معلق</option>
              </select>
            </div>
          </section>

          <section className="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  المستخدمون
                </h2>
                <p className="mt-1 text-[12px] font-bold text-slate-400">
                  النتائج: {filteredUsers.length}
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

            <div className="divide-y divide-slate-100">
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => setSelectedUser(user)}
                  className={[
                    "grid w-full gap-3 p-4 text-right transition hover:bg-slate-50 lg:grid-cols-[minmax(0,1fr)_140px_120px_120px]",
                    selectedUser?.id === user.id ? "bg-sky-50 ring-1 ring-sky-200" : "bg-white",
                  ].join(" ")}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-50 text-slate-500">
                      <UserRound className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-black text-slate-950">
                        {user.officialName || user.name || "بدون اسم"}
                      </p>
                      <p className="mt-1 truncate text-xs font-bold text-slate-400">
                        {user.email}
                      </p>
                      <p className="mt-1 truncate text-xs font-bold text-slate-500">
                        {user.schoolName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
                      {roleLabel(user.role)}
                    </span>
                  </div>

                  <div className="flex items-center">
                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-black",
                        user.subscription?.usable
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700",
                      ].join(" ")}
                    >
                      {subscriptionLabel(user.subscription?.computedStatus)}
                    </span>
                  </div>

                  <div className="flex items-center">
                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-black",
                        riskClass(user.riskLevel),
                      ].join(" ")}
                    >
                      {riskLabel(user.riskLevel)}
                    </span>
                  </div>
                </button>
              ))}

              {filteredUsers.length === 0 ? (
                <div className="p-10 text-center text-sm font-bold text-slate-400">
                  لا توجد نتائج مطابقة.
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          {selectedUser ? (
            <>
              <section className="rounded-[1.45rem] border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black text-slate-950">
                      {selectedUser.officialName || selectedUser.name || "مستخدم"}
                    </h2>
                    <p className="mt-1 text-xs font-bold text-slate-400">
                      {selectedUser.email}
                    </p>
                  </div>

                  <span
                    className={[
                      "rounded-full px-3 py-1 text-xs font-black",
                      selectedUser.isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600",
                    ].join(" ")}
                  >
                    {selectedUser.isActive ? "نشط" : "موقوف"}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <InfoBox label="الدور" value={roleLabel(selectedUser.role)} />
                  <InfoBox label="الطلاب" value={String(selectedUser.studentsCount)} />
                  <InfoBox label="الحالات" value={String(selectedUser.casesCount)} />
                  <InfoBox
                    label="آخر دخول"
                    value={
                      selectedUser.lastSeenAt
                        ? new Date(selectedUser.lastSeenAt).toLocaleString("ar-SA")
                        : "لا يوجد"
                    }
                  />
                </div>

                <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-black text-slate-400">الاشتراك</p>
                  <p className="mt-2 text-sm font-black text-slate-950">
                    {selectedUser.subscription?.planName || "بدون باقة"}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {selectedUser.subscription?.endsAt
                      ? `ينتهي: ${new Date(selectedUser.subscription.endsAt).toLocaleDateString("ar-SA")}`
                      : "لا يوجد تاريخ انتهاء"}
                  </p>
                </div>
              </section>

              <section className="rounded-[1.45rem] border border-slate-100 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-black text-slate-950">
                  إجراءات سريعة
                </h3>

                <div className="mt-4 grid gap-2">
                  <Link
                    href={`/dashboard/admin/users/${selectedUser.id}`}
                    className="rounded-2xl bg-blue-600 px-4 py-3 text-center text-sm font-black text-white transition hover:bg-blue-700"
                  >
                    إدارة المستخدم
                  </Link>

                  {selectedUser.isActive ? (
                    <ActionButton
                      icon={<Lock />}
                      label="إيقاف المستخدم"
                      disabled={processingId === selectedUser.id}
                      onClick={() => runAction("disable-user", selectedUser)}
                      tone="warning"
                    />
                  ) : (
                    <ActionButton
                      icon={<CheckCircle2 />}
                      label="تفعيل المستخدم"
                      disabled={processingId === selectedUser.id}
                      onClick={() => runAction("activate-user", selectedUser)}
                      tone="success"
                    />
                  )}

                  <ActionButton
                    icon={<LogOut />}
                    label="تسجيل خروجه من كل الجلسات"
                    disabled={processingId === selectedUser.id}
                    onClick={() => runAction("logout-user", selectedUser)}
                  />

                  <ActionButton
                    icon={<XCircle />}
                    label="إلغاء اشتراكه وإغلاق الخدمات"
                    disabled={processingId === selectedUser.id}
                    onClick={() => runAction("cancel-subscription", selectedUser)}
                    tone="danger"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={processingId === selectedUser.id}
                      onClick={() =>
                        runAction("set-role", selectedUser, {
                          role: "COUNSELOR",
                        })
                      }
                      className="rounded-2xl bg-slate-50 px-3 py-3 text-xs font-black text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                    >
                      جعله موجه
                    </button>

                    <button
                      type="button"
                      disabled={processingId === selectedUser.id}
                      onClick={() =>
                        runAction("set-role", selectedUser, {
                          role: "ADMIN",
                        })
                      }
                      className="rounded-2xl bg-slate-950 px-3 py-3 text-xs font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
                    >
                      جعله أدمن
                    </button>
                  </div>

                  <Link
                    href="/dashboard/admin/subscriptions"
                    className="rounded-2xl bg-sky-600 px-4 py-3 text-center text-sm font-black text-white transition hover:bg-sky-700"
                  >
                    إدارة باقته واشتراكه
                  </Link>
                </div>
              </section>

              <section className="rounded-[1.45rem] border border-slate-100 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-black text-slate-950">
                  سجل العمليات
                </h3>

                <div className="mt-4 space-y-2">
                  {selectedLogs.slice(0, 10).map((log) => (
                    <div
                      key={log.id}
                      className="rounded-2xl bg-slate-50 p-3"
                    >
                      <p className="text-sm font-black text-slate-800">
                        {log.title}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        {new Date(log.createdAt).toLocaleString("ar-SA")} · {log.category}
                      </p>
                    </div>
                  ))}

                  {selectedLogs.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-400">
                      لا يوجد سجل عمليات لهذا المستخدم حتى الآن. سيتم تسجيل العمليات من الآن فصاعدًا.
                    </div>
                  ) : null}
                </div>
              </section>
            </>
          ) : (
            <section className="rounded-[1.45rem] border border-slate-100 bg-white p-5 text-sm font-bold text-slate-400 shadow-sm">
              اختر مستخدمًا من القائمة لعرض التفاصيل.
            </section>
          )}
        </aside>
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

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-[11px] font-black text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-slate-800">{value}</p>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  disabled,
  onClick,
  tone = "default",
}: {
  icon: React.ReactElement;
  label: string;
  disabled?: boolean;
  onClick: () => void;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  const toneClass = {
    default: "bg-slate-50 text-slate-700 hover:bg-slate-100",
    warning: "bg-amber-50 text-amber-700 hover:bg-amber-100",
    danger: "bg-rose-50 text-rose-700 hover:bg-rose-100",
    success: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  }[tone];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={["flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition disabled:opacity-60", toneClass].join(" ")}
    >
      {icon}
      {label}
    </button>
  );
}







