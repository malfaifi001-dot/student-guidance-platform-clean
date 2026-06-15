import Link from "next/link";
import {
  Award,
  CheckCircle2,
  ClipboardList,
  FileText,
  FolderKanban,
  GraduationCap,
  UploadCloud,
} from "lucide-react";

type PortfolioSection = {
  title: string;
  description: string;
  href: string;
  value: string;
  icon: "assignments" | "evidence" | "reports" | "certificates";
};

type WorkspacePortfolioPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  ownerName?: string | null;
  completionPercent: number;
  sections: PortfolioSection[];
  backHref: string;
  backLabel: string;
};

const iconByName = {
  assignments: ClipboardList,
  evidence: UploadCloud,
  reports: FileText,
  certificates: Award,
};

function normalizePercent(value: number) {
  return Math.max(0, Math.min(value || 0, 100));
}

export function WorkspacePortfolioPage({
  eyebrow,
  title,
  description,
  ownerName,
  completionPercent,
  sections,
  backHref,
  backLabel,
}: WorkspacePortfolioPageProps) {
  const progress = normalizePercent(completionPercent);

  return (
    <main className="space-y-6" dir="rtl">
      <section className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <section className="space-y-5">
          <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100">
                {eyebrow}
              </span>

              <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
                ملف إنجاز
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-black leading-10 text-slate-950">
              {title}
            </h1>

            <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-slate-500">
              {description}
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.5rem] bg-slate-50 p-5 ring-1 ring-slate-100">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sky-700 ring-1 ring-slate-100">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <p className="mt-4 text-xs font-black text-slate-400">صاحب الملف</p>
                <p className="mt-2 text-lg font-black text-slate-950">
                  {ownerName || "المعلم"}
                </p>
              </div>

              <div className="rounded-[1.5rem] bg-slate-50 p-5 ring-1 ring-slate-100">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sky-700 ring-1 ring-slate-100">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <p className="mt-4 text-xs font-black text-slate-400">نسبة الاكتمال</p>
                <p className="mt-2 text-lg font-black text-slate-950">{progress}%</p>
              </div>

              <div className="rounded-[1.5rem] bg-slate-50 p-5 ring-1 ring-slate-100">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sky-700 ring-1 ring-slate-100">
                  <FolderKanban className="h-5 w-5" />
                </div>
                <p className="mt-4 text-xs font-black text-slate-400">الأقسام</p>
                <p className="mt-2 text-lg font-black text-slate-950">
                  {sections.length}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black text-sky-700">أقسام الملف</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  محتويات ملف الإنجاز
                </h2>
              </div>

              <Link
                href={backHref}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                {backLabel}
              </Link>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {sections.map((section) => {
                const Icon = iconByName[section.icon];

                return (
                  <Link key={section.title} href={section.href}>
                    <article className="h-full rounded-[1.5rem] border border-slate-100 bg-slate-50 p-5 shadow-sm transition hover:border-sky-200 hover:bg-white hover:shadow-md">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-700 ring-1 ring-slate-100">
                          <Icon className="h-6 w-6" />
                        </div>

                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
                          {section.value}
                        </span>
                      </div>

                      <h3 className="mt-4 text-lg font-black text-slate-950">
                        {section.title}
                      </h3>

                      <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
                        {section.description}
                      </p>
                    </article>
                  </Link>
                );
              })}
            </div>
          </section>
        </section>

        <aside className="space-y-5">
          <section className="rounded-[2rem] bg-gradient-to-br from-sky-700 to-cyan-500 p-6 text-white shadow-lg">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <FolderKanban className="h-6 w-6" />
            </div>

            <h2 className="mt-5 text-2xl font-black">حالة الملف</h2>

            <p className="mt-3 text-sm font-bold leading-7 text-sky-50">
              هذه نسخة تأسيسية تجمع الروابط والأقسام الأساسية. لاحقًا سيتم ربطها بالتكليفات والشواهد والتقارير الحقيقية.
            </p>

            <div className="mt-5 rounded-2xl bg-white/15 p-4">
              <div className="flex items-center justify-between text-xs font-black">
                <span>اكتمال الملف</span>
                <span>{progress}%</span>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black text-sky-700">خطوات مقترحة</p>

            <div className="mt-4 space-y-3">
              <MiniStep title="أكمل الشواهد" helper="ارفع الشواهد المرتبطة بالمشاركات والتكليفات." />
              <MiniStep title="راجع التقارير" helper="تابع التقارير المرتبطة بأعمالك داخل المنصة." />
              <MiniStep title="حدّث الشهادات" helper="اجمع الشهادات والتكريمات في مكان واحد." />
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}

function MiniStep({ title, helper }: { title: string; helper: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="text-sm font-black text-slate-800">{title}</p>
      <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
        {helper}
      </p>
    </div>
  );
}