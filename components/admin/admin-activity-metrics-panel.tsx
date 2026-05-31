"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UploadCloud,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";

type DailyMetric = {
  date: string;
  cases: number;
  reports: number;
  evidences: number;
  subscriptions: number;
  logins: number;
  total: number;
};

type ActivityMetrics = {
  rangeDays: number;
  totalEvents: number;
  activeUsers: number;
  cases: {
    drafts: number;
    submitted: number;
    previousSubmitted: number;
  };
  reports: {
    created: number;
    exported: number;
    previousCreated: number;
  };
  evidences: {
    uploaded: number;
    previousUploaded: number;
  };
  subscriptions: {
    planOrders: number;
    activationCodes: number;
    bankTransfers: number;
    approvedTransfers: number;
    rejectedTransfers: number;
  };
  byCategory: Array<{
    category: string;
    count: number;
  }>;
  byAction: Array<{
    action: string;
    count: number;
  }>;
  byService: Array<{
    serviceSlug: string;
    count: number;
  }>;
  topUsers: Array<{
    userId: string;
    count: number;
    name: string;
    email: string;
    role: string;
  }>;
  daily: DailyMetric[];
};

function percentageChange(current: number, previous: number) {
  if (previous <= 0 && current > 0) return 100;
  if (previous <= 0 && current <= 0) return 0;

  return Math.round(((current - previous) / previous) * 100);
}

function serviceLabel(slug: string) {
  const labels: Record<string, string> = {
    "student-follow-up": "متابعة الطلاب",
    "family-school-communication": "التواصل الأسري",
    "committees-meetings": "اللجان والاجتماعات",
    "guidance-programs": "البرامج الإرشادية",
    "results-analysis": "تحليل النتائج",
    "student-guidance-services": "الخدمات الإرشادية",
    "comprehensive-reference": "المرجع الشامل",
  };

  return labels[slug] || slug;
}

function actionLabel(action: string) {
  const labels: Record<string, string> = {
    "case-draft-saved": "حفظ مسودة حالة",
    "case-submitted": "إرسال حالة",
    "evidence-uploaded": "رفع شاهد",
    "report-created": "إنشاء تقرير",
    "report-exported": "تصدير تقرير",
    "plan-order-created": "طلب باقة",
    "bank-transfer-requested": "طلب تحويل",
    "bank-transfer-approved": "قبول تحويل",
    "bank-transfer-rejected": "رفض تحويل",
    "redeem-activation-code": "استخدام كود تفعيل",
    logout: "تسجيل خروج",
  };

  return labels[action] || action;
}

