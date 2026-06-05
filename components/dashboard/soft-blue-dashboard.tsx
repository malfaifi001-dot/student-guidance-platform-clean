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

type ServiceTone = "blue" | "emerald" | "violet" | "amber";

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
    <main
      className="h-[calc(100dvh-7.4rem)] max-h-[calc(100dvh-7.4rem)] overflow-hidden"
      dir="rtl"
    >
      <section className="grid h-full min-h-0 gap-4 xl:grid-cols-[1fr_300px]">
        <section className="grid min-h-0 grid-rows-[auto_auto_1fr_auto] gap-3">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-3 xl:grid-cols-[1fr_auto] xl:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100">
                    مركز العمل اليومي
                  </span>

                  <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
                    ثابت ومختصر
                  </span>
                </div>

                <h1 className="mt-2 text-3xl font-black leading-10 text-slate-950">
                  أهلًا بك {getDisplayName(user)}
                </h1>

                <p className="mt-0.5 text-sm font-bold text-slate-500">
                  ابدأ بمتابعة، تقرير، أو المرجع الشامل.
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
                  href="/dashboard/reports"
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

          <section className="grid gap-3 md:grid-cols-3">
            <PriorityCard
              icon={<FolderKanban className="h-5 w-5" />}
              label="حالات تحتاج متابعة"
              value={formatCount(stats.draftCases)}
              helper="لم تكتمل بعد."
              href="/dashboard/cases"
            />

            <PriorityCard
              icon={<FileText className="h-5 w-5" />}
              label="تقارير جاهزة"
              value={formatCount(stats.readyForReport)}
              helper="مرسلة بلا تقرير."
              href="/dashboard/cases"
            />

            <PriorityCard
              icon={<Users className="h-5 w-5" />}
              label="الطلاب"
              value={formatCount(stats.students)}
              helper="افتح المرجع."
              href="/dashboard/comprehensive-reference"
            />
          </section>

          <section className="min-h-0 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black text-sky-700">المطلوب اليوم</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  اختر الخدمة المطلوبة
                </h2>
              </div>

              <Link
                href="/dashboard/calendar"
                className="rounded-2xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white transition hover:bg-slate-800"
              >
                التقويم
              </Link>
            </div>

            <div className="mt-4 grid h-[calc(100%-4.25rem)] min-h-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <ServiceCard
                href="/dashboard/guidance-programs"
                icon={<ClipboardList className="h-6 w-6" />}
                title="البرامج الإرشادية"
                helper="برامج وخطط."
                tone="blue"
              />

              <ServiceCard
                href="/dashboard/committees-meetings"
                icon={<ShieldCheck className="h-6 w-6" />}
                title="اللجان والاجتماعات"
                helper="محاضر وتوصيات."
                tone="emerald"
              />

              <ServiceCard
                href="/dashboard/student-follow-up"
                icon={<Users className="h-6 w-6" />}
                title="متابعة الطلاب"
                helper="متابعة حالة."
                tone="violet"
              />

              <ServiceCard
                href="/dashboard/student-guidance-services"
                icon={<FileText className="h-6 w-6" />}
                title="الخدمات الإرشادية"
                helper="خدمة مقدمة."
                tone="amber"
              />
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="ml-2 text-xs font-black text-slate-400">
                باقي الخدمات:
              </span>

              <QuietInlineLink href="/dashboard/reports" title="التقارير" />
              <QuietInlineLink
                href="/dashboard/comprehensive-reference"
                title="المرجع الشامل"
              />
              <QuietInlineLink
                href="/dashboard/results-analysis"
                title="تحليل النتائج"
              />
              <QuietInlineLink
                href="/dashboard/family-school-communication"
                title="التواصل بين الأسرة والمدرسة"
              />
            </div>
          </section>
        </section>

        <aside className="grid min-h-0 grid-rows-[235px_1fr] gap-3">
          <section className="flex h-full flex-col justify-between rounded-[2rem] bg-gradient-to-br from-sky-700 to-cyan-500 p-5 text-white shadow-lg">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-white">
              <CalendarDays className="h-5 w-5" />
            </div>

            <h2 className="mt-3 text-2xl font-black">رشد معك اليوم</h2>

            <p className="mt-2 text-sm font-bold leading-7 text-sky-50">
              راجع القريب ثم ابدأ الإجراء.
            </p>

            <div className="mt-3 rounded-2xl bg-white/15 p-3">
              <div className="flex items-center justify-between text-xs font-black text-white">
                <span>اقتراحات قريبة</span>
                <span>{formatCount(attentionReminders.length)}</span>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white"
                  style={{
                    width: `${Math.min(attentionReminders.length * 34, 100)}%`,
                  }}
                />
              </div>
            </div>
          </section>

          <div className="min-h-0 overflow-hidden">
            <DashboardAttentionMiniCard reminders={attentionReminders} />
          </div>
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
      className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-slate-400">{label}</p>
          <p className="mt-1 text-3xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
            {helper}
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
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
  tone,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  helper: string;
  tone: ServiceTone;
}) {
  const toneClass: Record<ServiceTone, string> = {
    blue: "border-sky-100 bg-sky-50/45 hover:border-sky-200",
    emerald: "border-emerald-100 bg-emerald-50/45 hover:border-emerald-200",
    violet: "border-violet-100 bg-violet-50/45 hover:border-violet-200",
    amber: "border-amber-100 bg-amber-50/45 hover:border-amber-200",
  };

  return (
    <Link
      href={href}
      className={[
        "relative flex min-h-0 flex-col justify-center rounded-[1.5rem] border p-4 transition hover:bg-white hover:shadow-sm",
        toneClass[tone],
      ].join(" ")}
    >
      <div className="absolute left-5 top-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/85 text-sky-700 ring-1 ring-slate-100">{icon}</div>

      <h3 className="mt-8 text-lg font-black leading-8 text-slate-950">
        {title}
      </h3>

      <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
        {helper}
      </p>
    </Link>
  );
}

function QuietInlineLink({
  href,
  title,
}: {
  href: string;
  title: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600 ring-1 ring-slate-100 transition hover:bg-sky-50 hover:text-sky-700"
    >
      {title}
    </Link>
  );
}


