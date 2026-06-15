import { OFFICIAL_WORKSPACE_ROUTES } from "@/lib/workspace/workspace-modules";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  FolderKanban,
  Plus,
  Sparkles,
  UploadCloud,
  Users,
  WalletCards,
} from "lucide-react";

import {
  DashboardAttentionMiniCard,
  type DashboardAttentionMiniReminder,
} from "@/components/dashboard/dashboard-attention-mini-card";

type ActivityLeaderUser = {
  name?: string | null;
  officialName?: string | null;
  jobTitle?: string | null;
  gender?: string | null;
  schoolAccount?: {
    name?: string | null;
    profile?: {
      schoolName?: string | null;
    } | null;
  } | null;
};

type ActivityLeaderStats = {
  students: number;
  upcomingReminders: number;
  evidenceItems: number;
  activityReports: number;
};

type Props = {
  user: ActivityLeaderUser;
  stats: ActivityLeaderStats;
  attentionReminders?: DashboardAttentionMiniReminder[];
};

function formatCount(value: number) {
  return new Intl.NumberFormat("ar-SA").format(value || 0);
}

function getDisplayName(user: ActivityLeaderUser) {
  return user.officialName || user.name || "رائد النشاط";
}

export function ActivityLeaderDashboard({
  user,
  stats,
  attentionReminders = [],
}: Props) {
  const schoolName =
    user.schoolAccount?.profile?.schoolName ||
    user.schoolAccount?.name ||
    "مدرستك";

  return (
    <main className="space-y-6" dir="rtl">
      <section className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <section className="space-y-5">
          <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100">
                    مركز ريادة النشاط
                  </span>

                  <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
                    {schoolName}
                  </span>
                </div>

                <h1 className="mt-4 text-3xl font-black leading-10 text-slate-950">
                  أهلًا بك {getDisplayName(user)}
                </h1>

                <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-500">
                  ابدأ من برامج النشاط، ثم تابع الحالات والشواهد، وبعد اكتمال التنفيذ أصدر التقارير من المحرك الموحد.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 xl:justify-end">
                <HeroButton
                  href="/dashboard/activity-leader/programs/new"
                  icon={<Plus className="h-4 w-4" />}
                  label="برنامج جديد"
                  primary
                />

                <HeroButton
                  href={OFFICIAL_WORKSPACE_ROUTES.cases}
                  icon={<FolderKanban className="h-4 w-4" />}
                  label="مركز الأنشطة"
                />

                <HeroButton
                  href={OFFICIAL_WORKSPACE_ROUTES.reports}
                  icon={<FileText className="h-4 w-4" />}
                  label="مركز التقارير"
                />
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <PriorityCard
              icon={<ClipboardList className="h-5 w-5" />}
              label="برامج قيد التجهيز"
              value={formatCount(0)}
              helper="ستظهر هنا البرامج التي لم تكتمل."
              href="/dashboard/activity-leader/programs/new"
            />

            <PriorityCard
              icon={<CalendarDays className="h-5 w-5" />}
              label="مواعيد قريبة"
              value={formatCount(stats.upcomingReminders)}
              helper="فعاليات أو تذكيرات خلال الأيام القادمة."
              href="/dashboard/calendar"
            />

            <PriorityCard
              icon={<Users className="h-5 w-5" />}
              label="الطلاب"
              value={formatCount(stats.students)}
              helper="بيانات الطلاب المتاحة داخل الحساب."
              href="/dashboard/student-comprehensive-reference"
            />
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <p className="text-xs font-black text-sky-700">المطلوب اليوم</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                اختر مجال العمل
              </h2>
              <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
                ابدأ من برامج النشاط، اختر المجال، ثم عبئ بطاقة التنفيذ وارفع الشواهد.
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <ServiceCard
                href="/dashboard/activity-leader/programs/new"
                icon={<ClipboardList className="h-6 w-6" />}
                title="برامج النشاط"
                helper="اختيار المجال ثم تعبئة بطاقة التنفيذ."
              />

              <ServiceCard
                href="/dashboard/activity-leader/plans"
                icon={<FolderKanban className="h-6 w-6" />}
                title="خطط النشاط"
                helper="خطة النشاط المدرسي ومتابعتها."
              />

              <ServiceCard
                href="/dashboard/activity-leader/participations"
                icon={<Users className="h-6 w-6" />}
                title="المشاركات الطلابية"
                helper="توثيق المشاركات والمبادرات."
              />

              <ServiceCard
                href="/dashboard/activity-leader/evidence"
                icon={<UploadCloud className="h-6 w-6" />}
                title="الشواهد والمرفقات"
                helper="حفظ الشواهد وتنظيمها."
              />
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <details>
              <summary className="cursor-pointer text-sm font-black text-slate-700">
                أدوات إضافية
              </summary>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <QuietLink
                  href={OFFICIAL_WORKSPACE_ROUTES.reports}
                  icon={<FileText className="h-5 w-5" />}
                  title="التقارير"
                />

                <QuietLink
                  href="/dashboard/calendar"
                  icon={<CalendarDays className="h-5 w-5" />}
                  title="التقويم والتنبيهات"
                />

                <QuietLink
                  href="/dashboard/plans"
                  icon={<WalletCards className="h-5 w-5" />}
                  title="الباقات"
                />

                <QuietLink
                  href="/dashboard/settings/school"
                  icon={<Sparkles className="h-5 w-5" />}
                  title="إعدادات المدرسة"
                />
              </div>
            </details>
          </section>
        </section>

        <aside className="space-y-5">
          <section className="rounded-[2rem] bg-gradient-to-br from-sky-700 to-cyan-500 p-6 text-white shadow-lg">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white">
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <h2 className="mt-5 text-2xl font-black">نشاطك اليوم</h2>

            <p className="mt-3 text-sm font-bold leading-7 text-sky-50">
              ابدأ بتجهيز البرنامج، ثم تابع الحالة والشواهد، وبعد اكتمال التنفيذ أصدر التقرير من مركز التقارير.
            </p>

            <div className="mt-5 rounded-2xl bg-white/15 p-4">
              <div className="flex items-center justify-between text-xs font-black text-white">
                <span>الشواهد المسجلة</span>
                <span>{formatCount(stats.evidenceItems)}</span>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white"
                  style={{
                    width: `${Math.min(stats.evidenceItems * 20, 100)}%`,
                  }}
                />
              </div>
            </div>

            <Link
              href={OFFICIAL_WORKSPACE_ROUTES.cases}
              className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-black text-sky-800 transition hover:bg-sky-50"
            >
              فتح مركز الأنشطة
            </Link>
          </section>

          <DashboardAttentionMiniCard reminders={attentionReminders} />
        </aside>
      </section>
    </main>
  );
}

function HeroButton({
  href,
  icon,
  label,
  primary,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black transition",
        primary
          ? "bg-sky-700 text-white hover:bg-sky-800"
          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
      ].join(" ")}
    >
      {icon}
      {label}
    </Link>
  );
}

function PriorityCard({
  icon,
  label,
  value,
  helper,
  href,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
          <p className="mt-2 text-xs font-bold leading-6 text-slate-500">
            {helper}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
          {icon}
        </div>
      </div>
    </Link>
  );
}

function ServiceCard({
  href,
  icon,
  title,
  helper,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  helper: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-5 transition hover:border-sky-200 hover:bg-white hover:shadow-sm"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sky-700 ring-1 ring-slate-100">
        {icon}
      </div>

      <h3 className="mt-4 text-lg font-black leading-8 text-slate-950">
        {title}
      </h3>

      <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
        {helper}
      </p>
    </Link>
  );
}

function QuietLink({
  href,
  icon,
  title,
}: {
  href: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 transition hover:bg-white hover:ring-sky-100"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-700 ring-1 ring-slate-100">
        {icon}
      </div>

      <span className="text-sm font-black text-slate-800">{title}</span>
    </Link>
  );
}