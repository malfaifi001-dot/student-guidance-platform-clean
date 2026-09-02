"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";

type DailyMetric = { date: string; total: number };
type RecentActivity = { id: string; title: string; action: string; category: string; createdAt: string };
type ActivityMetrics = {
  rangeDays: number;
  totalEvents: number;
  activeUsers: number;
  activeAccounts: number;
  cases: { drafts: number; submitted: number; previousSubmitted: number };
  reports: { created: number; previousCreated: number };
  paymentStatuses: Array<{ status: string; count: number }>;
  evidences: { uploaded: number; recentUploaded: number; previousUploaded: number };
  subscriptions: { total: number; active: number; trial: number; pastDue: number; expired: number; canceled: number };
  byCategory: Array<{ category: string; count: number }>;
  byAction: Array<{ action: string; count: number }>;
  byService: Array<{ serviceSlug: string; serviceName: string | null; count: number }>;
  topUsers: Array<{ userId: string; count: number; name: string; email: string; role: string }>;
  daily: DailyMetric[];
  recentActivity: RecentActivity[];
};

const categoryLabels: Record<string, string> = {
  CASE: "الحالات",
  REPORT: "التقارير",
  EVIDENCE: "الشواهد",
  SUBSCRIPTION: "الاشتراكات",
  ACTIVATION: "التفعيل",
  PAYMENT: "المدفوعات",
};

function percentageChange(current: number, previous: number) {
  return previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;
}

function growthLabel(value: number | null) {
  return value === null ? "جديد" : `${value >= 0 ? "+" : ""}${value}%`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-SA", { month: "short", day: "numeric" }).format(new Date(value));
}

