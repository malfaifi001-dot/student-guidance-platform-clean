import Link from "next/link";

export default function OfflinePage() {
  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10 text-slate-900 dark:bg-[#07111F] dark:text-slate-100"
    >
      <section className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm dark:border-white/10 dark:bg-[#0D1B2E]">
        <h1 className="text-xl font-bold">لا يوجد اتصال بالإنترنت</h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          تحقق من اتصالك ثم حاول مرة أخرى.
        </p>
        <Link
          href="/offline"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#3478B8] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#2d699f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3478B8] focus-visible:ring-offset-2 dark:ring-offset-[#0D1B2E]"
        >
          إعادة المحاولة
        </Link>
      </section>
    </main>
  );
}
