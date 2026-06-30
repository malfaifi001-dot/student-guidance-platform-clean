import Link from "next/link";
import {
  ArrowLeft,
  BrainCircuit,
  CheckCircle2,
  FileText,
  GitCompareArrows,
  Sparkles,
} from "lucide-react";

export function AiReport2ServiceHome({
  userName,
}: {
  userName: string;
}) {
  return (
    <main className="space-y-7" dir="rtl">
      <section className="overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 p-8 text-white shadow-xl">
        <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <p className="text-sm font-black text-sky-100">
              AI REPORT 2 · تجربة تقييم أداء المعلم
            </p>

            <h1 className="mt-3 text-4xl font-black">
              التقرير الذكي التجريبي
            </h1>

            <p className="mt-4 max-w-3xl text-sm font-bold leading-8 text-sky-50">
              أهلًا {userName || "بك"}، هذه نسخة تجريبية تجعل DeepSeek يفهم وصف
              التقرير أولًا، ثم يبحث داخل بنك قيم تقييم أداء المعلم، ويقترح نموذجًا
              مختصرًا لا يتجاوز 10 حقول في صلب الموضوع.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/teacher/ai-report2/new"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-black text-sky-900 transition hover:bg-sky-50"
            >
              <Sparkles className="h-4 w-4" />
              تجربة إنشاء تقرير
            </Link>

            <Link
              href="/dashboard/ai-report"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-black text-white transition hover:bg-white/20"
            >
              <GitCompareArrows className="h-4 w-4" />
              مقارنة مع النسخة الأولى
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <FeatureCard
          icon={<BrainCircuit className="h-6 w-6" />}
          title="DeepSeek يقود الفهم"
          description="النظام لا يفرض التصنيف من البداية؛ بل يمرر بنكًا معرفيًا منظمًا ويترك للنموذج اختيار الأقرب."
        />

        <FeatureCard
          icon={<CheckCircle2 className="h-6 w-6" />}
          title="حقول مقننة"
          description="أي تقرير لا يزيد عن 10 حقول، وكل الحقول غير إلزامية حتى لا يضغط على المعلم."
        />

        <FeatureCard
          icon={<FileText className="h-6 w-6" />}
          title="اختيار متعدد للنصوص"
          description="أي حقل فيه عدة قيم أو نصوص من البنك يتحول تلقائيًا إلى اختيار متعدد."
        />
      </section>

      <section className="rounded-[2.5rem] border border-slate-200 bg-white p-7 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black text-sky-700">طريقة العمل</p>

            <h2 className="mt-1 text-2xl font-black text-slate-950">
              اكتب فكرة التقرير فقط
            </h2>

            <p className="mt-3 max-w-3xl text-sm font-bold leading-8 text-slate-500">
              مثال: تقرير عن تنوع استراتيجيات التدريس في درس تطبيقي، أو تقرير عن
              تحليل نتائج المتعلمين في نهاية وحدة. سيقارن DeepSeek الوصف ببنك
              التقارير والحقول، ثم يبني نموذجًا مختصرًا قابلًا للحفظ.
            </p>
          </div>

          <Link
            href="/dashboard/teacher/ai-report2/new"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:bg-slate-800"
          >
            ابدأ الآن
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 ring-1 ring-sky-100">
        {icon}
      </div>

      <h3 className="mt-5 text-xl font-black text-slate-950">{title}</h3>

      <p className="mt-3 text-sm font-bold leading-7 text-slate-500">
        {description}
      </p>
    </article>
  );
}