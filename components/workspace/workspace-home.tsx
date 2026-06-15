import Link from "next/link";
import type { ReactNode } from "react";
import {
  BarChart3,
  Bell,
  ClipboardList,
  FileText,
  FolderKanban,
  GraduationCap,
  TrendingUp,
  UploadCloud,
  UserCheck,
  Users,
} from "lucide-react";

import type {
  WorkspaceModule,
  WorkspaceModuleIcon,
} from "@/lib/workspace/workspace-modules";

type WorkspaceStat = {
  label: string;
  value: string;
  helper: string;
  icon: "progress" | "students" | "reports" | "alerts";
  href?: string;
};

type WorkspaceHomeProps = {
  eyebrow: string;
  title: string;
  description: string;
  userName?: string | null;
  modules: WorkspaceModule[];
  stats?: WorkspaceStat[];
};

const iconByName: Record<WorkspaceModuleIcon, typeof ClipboardList> = {
  workflow: ClipboardList,
  assignments: ClipboardList,
  evidence: UploadCloud,
  surveys: UserCheck,
  reports: FileText,
  students: GraduationCap,
  assessment: BarChart3,
  portfolio: FolderKanban,
};

const statIconByName: Record<WorkspaceStat["icon"], typeof TrendingUp> = {
  progress: TrendingUp,
  students: Users,
  reports: FileText,
  alerts: Bell,
};

function getDisplayName(userName?: string | null) {
  return userName || "المعلم";
}

export function WorkspaceHome({
  eyebrow,
  title,
  description,
  userName,
  modules,
  stats = [],
}: WorkspaceHomeProps) {
  return (
    <main className="space-y-6" dir="rtl">
      <section className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <section className="space-y-5">
          <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100">
                    {eyebrow}
                  </span>

                  <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
                    مساحة عمل موحدة
                  </span>
                </div>

                <h1 className="mt-4 text-3xl font-black leading-10 text-slate-950">
                  أهلًا بك {getDisplayName(userName)}
                </h1>

                <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-500">
                  {description}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 xl:justify-end">
                <HeroButton
                  href="/dashboard/teacher/family-community"
                  icon={<ClipboardList className="h-4 w-4" />}
                  label="خدمة جديدة"
                  primary
                />

                <HeroButton
                  href="/dashboard/teacher/portfolio"
                  icon={<FolderKanban className="h-4 w-4" />}
                  label="ملف إنجازي"
                />

                <HeroButton
                  href="/dashboard/report-2"
                  icon={<FileText className="h-4 w-4" />}
                  label="تقاريري"
                />
              </div>
            </div>
          </section>

          {stats.length > 0 ? (
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <StatCard key={stat.label} stat={stat} />
              ))}
            </section>
          ) : null}

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <p className="text-xs font-black text-sky-700">خدمات المعلم</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                اختر الخدمة المطلوبة
              </h2>
              <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
                نفس شكل تجربة الموجه ورائد النشاط، لكن بمحتوى مناسب لدور المعلم.
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {modules.map((module) => {
                const Icon = iconByName[module.icon];
                const isSoon = module.status === "soon";

                const card = (
                  <article
                    className={[
                      "h-full rounded-[1.5rem] border p-5 shadow-sm transition",
                      isSoon
                        ? "border-slate-100 bg-slate-50 opacity-90"
                        : "border-slate-100 bg-slate-50 hover:border-sky-200 hover:bg-white hover:shadow-sm",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-700 ring-1 ring-slate-100">
                        <Icon className="h-6 w-6" />
                      </div>

                      {isSoon ? (
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500 ring-1 ring-slate-200">
                          قريبًا
                        </span>
                      ) : null}
                    </div>

                    <h3 className="mt-4 text-lg font-black leading-8 text-slate-950">
                      {module.title}
                    </h3>

                    <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
                      {module.description}
                    </p>
                  </article>
                );

                if (isSoon) {
                  return <div key={module.title}>{card}</div>;
                }

                return (
                  <Link key={module.title} href={module.href}>
                    {card}
                  </Link>
                );
              })}
            </div>
          </section>
        </section>

        <aside className="space-y-5">
          <section className="rounded-[2rem] bg-gradient-to-br from-sky-700 to-cyan-500 p-6 text-white shadow-lg">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white">
              <FolderKanban className="h-6 w-6" />
            </div>

            <h2 className="mt-5 text-2xl font-black">{title}</h2>

            <p className="mt-3 text-sm font-bold leading-7 text-sky-50">
              مساحة مختصرة تجمع التكليفات والشواهد والتقارير وملف الإنجاز في تجربة واحدة.
            </p>

            <div className="mt-5 rounded-2xl bg-white/15 p-4">
              <div className="flex items-center justify-between text-xs font-black text-white">
                <span>تقدم ملف الإنجاز</span>
                <span>٦٨٪</span>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
                <div className="h-full w-[68%] rounded-full bg-white" />
              </div>
            </div>

            <Link
              href="/dashboard/teacher/portfolio"
              className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-black text-sky-800 transition hover:bg-sky-50"
            >
              فتح ملف الإنجاز
            </Link>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black text-sky-700">تنبيهات قريبة</p>

            <div className="mt-4 space-y-3">
              <MiniNotice title="تكليف يحتاج متابعة" helper="خدمة الأسرة والمجتمع لم تكتمل بعد." />
              <MiniNotice title="تحديث ملف الإنجاز" helper="أضف شاهدًا جديدًا لرفع نسبة الإنجاز." />
              <MiniNotice title="استبيان متاح" helper="يوجد استبيان يمكن للمعلم المشاركة فيه." />
            </div>
          </section>
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

function StatCard({ stat }: { stat: WorkspaceStat }) {
  const Icon = statIconByName[stat.icon];

  const content = (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-slate-400">{stat.label}</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{stat.value}</p>
          <p className="mt-2 text-xs font-bold leading-6 text-slate-500">
            {stat.helper}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  );

  if (!stat.href) return content;

  return <Link href={stat.href}>{content}</Link>;
}

function MiniNotice({ title, helper }: { title: string; helper: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="text-sm font-black text-slate-800">{title}</p>
      <p className="mt-1 text-xs font-bold leading-6 text-slate-500">{helper}</p>
    </div>
  );
}