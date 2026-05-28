type RuntimeStatusBarProps = {
  overallPercent: number;
  completedRequired: number;
  totalRequired: number;
};

export function RuntimeStatusBar({
  overallPercent,
  completedRequired,
  totalRequired,
}: RuntimeStatusBarProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-900">تقدم النموذج</p>
          <p className="mt-1 text-xs text-slate-500">
            {completedRequired} / {totalRequired} حقول مطلوبة مكتملة
          </p>
        </div>

        <p className="text-2xl font-black text-sky-700">{overallPercent}%</p>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-l from-sky-600 to-cyan-400"
          style={{ width: `${overallPercent}%` }}
        />
      </div>
    </div>
  );
}