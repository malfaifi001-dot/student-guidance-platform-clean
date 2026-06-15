import Link from "next/link";

type WorkspacePlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
};

export function WorkspacePlaceholderPage({
  eyebrow,
  title,
  description,
  backHref,
  backLabel,
}: WorkspacePlaceholderPageProps) {
  return (
    <main className="space-y-6" dir="rtl">
      <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100">
          {eyebrow}
        </span>

        <h1 className="mt-4 text-3xl font-black text-slate-950">{title}</h1>

        <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-slate-500">
          {description}
        </p>

        <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-bold leading-7 text-slate-500">
          هذه صفحة تأسيسية مؤقتة. لاحقًا سيتم ربطها بالبيانات والصلاحيات الفعلية بدون تكرار أكواد الخدمات.
        </div>

        <Link
          href={backHref}
          className="mt-6 inline-flex rounded-2xl bg-sky-700 px-5 py-3 text-sm font-black text-white transition hover:bg-sky-800"
        >
          {backLabel}
        </Link>
      </section>
    </main>
  );
}