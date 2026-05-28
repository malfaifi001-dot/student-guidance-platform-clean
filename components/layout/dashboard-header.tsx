export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 px-6 py-4 backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">مرحبًا بك</p>
          <h2 className="text-xl font-bold text-slate-900">لوحة الموجه الطلابي</h2>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
          بيئة تطوير · SaaS-ready
        </div>
      </div>
    </header>
  );
}