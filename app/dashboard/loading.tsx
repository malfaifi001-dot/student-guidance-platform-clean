export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950" dir="rtl">
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-600 to-emerald-500 shadow-lg shadow-sky-100">
            <span className="text-2xl font-black text-white">ت</span>
          </div>

          <p className="mt-5 text-sm font-black text-sky-700">
            منصة التوجيه الطلابي
          </p>

          <div className="mt-5 flex items-center justify-center gap-2">
            <span className="h-3 w-3 animate-bounce rounded-full bg-sky-600 [animation-delay:-0.25s]" />
            <span className="h-3 w-3 animate-bounce rounded-full bg-emerald-500 [animation-delay:-0.12s]" />
            <span className="h-3 w-3 animate-bounce rounded-full bg-slate-400" />
          </div>
        </div>
      </div>
    </main>
  );
}
