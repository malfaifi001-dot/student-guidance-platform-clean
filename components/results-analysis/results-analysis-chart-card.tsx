type Props = {
  title: string;
  description?: string;
  children?: React.ReactNode;
};

export function ResultsAnalysisChartCard({
  title,
  description,
  children,
}: Props) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-black text-slate-900">{title}</h2>

      {description ? (
        <p className="mt-2 text-sm leading-7 text-slate-500">
          {description}
        </p>
      ) : null}

      <div className="mt-5">
        {children ?? (
          <p className="text-sm text-slate-400">
            لا توجد بيانات للعرض.
          </p>
        )}
      </div>
    </section>
  );
}