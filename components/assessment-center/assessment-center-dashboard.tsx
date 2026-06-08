import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpLeft,
  BarChart3,
  BrainCircuit,
  FileSpreadsheet,
  FileText,
  Layers3,
  Lightbulb,
  Link2,
  ShieldCheck,
  UploadCloud,
  UsersRound,
} from "lucide-react";

const kpis = [
  {
    label: "التحليلات",
    value: "0",
    note: "بانتظار أول تحليل",
    icon: BarChart3,
  },
  {
    label: "طلاب يحتاجون متابعة",
    value: "0",
    note: "تظهر بعد تحليل النتائج",
    icon: AlertTriangle,
  },
  {
    label: "التوصيات العلاجية",
    value: "0",
    note: "تولد لاحقًا من التحليل",
    icon: Lightbulb,
  },
  {
    label: "التقارير والتصدير",
    value: "0",
    note: "PDF و Excel لاحقًا",
    icon: FileText,
  },
];

const modules = [
  {
    title: "تحليل جديد",
    desc: "مكان رفع ملفات النتائج لاحقًا بعد اعتماد شكل Excel النهائي.",
    href: "/dashboard/assessment-center/new",
    icon: UploadCloud,
    enabled: true,
  },
  {
    title: "تحليل المدرسة",
    desc: "متوسط المدرسة، نسبة الإتقان، التعثر، وأهم مؤشرات الأداء.",
    href: "/dashboard/assessment-center",
    icon: BarChart3,
    enabled: false,
  },
  {
    title: "تحليل الصفوف والفصول",
    desc: "مقارنة الصفوف والفصول ومعرفة أكثر فصل يحتاج تدخل.",
    href: "/dashboard/assessment-center",
    icon: Layers3,
    enabled: false,
  },
  {
    title: "الطلاب المعرضون للخطر",
    desc: "اكتشاف الطلاب المحتاجين متابعة بناءً على النتائج والمؤشرات.",
    href: "/dashboard/assessment-center",
    icon: UsersRound,
    enabled: false,
  },
  {
    title: "التوصيات العلاجية",
    desc: "اقتراح خطط علاج وتدخلات إرشادية قابلة للربط بالحالات.",
    href: "/dashboard/assessment-center",
    icon: Lightbulb,
    enabled: false,
  },
  {
    title: "التصدير والتقارير",
    desc: "تصدير Excel و PDF بقوالب عملية وجميلة لاحقًا.",
    href: "/dashboard/assessment-center",
    icon: FileSpreadsheet,
    enabled: false,
  },
  {
    title: "الربط مع الحالات",
    desc: "إنشاء حالة متابعة تلقائيًا للطلاب المتعثرين لاحقًا.",
    href: "/dashboard/assessment-center",
    icon: Link2,
    enabled: false,
  },
];

const roadmap = [
  "تثبيت مركز التحليل والاختبارات كمسار مستقل داخل المنصة.",
  "اعتماد شكل ملف Excel قبل بناء Parser نهائي.",
  "دعم رفع شامل أو رفع على دفعات حسب الصف أو الفصل أو المادة.",
  "ربط النتائج مع الطلاب في مركز البيانات.",
  "إضافة الطلاب المعرضين للخطر والتوصيات العلاجية.",
  "إضافة تصدير Excel و PDF بقوالب احترافية.",
  "إضافة إنشاء حالة متابعة وربطها بمحرك الحالات.",
];

export function AssessmentCenterDashboard() {
  return (
    <main className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-cyan-100 bg-gradient-to-br from-cyan-600 via-sky-600 to-blue-700 p-8 text-white shadow-2xl">
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 right-10 h-72 w-72 rounded-full bg-teal-300/20 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/15 px-4 py-2 text-sm font-black text-cyan-50 backdrop-blur">
              <BrainCircuit className="h-4 w-4" />
              Assessment Center
            </div>

            <h1 className="mt-5 text-4xl font-black leading-tight md:text-5xl">
              مركز التحليل والاختبارات
            </h1>

            <p className="mt-4 max-w-3xl text-base font-bold leading-8 text-cyan-50/90">
              مركز مستقل لتحليل نتائج الطلاب والاختبارات وربطها لاحقًا بالطلاب،
              الحالات، التقارير، مؤشرات الأداء، والتوصيات العلاجية.
            </p>
          </div>

          <Link
            href="/dashboard/assessment-center/new"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-black text-cyan-700 transition hover:bg-cyan-50"
          >
            تحليل جديد
            <ArrowUpLeft className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => {
          const Icon = item.icon;

          return (
            <article
              key={item.label}
              className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-3 text-4xl font-black text-slate-950">
                    {item.value}
                  </p>
                </div>

                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-50 text-cyan-600">
                  <Icon className="h-6 w-6" />
                </div>
              </div>

              <p className="mt-4 text-sm font-bold leading-7 text-slate-500">
                {item.note}
              </p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black text-cyan-600">وحدات المركز</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                هيكل النظام الجديد
              </h2>
            </div>

            <ShieldCheck className="h-8 w-8 text-cyan-600" />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {modules.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className={[
                    "group rounded-[1.5rem] border p-5 transition",
                    item.enabled
                      ? "border-cyan-100 bg-cyan-50/50 hover:-translate-y-1 hover:bg-cyan-50 hover:shadow-lg"
                      : "border-slate-100 bg-slate-50 hover:bg-slate-100",
                  ].join(" ")}
                >
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-cyan-600 shadow-sm">
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <h3 className="text-lg font-black text-slate-950">
                      {item.title}
                    </h3>

                    {!item.enabled ? (
                      <span className="rounded-full bg-slate-200 px-3 py-1 text-[11px] font-black text-slate-500">
                        قريبًا
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
                    {item.desc}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>

        <aside className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-black text-cyan-600">تسلسل التنفيذ</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            نبني المركز بدون ترقيع
          </h2>

          <p className="mt-4 text-sm font-bold leading-7 text-slate-500">
            سنبني المركز كمنظومة مستقلة، ونؤجل قراءة Excel حتى يتضح شكل الملف.
            بعدها نضيف Parser حقيقي يدعم الرفع الشامل أو الرفع على دفعات.
          </p>

          <div className="mt-6 space-y-3">
            {roadmap.map((item, index) => (
              <div
                key={item}
                className="flex gap-3 rounded-2xl bg-slate-50 p-4"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-cyan-600 text-sm font-black text-white">
                  {index + 1}
                </span>
                <p className="text-sm font-bold leading-7 text-slate-600">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}