export function AdminActivityMetricsPanel() {
  const [metrics, setMetrics] = useState<ActivityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadMetrics() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/dashboard/admin/activity/metrics", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "تعذر تحميل مؤشرات الإدارة.");
      setMetrics(payload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر تحميل مؤشرات الإدارة.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadMetrics(); }, []);

  if (loading) {
    return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"><div className="flex items-center gap-3 text-sm font-black text-slate-500"><Loader2 className="h-5 w-5 animate-spin text-sky-600" />جارٍ تحميل مؤشرات الإدارة...</div></section>;
  }

  if (error || !metrics) {
    return <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm font-black text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">{error || "لا توجد مؤشرات متاحة حاليًا."}</section>;
  }

  const caseGrowth = percentageChange(metrics.cases.submitted, metrics.cases.previousSubmitted);
  const reportGrowth = percentageChange(metrics.reports.created, metrics.reports.previousCreated);
  const evidenceGrowth = percentageChange(metrics.evidences.uploaded, metrics.evidences.previousUploaded);
  const mostUsedService = metrics.byService[0];
  const latestActivity = metrics.recentActivity?.[0];

  const kpis = [
    { label: "الحالات", value: metrics.cases.submitted, trend: caseGrowth, href: "/dashboard/admin/insights/cases", icon: <ShieldCheck className="h-5 w-5" /> },
    { label: "التقارير", value: metrics.reports.created, trend: reportGrowth, href: "/dashboard/admin/insights/reports", icon: <FileText className="h-5 w-5" /> },
    { label: "الشواهد", value: metrics.evidences.uploaded, trend: evidenceGrowth, href: "/dashboard/admin/insights/evidence", icon: <UploadCloud className="h-5 w-5" /> },
    { label: "المستخدمون النشطون", value: metrics.activeUsers, trend: null, href: "/dashboard/admin/insights/users", icon: <Users className="h-5 w-5" /> },
    { label: "الاشتراكات الفعالة", value: metrics.subscriptions.active, trend: null, href: "/dashboard/admin/insights/subscriptions", icon: <WalletCards className="h-5 w-5" /> },
    { label: "المدارس النشطة", value: metrics.activeAccounts, trend: null, href: "/dashboard/admin/insights/accounts", icon: <BarChart3 className="h-5 w-5" /> },
  ];

  return (
    <section className="space-y-5" dir="rtl">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6" aria-label="مؤشرات المنصة الرئيسية">
        {kpis.map((kpi) => (
          <Link key={kpi.href} href={kpi.href} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">{kpi.icon}</span><ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-sky-600" /></div>
            <div className="mt-3 flex items-end justify-between gap-2"><strong className="text-2xl font-black text-slate-950 dark:text-white">{kpi.value}</strong>{kpi.trend !== null ? <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-300">{growthLabel(kpi.trend)}</span> : null}</div>
            <span className="mt-1 block text-xs font-black text-slate-500 dark:text-slate-400">{kpi.label}</span>
          </Link>
        ))}
      </section>

      <section className="rounded-3xl border border-sky-200 bg-gradient-to-l from-slate-950 to-sky-950 p-5 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black text-sky-200">ملخص تشغيلي سريع</p><h2 className="mt-1 text-2xl font-black">نبض المنصة</h2></div><button type="button" onClick={() => void loadMetrics()} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-white ring-1 ring-white/10 hover:bg-white/15"><RefreshCw className="h-4 w-4" />تحديث</button></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <PulseItem label={`نشاط آخر ${metrics.rangeDays} يوم`} value={`${metrics.totalEvents} حدث`} />
          <PulseItem label="أكثر خدمة استخدامًا" value={mostUsedService ? `${mostUsedService.serviceName || "خدمة غير مسماة"} · ${mostUsedService.count}` : "لا توجد بيانات"} />
          <PulseItem label="أهم إشارة حديثة" value={latestActivity?.title || "لا توجد إشارة تحتاج انتباهًا"} />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <BreakdownCard title="الحالات" description="توزيع الحالات حسب الحالة الحالية" icon={<ShieldCheck className="h-5 w-5" />} rows={[{ label: "مرسلة", value: metrics.cases.submitted, color: "bg-sky-500" }, { label: "مسودات", value: metrics.cases.drafts, color: "bg-sky-200" }]} href="/dashboard/admin/insights/cases" />
        <BreakdownCard title="التقارير" description="التقارير النهائية خلال الفترة" icon={<FileText className="h-5 w-5" />} rows={[{ label: "منشأة", value: metrics.reports.created, color: "bg-indigo-500" }]} href="/dashboard/admin/insights/reports" />
        <BreakdownCard title="الاشتراكات" description="التوزيع الحالي للحالات" icon={<WalletCards className="h-5 w-5" />} rows={[{ label: "نشطة", value: metrics.subscriptions.active, color: "bg-emerald-500" }, { label: "تجريبية", value: metrics.subscriptions.trial, color: "bg-violet-400" }, { label: "متأخرة", value: metrics.subscriptions.pastDue, color: "bg-amber-400" }, { label: "منتهية أو ملغاة", value: metrics.subscriptions.expired + metrics.subscriptions.canceled, color: "bg-slate-400" }]} href="/dashboard/admin/insights/subscriptions" />
      </section>

      <PaymentStatusCard rows={metrics.paymentStatuses} />

      <section className="grid gap-4 xl:grid-cols-2">
        <RankingCard title="أكثر الخدمات استخدامًا" icon={<BarChart3 className="h-5 w-5" />} href="/dashboard/admin/insights/cases" rows={metrics.byService.slice(0, 5).map((item) => ({ label: item.serviceName || "خدمة غير مسماة", value: item.count }))} />
        <RankingCard title="أكثر المستخدمين نشاطًا" icon={<UserRound className="h-5 w-5" />} href="/dashboard/admin/insights/users" rows={metrics.topUsers.slice(0, 5).map((item) => ({ label: item.name, detail: item.email, value: item.count }))} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-black text-slate-950 dark:text-white">النشاط المهم الأخير</h2><p className="mt-1 text-xs font-bold text-slate-400">أحداث الأعمال الحديثة فقط، دون ضوضاء التصفح.</p></div><Activity className="h-5 w-5 text-sky-600" /></div><div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">{metrics.recentActivity?.length ? metrics.recentActivity.slice(0, 5).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-black text-slate-800 dark:text-slate-100">{item.title}</p><p className="mt-1 text-[11px] font-bold text-slate-400">{categoryLabels[item.category] || item.category} · {formatDate(item.createdAt)}</p></div><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /></div>) : <p className="py-6 text-center text-sm font-bold text-slate-400">لا توجد أنشطة مهمة حديثة.</p>}</div></section>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"><h2 className="text-lg font-black text-slate-950 dark:text-white">إيقاع النشاط اليومي</h2><div className="mt-4 space-y-3">{metrics.daily.slice(-7).map((item) => <div key={item.date} className="flex items-center gap-3"><span className="w-16 shrink-0 text-[11px] font-bold text-slate-400">{formatDate(item.date)}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.max(5, Math.min(100, (item.total / Math.max(...metrics.daily.map((day) => day.total), 1)) * 100))}%` }} /></div><span className="w-8 text-left text-xs font-black text-slate-500 dark:text-slate-400">{item.total}</span></div>)}</div></section>
      </section>

      <section><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-black text-slate-950 dark:text-white">روابط إدارية سريعة</h2><span className="text-xs font-bold text-slate-400">إدارة المنصة</span></div><div className="grid gap-3 md:grid-cols-3"><QuickLink href="/dashboard/admin/activity" title="سجل العمليات" description="مراجعة النشاط الكامل في المنصة" icon={<Activity className="h-5 w-5" />} /><QuickLink href="/dashboard/admin/users" title="المستخدمون" description="إدارة المستخدمين والصلاحيات" icon={<Users className="h-5 w-5" />} /><QuickLink href="/dashboard/admin/subscribers" title="المشتركون" description="الحسابات والباقات والتفعيل" icon={<WalletCards className="h-5 w-5" />} /></div></section>
    </section>
  );
}

function PulseItem({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10"><p className="text-[11px] font-bold text-sky-100">{label}</p><p className="mt-2 truncate text-sm font-black text-white">{value}</p></div>; }

function BreakdownCard({ title, description, icon, rows, href }: { title: string; description: string; icon: React.ReactNode; rows: Array<{ label: string; value: number; color: string }>; href: string }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  return <Link href={href} className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-slate-400">{description}</p><h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">{title}</h3></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">{icon}</span></div><div className="mt-5 space-y-3">{rows.map((row) => <div key={row.label}><div className="mb-1 flex items-center justify-between gap-3"><span className="text-xs font-black text-slate-600 dark:text-slate-300">{row.label}</span><span className="text-xs font-black text-slate-500">{row.value} · {total ? Math.round((row.value / total) * 100) : 0}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-full rounded-full ${row.color}`} style={{ width: `${total ? Math.max(4, (row.value / total) * 100) : 0}%` }} /></div></div>)}</div></Link>;
}

