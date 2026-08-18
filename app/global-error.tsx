"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-[#07111F] font-sans text-slate-100">
        <main className="grid min-h-screen place-items-center px-5 py-10">
          <section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0D1B2E] p-7 text-center shadow-2xl">
            <h1 className="text-2xl font-black">تعذر فتح Teachix</h1>
            <p className="mt-3 text-sm leading-7 text-slate-300">أعد المحاولة للعودة إلى المنصة.</p>
            <button type="button" onClick={reset} className="mt-6 min-h-11 rounded-2xl bg-[#1769FF] px-6 py-3 text-sm font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
              إعادة المحاولة
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
