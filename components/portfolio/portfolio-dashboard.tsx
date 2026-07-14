import Link from "next/link";
import {
  Award,
  BookOpenCheck,
  CheckCircle2,
  FileText,
  Palette,
  Printer,
  UserRound,
} from "lucide-react";
import { getPortfolioTheme } from "@/lib/portfolio/portfolio-theme-registry";

type PortfolioDashboardProps = {
  data: {
    portfolio: {
      id: string;
      title: string;
      academicYear: string;
      term: string;
      themeId: string;
      status: string;
      introText: string;
      conclusionText: string;
      bioText: string;
    };
    owner: {
      name: string;
      jobTitle: string;
    };
    school: {
      name: string;
      logoUrl: string | null;
      principalName: string | null;
      academicYear: string | null;
      currentSemester: string | null;
    };
    performanceSections: Array<{
      key: string;
      title: string;
      weight: number;
      serviceSlug: string;
      intro: string;
      reports: Array<{
        id: string;
        title: string;
        status: string;
        generatedAt: string | null;
        createdAt: string;
        evidenceCount: number;
        caseTitle: string | null;
        serviceName: string;
      }>;
    }>;
    totals: {
      reports: number;
      evidences: number;
      sections: number;
    };
  };
};

function formatDate(value: string | null) {
  if (!value) return "غير محدد";

  try {
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
    }).format(new Date(value));
  } catch {
    return "غير محدد";
  }
}

function getStatusLabel(status: string) {
  if (status === "APPROVED") return "معتمد";
  if (status === "GENERATED") return "مولد";
  if (status === "DRAFT") return "مسودة";
  if (status === "ARCHIVED") return "مؤرشف";
  return status || "غير محدد";
}

export function PortfolioDashboard({ data }: PortfolioDashboardProps) {
  const theme = getPortfolioTheme(data.portfolio.themeId);

  return (
    <main dir="rtl" className="space-y-5">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="relative p-6 md:p-8">
          <div
            className="absolute -left-16 -top-20 h-56 w-56 rounded-full opacity-10 blur-2xl"
            style={{ backgroundColor: theme.palette.primary }}
          />

          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm font-black text-teal-700">مساحة المعلم</p>

              <h1 className="mt-2 text-3xl font-black text-slate-950">
                ملف الإنجاز
              </h1>

              <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-500">
                تقاريرك مرتبة تلقائيًا حسب عناصر الأداء.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/dashboard/teacher/portfolio/preview?portfolioId=${data.portfolio.id}`}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
              >
                <Printer className="h-4 w-4" />
                معاينة الملف
              </Link>

              <button
                type="button"
                className="inline-flex cursor-not-allowed items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-black text-slate-400"
                title="تجهيز التصاميم في الدفعة التالية"
              >
                <Palette className="h-4 w-4" />
                التصميم
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <UserRound className="h-6 w-6 text-teal-700" />
          <p className="mt-3 text-xs font-black text-slate-400">صاحب الملف</p>
          <strong className="mt-1 block text-lg font-black text-slate-900">
            {data.owner.name}
          </strong>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <BookOpenCheck className="h-6 w-6 text-teal-700" />
          <p className="mt-3 text-xs font-black text-slate-400">الفصل</p>
          <strong className="mt-1 block text-lg font-black text-slate-900">
            {data.portfolio.term}
          </strong>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <FileText className="h-6 w-6 text-teal-700" />
          <p className="mt-3 text-xs font-black text-slate-400">التقارير</p>
          <strong className="mt-1 block text-3xl font-black text-slate-900">
            {data.totals.reports}
          </strong>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <Award className="h-6 w-6 text-teal-700" />
          <p className="mt-3 text-xs font-black text-slate-400">الشواهد</p>
          <strong className="mt-1 block text-3xl font-black text-slate-900">
            {data.totals.evidences}
          </strong>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">الصفحات التعريفية</h2>

          <div className="mt-5 space-y-3">
            {["المقدمة", "السيرة المهنية", "المؤهلات والدورات", "الخاتمة"].map(
              (title) => (
                <div
                  key={title}
                  className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100"
                >
                  <span className="text-sm font-black text-slate-700">
                    {title}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-teal-700 ring-1 ring-teal-100">
                    جاهز
                  </span>
                </div>
              ),
            )}
          </div>
        </article>

        <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">عناصر الأداء</h2>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {data.performanceSections.map((section) => (
              <div
                key={section.key}
                className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-teal-200 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black leading-6 text-slate-900">
                      {section.title}
                    </h3>
                    <p className="mt-1 text-xs font-bold text-slate-400">
                      الوزن {section.weight}%
                    </p>
                  </div>

                  <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-black text-teal-700">
                    {section.reports.length}
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {section.reports.slice(0, 2).map((report) => (
                    <Link
                      key={report.id}
                      href={`/dashboard/report/${report.id}/preview`}
                      className="block rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-teal-50 hover:text-teal-800"
                    >
                      <span className="block truncate">{report.title}</span>
                      <span className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                        <CheckCircle2 className="h-3 w-3" />
                        {getStatusLabel(report.status)} ·{" "}
                        {formatDate(report.generatedAt || report.createdAt)}
                      </span>
                    </Link>
                  ))}

                  {section.reports.length === 0 ? (
                    <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-400">
                      لا توجد تقارير بعد.
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}