function RankingCard({ title, icon, href, rows }: { title: string; icon: React.ReactNode; href: string; rows: Array<{ label: string; detail?: string; value: number }> }) { return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="text-sky-600">{icon}</span><h2 className="text-lg font-black text-slate-950 dark:text-white">{title}</h2></div><Link href={href} className="text-xs font-black text-sky-700 hover:text-sky-900 dark:text-sky-300">عرض التفاصيل</Link></div><div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">{rows.length ? rows.map((row, index) => <div key={`${row.label}-${index}`} className="flex items-center justify-between gap-3 py-3"><div className="flex min-w-0 items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-50 text-xs font-black text-slate-500 dark:bg-slate-900">{index + 1}</span><div className="min-w-0"><p className="truncate text-sm font-black text-slate-800 dark:text-slate-100">{row.label}</p>{row.detail ? <p className="truncate text-[11px] font-bold text-slate-400">{row.detail}</p> : null}</div></div><span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 dark:bg-sky-950/50 dark:text-sky-200">{row.value}</span></div>) : <p className="py-6 text-center text-sm font-bold text-slate-400">لا توجد بيانات كافية.</p>}</div></section>; }

function QuickLink({ href, title, description, icon }: { href: string; title: string; description: string; icon: React.ReactNode }) { return <Link href={href} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950"><div className="flex items-center justify-between gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">{icon}</span><ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-sky-600" /></div><h3 className="mt-3 text-sm font-black text-slate-900 dark:text-white">{title}</h3><p className="mt-1 text-xs font-bold text-slate-400">{description}</p></Link>; }

const paymentStatusLabels: Record<string, string> = {
  PAID: "مكتملة",
  PENDING: "معلّقة",
  FAILED: "فاشلة",
  REFUNDED: "مستردة",
  CANCELED: "ملغاة",
};

const paymentStatusColors: Record<string, string> = {
  PAID: "bg-emerald-500",
  PENDING: "bg-amber-400",
  FAILED: "bg-rose-500",
  REFUNDED: "bg-indigo-500",
  CANCELED: "bg-slate-400",
};

function PaymentStatusCard({ rows }: { rows: Array<{ status: string; count: number }> }) {
  const orderedStatuses = ["PAID", "PENDING", "FAILED", "REFUNDED", "CANCELED"];
  const sortedRows = [...rows].sort((a, b) => {
    const aIndex = orderedStatuses.indexOf(a.status);
    const bIndex = orderedStatuses.indexOf(b.status);
    return (aIndex < 0 ? orderedStatuses.length : aIndex) - (bIndex < 0 ? orderedStatuses.length : bIndex);
  });
  const total = sortedRows.reduce((sum, row) => sum + row.count, 0);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950" dir="rtl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-400">توزيع الحالات المسجلة</p>
          <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">المدفوعات</h2>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300"><WalletCards className="h-5 w-5" /></span>
      </div>
      <p className="mt-4 text-sm font-black text-slate-700 dark:text-slate-200">الإجمالي: {total}</p>
      {sortedRows.length ? (
        <div className="mt-4 space-y-3">
          {sortedRows.map((row) => {
            const percentage = total ? Math.round((row.count / total) * 100) : 0;
            return (
              <div key={row.status}>
                <div className="mb-1 flex items-center justify-between gap-3 text-xs font-black">
                  <span className="text-slate-600 dark:text-slate-300">{paymentStatusLabels[row.status] || "حالة أخرى"}</span>
                  <span className="text-slate-500 dark:text-slate-400">{row.count} · {percentage}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className={`h-full rounded-full ${paymentStatusColors[row.status] || "bg-sky-500"}`} style={{ width: `${percentage}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 text-sm font-bold text-slate-400">لا توجد عمليات دفع مسجلة حاليًا.</p>
      )}
    </section>
  );
}
