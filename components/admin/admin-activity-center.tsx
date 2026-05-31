"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Filter,
  KeyRound,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserRound,
  WalletCards,
  XCircle,
} from "lucide-react";

type ActivityLog = {
  id: string;
  category: string;
  action: string;
  severity: string;
  title: string;
  details: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  actor: null | {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  target: null | {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  school: null | {
    id: string;
    name: string;
    slug: string;
  };
};

type ActivityPayload = {
  stats: {
    total: number;
    today: number;
    success: number;
    warnings: number;
    errors: number;
    security: number;
    subscriptions: number;
    users: number;
  };
  logs: ActivityLog[];
};

function categoryLabel(category: string) {
  const labels: Record<string, string> = {
    AUTH: "الدخول والخروج",
    USER: "المستخدمين",
    SUBSCRIPTION: "الاشتراكات",
    ACTIVATION: "التفعيل",
    PAYMENT: "المدفوعات",
    CASE: "الحالات",
    REPORT: "التقارير",
    EVIDENCE: "الشواهد",
    WORKFLOW: "Workflows",
    SECURITY: "الأمان",
    SYSTEM: "النظام",
  };

  return labels[category] || category;
}

function severityLabel(severity: string) {
  if (severity === "SUCCESS") return "نجاح";
  if (severity === "WARNING") return "تنبيه";
  if (severity === "ERROR") return "خطأ";
  return "معلومة";
}

function severityClass(severity: string) {
  if (severity === "SUCCESS") return "bg-emerald-50 text-emerald-700";
  if (severity === "WARNING") return "bg-amber-50 text-amber-700";
  if (severity === "ERROR") return "bg-rose-50 text-rose-700";
  return "bg-sky-50 text-sky-700";
}

function categoryIcon(category: string) {
  if (category === "AUTH" || category === "SECURITY") return ShieldCheck;
  if (category === "USER") return UserRound;
  if (category === "SUBSCRIPTION" || category === "ACTIVATION") return KeyRound;
  if (category === "PAYMENT") return WalletCards;
  if (category === "REPORT") return FileText;
  if (category === "CASE") return Activity;
  if (category === "EVIDENCE") return Eye;
  return Sparkles;
}

export function AdminActivityCenter() {
  const [data, setData] = useState<ActivityPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [severity, setSeverity] = useState("ALL");
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  async function load() {
    setLoading(true);

    const response = await fetch("/api/dashboard/admin/activity");
    const result = await response.json();

    if (response.ok) {
      setData(result);
      setSelectedLog((current) => {
        if (!current) return result.logs?.[0] || null;
        return result.logs.find((log: ActivityLog) => log.id === current.id) || result.logs?.[0] || null;
      });
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const categories = useMemo(() => {
    const unique = new Set((data?.logs || []).map((log) => log.category));
    return Array.from(unique);
  }, [data?.logs]);

  const filteredLogs = useMemo(() => {
    const search = query.trim().toLowerCase();

    return (data?.logs || []).filter((log) => {
      const matchesCategory = category === "ALL" || log.category === category;
      const matchesSeverity = severity === "ALL" || log.severity === severity;

      const text = [
        log.title,
        log.action,
        log.category,
        log.severity,
        log.actor?.name,
        log.actor?.email,
        log.target?.name,
        log.target?.email,
        log.school?.name,
        log.school?.slug,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !search || text.includes(search);

      return matchesCategory && matchesSeverity && matchesSearch;
    });
  }, [category, data?.logs, query, severity]);

  if (loading) {
    return (
      <main className="grid min-h-[50vh] place-items-center">
        <div className="flex items-center gap-3 rounded-3xl border border-slate-100 bg-white px-5 py-4 text-sm font-black text-slate-500 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
          جار تحميل سجل العمليات...
        </div>
      </main>
    );
  }

  const stats = data?.stats;

  return (
    <main className="space-y-5" dir="rtl">
      <section className="relative overflow-hidden rounded-[1.7rem] border border-slate-100 bg-gradient-to-br from-slate-50 via-white to-sky-50 p-5 shadow-sm">
        <div className="absolute -left-16 -top-16 h-52 w-52 rounded-full bg-sky-100/70 blur-3xl" />

        <div className="relative z-10 flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12px] font-black text-slate-700 shadow-sm">
              <Activity className="h-4 w-4" />
              Admin Activity Timeline
            </div>

            <h1 className="mt-3 text-3xl font-black text-slate-950">
              سجل العمليات
            </h1>

            <p className="mt-2 max-w-3xl text-[14px] font-bold leading-7 text-slate-600">
              راقب ما يحدث داخل المنصة: المستخدمين، التفعيل، الاشتراكات،
              الأمان، والتقارير. هذه الصفحة ستكون عين الأدمن على النظام.
            </p>
          </div>

          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" />
            تحديث
          </button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
        <StatCard title="الإجمالي" value={stats?.total || 0} icon={<Activity />} />
        <StatCard title="اليوم" value={stats?.today || 0} icon={<Clock3 />} tone="sky" />
        <StatCard title="نجاح" value={stats?.success || 0} icon={<CheckCircle2 />} tone="emerald" />
        <StatCard title="تنبيهات" value={stats?.warnings || 0} icon={<AlertTriangle />} tone="amber" />
        <StatCard title="أخطاء" value={stats?.errors || 0} icon={<XCircle />} tone="rose" />
        <StatCard title="أمان" value={stats?.security || 0} icon={<ShieldAlert />} tone="slate" />
        <StatCard title="اشتراكات" value={stats?.subscriptions || 0} icon={<WalletCards />} tone="violet" />
        <StatCard title="مستخدمين" value={stats?.users || 0} icon={<UserRound />} tone="sky" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-4">
          <section className="rounded-[1.45rem] border border-slate-100 bg-white p-4 shadow-sm">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px_160px]">
              <div className="relative">
                <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="ابحث في العنوان، المستخدم، الحساب، العملية..."
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-12 text-sm font-bold outline-none focus:border-sky-200 focus:ring-4 focus:ring-sky-50"
                />
              </div>

              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black outline-none focus:border-sky-200 focus:ring-4 focus:ring-sky-50"
              >
                <option value="ALL">كل الأنواع</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {categoryLabel(item)}
                  </option>
                ))}
              </select>

              <select
                value={severity}
                onChange={(event) => setSeverity(event.target.value)}
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black outline-none focus:border-sky-200 focus:ring-4 focus:ring-sky-50"
              >
                <option value="ALL">كل المستويات</option>
                <option value="INFO">معلومة</option>
                <option value="SUCCESS">نجاح</option>
                <option value="WARNING">تنبيه</option>
                <option value="ERROR">خطأ</option>
              </select>
            </div>
          </section>

          <section className="overflow-hidden rounded-[1.45rem] border border-slate-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  العمليات
                </h2>
                <p className="mt-1 text-[12px] font-bold text-slate-400">
                  النتائج: {filteredLogs.length}
                </p>
              </div>

              <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-500">
                <Filter className="h-4 w-4" />
                فلترة مباشرة
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredLogs.map((log) => {
                const Icon = categoryIcon(log.category);

                return (
                  <button
                    key={log.id}
                    type="button"
                    onClick={() => setSelectedLog(log)}
                    className={[
                      "grid w-full gap-3 p-4 text-right transition hover:bg-slate-50 lg:grid-cols-[minmax(0,1fr)_135px_120px]",
                      selectedLog?.id === log.id ? "bg-sky-50/50" : "bg-white",
                    ].join(" ")}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-50 text-slate-500">
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-950">
                          {log.title}
                        </p>

                        <p className="mt-1 truncate text-xs font-bold text-slate-400">
                          {log.actor?.name || "النظام"} ·{" "}
                          {log.school?.name || "بدون حساب"}
                        </p>

                        <p className="mt-1 text-xs font-bold text-slate-400">
                          {new Date(log.createdAt).toLocaleString("ar-SA")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
                        {categoryLabel(log.category)}
                      </span>
                    </div>

                    <div className="flex items-center">
                      <span
                        className={[
                          "rounded-full px-3 py-1 text-xs font-black",
                          severityClass(log.severity),
                        ].join(" ")}
                      >
                        {severityLabel(log.severity)}
                      </span>
                    </div>
                  </button>
                );
              })}

              {filteredLogs.length === 0 ? (
                <div className="p-10 text-center text-sm font-bold text-slate-400">
                  لا توجد عمليات مطابقة للفلاتر الحالية.
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          {selectedLog ? (
            <section className="rounded-[1.45rem] border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-slate-400">
                    تفاصيل العملية
                  </p>
                  <h2 className="mt-2 text-xl font-black text-slate-950">
                    {selectedLog.title}
                  </h2>
                </div>

                <span
                  className={[
                    "rounded-full px-3 py-1 text-xs font-black",
                    severityClass(selectedLog.severity),
                  ].join(" ")}
                >
                  {severityLabel(selectedLog.severity)}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <InfoBox label="النوع" value={categoryLabel(selectedLog.category)} />
                <InfoBox label="الإجراء" value={selectedLog.action} />
                <InfoBox
                  label="الوقت"
                  value={new Date(selectedLog.createdAt).toLocaleString("ar-SA")}
                />
                <InfoBox label="الحساب" value={selectedLog.school?.name || "—"} />
                <InfoBox label="الفاعل" value={selectedLog.actor?.name || "النظام"} />
                <InfoBox label="المستهدف" value={selectedLog.target?.name || "—"} />
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black text-slate-400">
                  تفاصيل تقنية
                </p>

                <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-white p-3 text-left text-[11px] font-bold leading-6 text-slate-600">
                  {JSON.stringify(selectedLog.details || {}, null, 2)}
                </pre>
              </div>

              {selectedLog.userAgent ? (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-black text-slate-400">
                    الجهاز / المتصفح
                  </p>
                  <p className="mt-2 break-words text-xs font-bold leading-6 text-slate-500">
                    {selectedLog.userAgent}
                  </p>
                </div>
              ) : null}
            </section>
          ) : (
            <section className="rounded-[1.45rem] border border-slate-100 bg-white p-5 text-sm font-bold text-slate-400 shadow-sm">
              اختر عملية من القائمة لعرض التفاصيل.
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

        <div
          className={[
            "grid h-11 w-11 place-items-center rounded-2xl",
            toneClass,
          ].join(" ")}
        >
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
      <p className="mt-1 truncate text-sm font-black text-slate-800">
        {value}
      </p>
    </div>
  );
}
