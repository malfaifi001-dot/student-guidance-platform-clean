type ProgressItem = {
  label: string;
  value: number;
};

type Props = {
  title?: string;
  items?: ProgressItem[];
};

export function ResultsAnalysisCharts({
  title = "الرسوم التحليلية",
  items = [],
}: Props) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-black text-slate-900">{title}</h2>

      <div className="mt-5 space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-slate-400">لا توجد بيانات للعرض.</p>
        ) : (
          items.map((item) => (
            <div key={item.label} className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">{item.label}</span>
                <span className="font-black text-blue-600">{item.value}%</span>
              </div>

              <div className="mt-3 h-2 rounded-full bg-slate-200">
                <div
                  className="h-2 rounded-full bg-blue-600"
                  style={{ width: `${Math.max(0, Math.min(item.value, 100))}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}