type Props = {
  insights?: string[];
  recommendations?: string[];
};

export function ResultsAnalysisInsights({
  insights = [],
  recommendations = [],
}: Props) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-black text-slate-900">
        الملخص والتوصيات
      </h2>

      <div className="mt-5 space-y-4">
        {insights.length === 0 && recommendations.length === 0 ? (
          <p className="text-sm text-slate-400">
            لا توجد توصيات أو ملخصات حالية.
          </p>
        ) : null}

        {insights.map((item, index) => (
          <p
            key={`insight-${index}`}
            className="rounded-2xl bg-blue-50 p-4 text-sm leading-7 text-blue-900"
          >
            {item}
          </p>
        ))}

        {recommendations.map((item, index) => (
          <p
            key={`recommendation-${index}`}
            className="rounded-2xl bg-emerald-50 p-4 text-sm leading-7 text-emerald-800"
          >
            {item}
          </p>
        ))}
      </div>
    </section>
  );
}