export function AdminActivityMetricsPanel() {
  const [metrics, setMetrics] = useState<ActivityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadMetrics() {
    setLoading(true);
    setErrorMessage(null);

    const response = await fetch("/api/dashboard/admin/activity/metrics", {
      cache: "no-store",
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      setErrorMessage(result?.error || "تعذر تحميل مؤشرات النشاط.");
      setLoading(false);
      return;
    }

    setMetrics(result);
    setLoading(false);
  }

  useEffect(() => {
    loadMetrics();
  }, []);

  const latestDaily = useMemo(() => {
    return (metrics?.daily || []).slice(-14);
  }, [metrics?.daily]);

  if (loading) {
    return (
      <section className="rounded-[1.6rem] border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3 text-sm font-black text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
          جار تحميل مؤشرات النشاط...
        </div>
      </section>
    );
  }

  if (errorMessage || !metrics) {
    return (
      <section className="rounded-[1.6rem] border border-amber-100 bg-amber-50 p-5 shadow-sm">
        <div className="flex items-center gap-3 text-sm font-black text-amber-700">
          <AlertTriangle className="h-5 w-5" />
          {errorMessage || "لا توجد مؤشرات متاحة حاليًا."}
        </div>
      </section>
    );
  }

  const caseGrowth = percentageChange(
    metrics.cases.submitted,
    metrics.cases.previousSubmitted
  );

  const reportGrowth = percentageChange(
    metrics.reports.created,
    metrics.reports.previousCreated
  );

  const evidenceGrowth = percentageChange(
    metrics.evidences.uploaded,
    metrics.evidences.previousUploaded
  );

  const subscriptionTotal =
    metrics.subscriptions.planOrders +
    metrics.subscriptions.activationCodes +
    metrics.subscriptions.bankTransfers +
    metrics.subscriptions.approvedTransfers +
    metrics.subscriptions.rejectedTransfers;

  return (
    <section className="space-y-4" dir="rtl">
      <div className="relative overflow-hidden rounded-[1.7rem] border border-sky-100 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 p-5 text-white shadow-sm">
        <div className="absolute -left-20 -top-20 h-60 w-60 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="absolute -bottom-20 right-20 h-52 w-52 rounded-full bg-indigo-400/20 blur-3xl" />

        <div className="relative z-10 flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-black text-sky-100 ring-1 ring-white/10">
              <Activity className="h-4 w-4" />
              Activity Intelligence
            </div>

            <h2 className="mt-3 text-2xl font-black">
              نبض المنصة آخر {metrics.rangeDays} يوم
            </h2>

            <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-300">
              مؤشرات مختصرة مبنية من سجل العمليات، جاهزة لاحقًا للتنبيهات
              الذكية وتحليل أداء الموجهين والخدمات.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadMetrics}
              className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-xs font-black text-white ring-1 ring-white/10 transition hover:bg-white/15"
            >
              <RefreshCw className="h-4 w-4" />
              تحديث
            </button>

            <Link
              href="/dashboard/admin/activity"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-black text-slate-950 transition hover:bg-slate-100"
            >
              سجل العمليات
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="relative z-10 mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <HeroMetric
            title="إجمالي الأحداث"
            value={metrics.totalEvents}
            icon={<Activity />}
          />
          <HeroMetric
            title="مستخدمون نشطون"
            value={metrics.activeUsers}
            icon={<Users />}
          />
          <HeroMetric
            title="حالات مرسلة"
            value={metrics.cases.submitted}
            icon={<ShieldCheck />}
            hint={`${caseGrowth >= 0 ? "+" : ""}${caseGrowth}%`}
          />
          <HeroMetric
            title="تقارير منشأة"
            value={metrics.reports.created}
            icon={<FileText />}
            hint={`${reportGrowth >= 0 ? "+" : ""}${reportGrowth}%`}
          />
          <HeroMetric
            title="شواهد مرفوعة"
            value={metrics.evidences.uploaded}
            icon={<UploadCloud />}
            hint={`${evidenceGrowth >= 0 ? "+" : ""}${evidenceGrowth}%`}
          />
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-4">
        <MiniTrendCard
          title="الحالات"
          description="مسودات وإرسال"
          icon={<ShieldCheck />}
          value={metrics.cases.submitted}
          subValue={`المسودات: ${metrics.cases.drafts}`}
          daily={latestDaily}
          metricKey="cases"
          footer={`${caseGrowth >= 0 ? "+" : ""}${caseGrowth}% عن الفترة السابقة`}
        />

        <MiniTrendCard
          title="التقارير"
          description="إنشاء وتصدير"
          icon={<FileText />}
          value={metrics.reports.created}
          subValue={`التصدير: ${metrics.reports.exported}`}
          daily={latestDaily}
          metricKey="reports"
          footer={`${reportGrowth >= 0 ? "+" : ""}${reportGrowth}% عن الفترة السابقة`}
        />

        <MiniTrendCard
          title="الشواهد"
          description="رفع ملفات وصور"
          icon={<UploadCloud />}
          value={metrics.evidences.uploaded}
          subValue="مرتبطة بالحالات والتقارير"
          daily={latestDaily}
          metricKey="evidences"
          footer={`${evidenceGrowth >= 0 ? "+" : ""}${evidenceGrowth}% عن الفترة السابقة`}
        />

        <MiniTrendCard
          title="الاشتراكات"
          description="طلبات وتفعيل ودفع"
          icon={<WalletCards />}
          value={subscriptionTotal}
          subValue={`طلبات باقات: ${metrics.subscriptions.planOrders}`}
          daily={latestDaily}
          metricKey="subscriptions"
          footer={`تحويلات: ${metrics.subscriptions.bankTransfers}`}
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="rounded-[1.45rem] border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-950">
                أكثر الخدمات والعمليات
              </h3>
              <p className="mt-1 text-xs font-bold text-slate-400">
                عرض مختصر بدون تشارت كبير
              </p>
            </div>

            <BarChart3 className="h-5 w-5 text-slate-300" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <CompactInsightList
              title="الخدمات استخدامًا"
              emptyText="لا توجد بيانات خدمات بعد."
              items={metrics.byService.slice(0, 5).map((item) => ({
                label: serviceLabel(item.serviceSlug),
                value: item.count,
              }))}
            />

            <CompactInsightList
              title="العمليات تكرارًا"
              emptyText="لا توجد عمليات كافية بعد."
              items={metrics.byAction.slice(0, 5).map((item) => ({
                label: actionLabel(item.action),
                value: item.count,
              }))}
            />
          </div>
        </section>

        <section className="rounded-[1.45rem] border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-950">
                أكثر الموجهين نشاطًا
              </h3>
              <p className="mt-1 text-xs font-bold text-slate-400">
                حسب سجل العمليات
              </p>
            </div>

            <UserRound className="h-5 w-5 text-slate-300" />
          </div>

          <div className="space-y-2">
            {metrics.topUsers.length ? (
              metrics.topUsers.slice(0, 5).map((user, index) => (
                <div
                  key={user.userId}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-white text-xs font-black text-slate-600 shadow-sm">
                      {index + 1}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-900">
                        {user.name}
                      </p>
                      <p className="truncate text-[11px] font-bold text-slate-400">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
                    {user.count}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-400">
                لا توجد بيانات مستخدمين نشطين بعد.
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        <QuickLink
          href="/dashboard/admin/activity"
          title="سجل العمليات"
          description="تفاصيل كاملة لكل حدث داخل المنصة"
          icon={<Activity />}
        />
        <QuickLink
          href="/dashboard/admin/users"
          title="المستخدمين"
          description="إدارة الموجهين والجلسات والصلاحيات"
          icon={<Users />}
        />
        <QuickLink
          href="/dashboard/admin/subscribers"
          title="المشتركين"
          description="الحسابات، الباقات، التفعيل، والمدفوعات"
          icon={<WalletCards />}
        />
      </section>
    </section>
  );
}

function HeroMetric({
  title,
  value,
  icon,
  hint,
}: {
  title: string;
  value: number;
  icon: React.ReactElement;
  hint?: string;
}) {
  return (
    <article className="rounded-[1.3rem] bg-white/10 p-4 ring-1 ring-white/10">
      <div className="flex items-center justify-between gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-sky-100">
          {icon}
        </div>

        {hint ? (
          <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-black text-emerald-100">
            {hint}
          </span>
        ) : null}
      </div>

      <p className="mt-4 text-3xl font-black">{value}</p>
      <p className="mt-1 text-[12px] font-black text-slate-300">{title}</p>
    </article>
  );
}

function MiniTrendCard({
  title,
  description,
  icon,
  value,
  subValue,
  daily,
  metricKey,
  footer,
}: {
  title: string;
  description: string;
  icon: React.ReactElement;
  value: number;
  subValue: string;
  daily: DailyMetric[];
  metricKey: keyof Pick<
    DailyMetric,
    "cases" | "reports" | "evidences" | "subscriptions"
  >;
  footer: string;
}) {
  const values = daily.map((item) => item[metricKey]);
  const maxValue = Math.max(...values, 1);

  return (
    <article className="rounded-[1.45rem] border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-black text-slate-400">{description}</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">{title}</h3>
        </div>

        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-50 text-sky-600">
          {icon}
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-3xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-[11px] font-bold text-slate-400">{subValue}</p>
        </div>

        <TinyBars values={values} maxValue={maxValue} />
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 px-3 py-2 text-[11px] font-black text-slate-500">
        {footer}
      </div>
    </article>
  );
}

function TinyBars({
  values,
  maxValue,
}: {
  values: number[];
  maxValue: number;
}) {
  const visibleValues = values.length ? values : [0, 0, 0, 0, 0, 0, 0];

  return (
    <div className="flex h-16 w-28 items-end gap-1 rounded-2xl bg-slate-50 px-2 py-2">
      {visibleValues.slice(-10).map((value, index) => {
        const height = Math.max(6, Math.round((value / maxValue) * 48));

        return (
          <div
            key={`${value}-${index}`}
            className="flex-1 rounded-t-full bg-sky-500/80"
            style={{
              height,
            }}
            title={`${value}`}
          />
        );
      })}
    </div>
  );
}

function CompactInsightList({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: Array<{
    label: string;
    value: number;
  }>;
  emptyText: string;
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="rounded-3xl bg-slate-50 p-4">
      <h4 className="text-sm font-black text-slate-900">{title}</h4>

      <div className="mt-3 space-y-3">
        {items.length ? (
          items.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between gap-3">
                <span className="truncate text-xs font-black text-slate-600">
                  {item.label}
                </span>
                <span className="text-xs font-black text-slate-400">
                  {item.value}
                </span>
              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-sky-500"
                  style={{
                    width: `${Math.max(7, (item.value / maxValue) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl bg-white p-4 text-sm font-bold text-slate-400">
            {emptyText}
          </div>
        )}
      </div>
    </div>
  );
}

function QuickLink({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactElement;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[1.35rem] border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-100 hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-50 text-sky-600">
          {icon}
        </div>

        <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-sky-600" />
      </div>

      <h3 className="mt-4 text-base font-black text-slate-950">{title}</h3>
      <p className="mt-1 text-xs font-bold leading-6 text-slate-400">
        {description}
      </p>
    </Link>
  );
}
