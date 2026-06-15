import Link from "next/link";

type TeacherPlaceholderPageProps = {
  title: string;
  description: string;
};

export function TeacherPlaceholderPage({
  title,
  description,
}: TeacherPlaceholderPageProps) {
  return (
    <main className="space-y-6" dir="rtl">
      <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100">
          مساحة المعلم
        </span>

        <h1 className="mt-4 text-3xl font-black text-slate-950">{title}</h1>

        <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-slate-500">
          {description}
        </p>

        <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-bold leading-7 text-slate-500">
          هذه صفحة تنظيمية مؤقتة. لاحقًا سيتم ربطها بالمنطق الحقيقي دون تكرار أكواد الخدمات.
        </div>

        <Link
          href="/dashboard/teacher"
          className="mt-6 inline-flex rounded-2xl bg-sky-700 px-5 py-3 text-sm font-black text-white transition hover:bg-sky-800"
        >
          العودة إلى لوحة المعلم
        </Link>
      </section>
    </main>
  );
}