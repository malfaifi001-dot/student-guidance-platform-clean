import { Wrench } from "lucide-react";

export function MaintenancePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#e0f2fe,_#f8fafc_55%,_#eef2ff)] px-5 py-10 text-slate-900" dir="rtl">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center justify-center">
        <section className="w-full rounded-[2rem] border border-white/80 bg-white/90 p-7 text-center shadow-xl shadow-sky-100/70 backdrop-blur sm:p-12">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-sky-100 text-sky-700"><Wrench className="h-8 w-8" aria-hidden="true" /></div>
          <p className="mt-6 text-sm font-black tracking-wide text-sky-700">Teachix</p>
          <h1 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">نعود إليكم قريبًا</h1>
          <p className="mx-auto mt-5 max-w-xl text-base font-bold leading-8 text-slate-600">نعمل حاليًا على تحديثات وتحسينات مهمة لتقديم تجربة أفضل لكم.</p>
          <div className="mx-auto mt-7 max-w-md rounded-2xl border border-sky-100 bg-sky-50 px-5 py-4"><p className="text-sm font-black text-sky-800">موعد العودة</p><p className="mt-1 text-lg font-black text-slate-900">اليوم، الساعة 12:00 ظهرًا</p></div>
          <p className="mt-7 text-sm font-bold leading-7 text-slate-500">سيكون الموقع غير متاح مؤقتًا أثناء أعمال التحديث.<br />شكرًا لتفهمكم وصبركم</p>
          <p className="mt-6 text-sm font-black text-slate-700">فريق Teachix</p>
        </section>
      </div>
    </main>
  );
}
