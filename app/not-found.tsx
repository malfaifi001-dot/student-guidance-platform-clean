import Link from "next/link";

export default function NotFound() {
  return (
    <main dir="rtl" className="grid min-h-screen place-items-center bg-slate-50 px-5 py-10 text-slate-950 dark:bg-[#07111F] dark:text-slate-100">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-xl dark:border-white/10 dark:bg-[#0D1B2E]">
        <p className="text-sm font-black text-blue-600">404</p>
        <h1 className="mt-2 text-2xl font-black">الصفحة غير موجودة</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">تحقق من الرابط أو عد إلى الصفحة الرئيسية.</p>
        <Link href="/" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#1769FF] px-6 py-3 text-sm font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
          العودة للرئيسية
        </Link>
      </section>
    </main>
  );
}
