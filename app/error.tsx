"use client";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main dir="rtl" className="grid min-h-screen place-items-center bg-slate-50 px-5 py-10 text-slate-950 dark:bg-[#07111F] dark:text-slate-100">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-xl dark:border-white/10 dark:bg-[#0D1B2E]">
        <h1 className="text-2xl font-black">حدث خطأ غير متوقع</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">تعذر إكمال هذه الصفحة. حاول مرة أخرى.</p>
        <button type="button" onClick={reset} className="mt-6 min-h-11 rounded-2xl bg-[#1769FF] px-6 py-3 text-sm font-black text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
          المحاولة مرة أخرى
        </button>
      </section>
    </main>
  );
}
