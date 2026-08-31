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
    <main className="space-y-4" dir="rtl">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900">
            {eyebrow}
          </span>

          <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
            قيد التصميم
          </span>
        </div>

        <h1 className="mt-3 text-2xl font-black text-slate-950 dark:text-white">{title}</h1>

        <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
          {description}
        </p>

        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-bold leading-6 text-slate-500 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-400">
          لم يتم اعتماد محتوى هذه الصفحة بعد. سيتم بناؤها لاحقًا بعد تحديد المتطلبات التفصيلية.
        </div>

        <Link
          href={backHref}
          className="mt-4 inline-flex min-h-10 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-sky-800"
        >
          {backLabel}
        </Link>
      </section>
    </main>
  );
}
