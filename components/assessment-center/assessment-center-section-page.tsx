import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Clock,
  FileSpreadsheet,
  FileText,
  Layers3,
  Lightbulb,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import type { ComponentType } from "react";

type SectionItem = {
  title: string;
  description: string;
};

type Props = {
  badge: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  status?: string;
  items: SectionItem[];
};

export function AssessmentCenterSectionPage({
  badge,
  title,
  description,
  icon: Icon,
  status = "جاهز كهيكل أولي",
  items,
}: Props) {
  return (
    <main className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-cyan-100 bg-gradient-to-br from-cyan-600 via-sky-600 to-blue-700 p-8 text-white shadow-2xl">
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 right-10 h-72 w-72 rounded-full bg-teal-300/20 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/15 px-4 py-2 text-sm font-black text-cyan-50 backdrop-blur">
              <BrainCircuit className="h-4 w-4" />
              {badge}
            </div>

            <h1 className="mt-5 text-4xl font-black leading-tight md:text-5xl">
              {title}
            </h1>

            <p className="mt-4 max-w-3xl text-base font-bold leading-8 text-cyan-50/90">
              {description}
            </p>
          </div>

          <Link
            href="/dashboard/assessment-center"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-black text-cyan-700 transition hover:bg-cyan-50"
          >
            <ArrowRight className="h-4 w-4" />
            العودة للمركز
          </Link>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <aside className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-cyan-50 text-cyan-600">
            <Icon className="h-7 w-7" />
          </div>

          <h2 className="mt-5 text-2xl font-black text-slate-950">
            حالة القسم
          </h2>

          <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <div className="flex gap-3">
              <Clock className="mt-1 h-5 w-5 shrink-0 text-amber-600" />
              <p className="text-sm font-bold leading-7 text-amber-900">
                {status}
              </p>
            </div>
          </div>

          <p className="mt-5 text-sm font-bold leading-8 text-slate-500">
            هذا القسم تم تجهيزه ضمن هيكل Assessment Center. سيتم ربطه بالبيانات
            الحقيقية بعد اعتماد شكل ملف Excel وبناء محرك التحليل.
          </p>
        </aside>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black text-cyan-600">النطاق المتوقع</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                ماذا سيعرض هذا القسم؟
              </h2>
            </div>

            <ShieldCheck className="h-8 w-8 text-cyan-600" />
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {items.map((item) => (
              <article
                key={item.title}
                className="rounded-[1.4rem] border border-slate-100 bg-slate-50 p-5"
              >
                <h3 className="text-base font-black text-slate-950">
                  {item.title}
                </h3>

                <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

export const assessmentSectionIcons = {
  analyses: BarChart3,
  subjects: FileSpreadsheet,
  classes: Layers3,
  riskStudents: UsersRound,
  recommendations: Lightbulb,
  reports: FileText,
};