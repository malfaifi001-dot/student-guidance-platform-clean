import type { ReactNode } from "react";
import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardList,
  FileText,
  FolderKanban,
  MessageCircle,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";

import {
  DashboardAttentionMiniCard,
  type DashboardAttentionMiniReminder,
} from "@/components/dashboard/dashboard-attention-mini-card";

type DashboardUser = {
  name?: string | null;
  officialName?: string | null;
  role?: string | null;
};

type DashboardStats = {
  students: number;
  cases: number;
  reports: number;
  evidences: number;
  draftCases: number;
  readyForReport: number;
};

type SoftBlueDashboardProps = {
  user: DashboardUser;
  stats: DashboardStats;
  attentionReminders?: DashboardAttentionMiniReminder[];
};

function formatCount(value: number) {
  return new Intl.NumberFormat("ar-SA").format(value || 0);
}

function getDisplayName(user: DashboardUser) {
  return user.officialName || user.name || "الموجه";
}

export function SoftBlueDashboard({
  user,
  stats,
  attentionReminders = [],
}: SoftBlueDashboardProps) {
  return (
    <main className="space-y-6" dir="rtl">
      <section className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <section className="space-y-5">
          <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100">
                    مركز العمل اليومي
                  </span>

                  <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
                    نسخة مختصرة
                  </span>
                </div>

                <h1 className="mt-4 text-3xl font-black leading-10 text-slate-950">
                  أهلًا بك {getDisplayName(user)}
                </h1>

                <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-500">
                  ابدأ من مركز الحالات: أكمل المسودات، راجع الحالات المرسلة، ثم أصدر التقارير واحفظها.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 xl:justify-end">
                <HeroButton
                  href="/dashboard/student-follow-up/new"
                  icon={<Plus className="h-4 w-4" />}
                  label="بدء متابعة"
                  primary
                />

                <HeroButton
                  href="/dashboard/report"
                  icon={<FileText className="h-4 w-4" />}
                  label="تقرير جديد"
                />

                <HeroButton
                  href="/dashboard/comprehensive-reference"
                  icon={<BookOpen className="h-4 w-4" />}
                  label="فتح المرجع"
                />
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <PriorityCard
              icon={<FolderKanban className="h-5 w-5" />}
              label="حالات تحتاج متابعة"
              value={formatCount(stats.draftCases)}
              helper="ابدأ بالحالات التي لم تكتمل."
              href="/dashboard/cases"
            />

            <PriorityCard
              icon={<FileText className="h-5 w-5" />}
              label="تقارير جاهزة للإصدار"
              value={formatCount(stats.readyForReport)}
              helper="من مركز الحالات تصدر التقرير."
              href="/dashboard/cases"
            />

            <PriorityCard
              icon={<Users className="h-5 w-5" />}
              label="الطلاب"
              value={formatCount(stats.students)}
              helper="افتح المرجع الشامل عند الحاجة."
              href="/dashboard/comprehensive-reference"
            />
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <p className="text-xs font-black text-sky-700">المطلوب اليوم</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                اختر الخدمة المطلوبة
              </h2>
              <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
                أول أربع خدمات حسب ترتيب التصنيف المعتمد.
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <ServiceCard
                href="/dashboard/guidance-programs"
                icon={<ClipboardList className="h-6 w-6" />}
                title="البرامج الإرشادية"
                helper="برامج وخطط إرشادية."
              />

              <ServiceCard
                href="/dashboard/committees-meetings"
                icon={<ShieldCheck className="h-6 w-6" />}
                title="اللجان والاجتماعات"
                helper="محاضر وتوصيات."
              />

              <ServiceCard
                href="/dashboard/student-follow-up"
                icon={<Users className="h-6 w-6" />}
                title="متابعة الطلاب"
                helper="متابعة أو إنشاء حالة."
              />

              <ServiceCard
                href="/dashboard/student-guidance-services"
                icon={<FileText className="h-6 w-6" />}
                title="الخدمات الإرشادية المقدمة للطلاب"
                helper="توثيق الخدمات المقدمة."
              />
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <details>
              <summary className="cursor-pointer text-sm font-black text-slate-700">
                باقي الخدمات
              </summary>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <QuietLink
                  href="/dashboard/report"
                  icon={<FileText className="h-5 w-5" />}
                  title="التقارير"
                />

                <QuietLink
                  href="/dashboard/comprehensive-reference"
                  icon={<BookOpen className="h-5 w-5" />}
                  title="المرجع الشامل للموجه الطلابي"
                />

                <QuietLink
                  href="/dashboard/results-analysis"
                  icon={<BarChart3 className="h-5 w-5" />}
                  title="تحليل النتائج"
                />

                <QuietLink
                  href="/dashboard/family-school-communication"
                  icon={<MessageCircle className="h-5 w-5" />}
                  title="التواصل بين الأسرة والمدرسة"
                />
              </div>
            </details>
          </section>
        </section>

        <aside className="space-y-5">
          <section className="rounded-[2rem] bg-gradient-to-br from-sky-700 to-cyan-500 p-6 text-white shadow-lg">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white">
              <CalendarDays className="h-6 w-6" />
            </div>

            <h2 className="mt-5 text-2xl font-black">رشد معك اليوم</h2>

            <p className="mt-3 text-sm font-bold leading-7 text-sky-50">
              راجع التنبيهات القريبة، ثم ابدأ بالحالات التي تحتاج إجراء.
            </p>

            <div className="mt-5 rounded-2xl bg-white/15 p-4">
              <div className="flex items-center justify-between text-xs font-black text-white">
                <span>اقتراحات قريبة</span>
                <span>{formatCount(attentionReminders.length)}</span>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white"
                  style={{
                    width: `${Math.min(attentionReminders.length * 34, 100)}%`,
                  }}
                />
              </div>
            </div>

            <Link
              href="/dashboard/calendar"
              className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-black text-sky-800 transition hover:bg-sky-50"
            >
              فتح التقويم
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
