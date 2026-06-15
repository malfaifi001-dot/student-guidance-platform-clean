import Link from "next/link";

type FeaturePlanningPlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
};

export function FeaturePlanningPlaceholderPage({
  eyebrow,
  title,
  description,
  backHref,
  backLabel,
}: FeaturePlanningPlaceholderPageProps) {
  return (
    <main className="space-y-6" dir="rtl">
      <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100">
            {eyebrow}
          </span>

          <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
            قيد التصميم
          </span>
        </div>

        <h1 className="mt-4 text-3xl font-black text-slate-950">{title}</h1>

        <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-slate-500">
          {description}
        </p>

        <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-bold leading-7 text-slate-500">
          لم يتم اعتماد محتوى هذه الصفحة بعد. سيتم بناؤها لاحقًا بعد تحديد المتطلبات التفصيلية.
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